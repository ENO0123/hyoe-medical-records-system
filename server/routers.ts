import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { driveDeleteFile, driveUploadImage } from "./googleDrive";
import { ENV } from "./_core/env";
import bcrypt from "bcrypt";
import { sdk } from "./_core/sdk";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '管理者権限が必要です' });
  }
  return next({ ctx });
});

// Doctor procedure (admin or doctor)
const doctorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'doctor') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '医師権限が必要です' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      // 開発環境でも、セッションクッキーがない場合は必ずnullを返す（ログアウト状態を維持）
      // context.tsで既に処理されているので、そのまま返す
      return opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // クッキーを確実に削除（複数の方法で試行）
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      // 明示的にmaxAgeを0に設定して削除（すべてのパスとドメインで）
      ctx.res.cookie(COOKIE_NAME, "", { 
        ...cookieOptions, 
        maxAge: 0, 
        expires: new Date(0),
        path: "/",
      });
      // 追加で、secureとsameSiteの異なる組み合わせでも削除を試行
      ctx.res.cookie(COOKIE_NAME, "", { 
        path: "/", 
        maxAge: 0, 
        expires: new Date(0),
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });
      // ログアウトフラグを設定（開発環境での自動ログインを防ぐ）
      ctx.res.cookie("logout_flag", "true", {
        path: "/",
        maxAge: 60 * 60 * 24, // 24時間有効
        httpOnly: false, // クライアント側でも読み取り可能
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
      });
      return { success: true } as const;
    }),
    login: publicProcedure
      .input(z.object({
        loginId: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        console.log(`[Login] ログイン試行: loginId=${input.loginId}`);
        
        // 医師をログインIDで検索
        const doctor = await db.getDoctorByLoginId(input.loginId);
        if (!doctor) {
          console.log(`[Login] 医師が見つかりません: loginId=${input.loginId}`);
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ログインIDまたはパスワードが正しくありません' });
        }

        console.log(`[Login] 医師を発見: id=${doctor.id}, name=${doctor.name}`);

        // パスワードハッシュが設定されていない場合
        if (!doctor.passwordHash) {
          console.log(`[Login] パスワードハッシュが設定されていません: doctorId=${doctor.doctorId}`);
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ログインIDまたはパスワードが正しくありません' });
        }

        // パスワードを検証
        const isValidPassword = await bcrypt.compare(input.password, doctor.passwordHash);
        if (!isValidPassword) {
          console.log(`[Login] パスワードが一致しません: loginId=${input.loginId}`);
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'ログインIDまたはパスワードが正しくありません' });
        }

        console.log(`[Login] パスワード検証成功: loginId=${input.loginId}`);

        // ユーザーを取得または作成
        let user = doctor.userId ? await db.getUserById(doctor.userId) : null;
        const openId = user ? user.openId : `doctor-${doctor.doctorId}`;
        
        // 既存ユーザーのroleを確認（adminの場合はそのまま使用）
        let userRole: 'admin' | 'doctor' = 'doctor';
        if (user && user.role === 'admin') {
          // 既存ユーザーがadminロールを持っている場合はそのまま使用
          userRole = 'admin';
          console.log(`[Login] 既存ユーザーのadminロールを維持: loginId=${input.loginId}`);
        } else {
          // 管理者アカウントかどうかを判定（loginIdが'amano'または'r.enomoto'の場合は管理者）
          const isAdmin = doctor.loginId === 'amano' || doctor.loginId === 'r.enomoto';
          userRole = isAdmin ? 'admin' : 'doctor';
        }

        if (!user) {
          // 新規ユーザーを作成
          await db.upsertUser({
            openId,
            name: doctor.name,
            email: doctor.email,
            role: userRole,
            loginMethod: 'doctor',
            lastSignedIn: new Date(),
          });
          user = await db.getUserByOpenId(openId);
          if (user) {
            // 医師テーブルにuserIdを設定
            await db.updateDoctor(doctor.id, { userId: user.id });
          }
        } else {
          // 既存ユーザーの情報を更新（roleがadminの場合は維持、そうでない場合は更新）
          await db.upsertUser({
            openId: user.openId,
            name: doctor.name,
            email: doctor.email,
            role: userRole,
            lastSignedIn: new Date(),
          });
          user = await db.getUserByOpenId(user.openId);
        }

        if (!user) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'ユーザーの作成に失敗しました' });
        }

        // セッショントークンを作成
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || doctor.name,
          expiresInMs: ONE_YEAR_MS,
        });

        console.log(`[Login] セッショントークン作成成功: openId=${user.openId}, role=${user.role}`);

        // クッキーにセッショントークンを設定
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        console.log(`[Login] セッションクッキーを設定: name=${COOKIE_NAME}, secure=${cookieOptions.secure}, sameSite=${cookieOptions.sameSite}`);
        
        // ログアウトフラグを削除（ログイン成功時）
        ctx.res.clearCookie("logout_flag", { path: "/" });
        ctx.res.cookie("logout_flag", "", {
          path: "/",
          maxAge: 0,
          expires: new Date(0),
          httpOnly: false,
          secure: cookieOptions.secure,
          sameSite: cookieOptions.sameSite,
        });

        console.log(`[Login] ログイン成功: userId=${user.id}, role=${user.role}, name=${user.name}`);

        return { success: true, user };
      }),
  }),

  // Dashboard
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const doctor = await db.getDoctorByUserId(ctx.user.id);
      const doctorId = ctx.user.role === 'admin' ? undefined : doctor?.id;
      return await db.getDashboardStats(doctorId);
    }),
  }),

  // Doctors
  doctors: router({
    list: adminProcedure.query(async () => {
      return await db.getAllDoctors();
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDoctorById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        doctorId: z.string().optional(),
        name: z.string(),
        email: z.string().email(),
        affiliation: z.string().optional(),
        specialties: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createDoctor(input);
        return { success: true };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        doctorId: z.string().nullish(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        affiliation: z.string().nullish(),
        specialties: z.string().nullish(),
        notes: z.string().nullish(),
        loginId: z.string().nullish(),
        password: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, password, doctorId, ...data } = input;
        
        // null値をundefinedに変換（disabledフィールドなどでnullが送られてくる場合があるため）
        const cleanedData: any = {};
        for (const [key, value] of Object.entries(data)) {
          cleanedData[key] = value === null ? undefined : value;
        }
        
        // パスワードが提供されている場合はハッシュ化
        if (password) {
          const passwordHash = await bcrypt.hash(password, 10);
          cleanedData.passwordHash = passwordHash;
        }
        
        // doctorIdは変更不可のため更新処理から除外
        
        await db.updateDoctor(id, cleanedData);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDoctor(input.id);
        return { success: true };
      }),
  }),

  // Patients
  patients: router({
    list: protectedProcedure
      .input(z.object({
        searchQuery: z.string().optional(),
        statusFilter: z.array(z.enum(["契約中", "終了", "新規"])).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const doctor = await db.getDoctorByUserId(ctx.user.id);
        const doctorId = ctx.user.role === 'admin' ? undefined : doctor?.id;
        return await db.getPatientsWithDoctorInfo(
          doctorId,
          input?.searchQuery,
          input?.statusFilter
        );
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const patientData = await db.getPatientWithDoctorById(input.id);
        
        if (!patientData) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        // Check access permission
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patientData.patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        return patientData;
      }),
    
    create: adminProcedure
      .input(z.object({
        patientId: z.string().optional(),
        name: z.string(),
        nameKana: z.string().optional(),
        gender: z.enum(["男", "女", "その他"]),
        birthDate: z.string(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        doctorId: z.number(),
        status: z.enum(["契約中", "終了", "新規"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 管理者のみが新規患者を登録可能
        await db.createPatient({
          ...input,
          birthDate: new Date(input.birthDate),
        });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        patientId: z.string().optional(),
        name: z.string().optional(),
        nameKana: z.string().optional(),
        gender: z.enum(["男", "女", "その他"]).optional(),
        birthDate: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        doctorId: z.number().optional(),
        status: z.enum(["契約中", "終了", "新規"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Check access permission
        const patient = await db.getPatientById(id);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        const updateData: any = { ...data };
        if (data.birthDate) {
          updateData.birthDate = new Date(data.birthDate);
        }
        await db.updatePatient(id, updateData);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Check access permission
        const patient = await db.getPatientById(input.id);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        await db.deletePatient(input.id);
        return { success: true };
      }),
  }),

  // Test Items
  testItems: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllTestItems();
    }),
    
    listByCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await db.getTestItemsByCategory(input.category);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTestItemById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        itemCode: z.string(),
        itemName: z.string(),
        category: z.enum(["身体", "脳・血管", "肺機能", "血圧", "血液", "脂質代謝", "糖代謝", "腎・尿路系", "肝胆膵", "内分泌", "口腔", "診察", "循環器", "呼吸器", "消化器", "生殖器", "乳がん", "腫瘍マーカー", "感染症・免疫", "糖尿", "貧血", "尿", "身長体重", "肝機能", "腎機能", "視力聴力", "画像検査", "その他"]),
        unit: z.string(),
        referenceMin: z.string().optional(),
        referenceMax: z.string().optional(),
        displayOrder: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createTestItem(input);
        return { success: true };
      }),
    
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        itemCode: z.string().optional(),
        itemName: z.string().optional(),
        category: z.enum(["糖尿", "貧血", "血液", "尿", "身長体重", "その他"]).optional(),
        unit: z.string().optional(),
        referenceMin: z.string().optional(),
        referenceMax: z.string().optional(),
        displayOrder: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTestItem(id, data);
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTestItem(input.id);
        return { success: true };
      }),
  }),

  // Visits
  visits: router({
    list: protectedProcedure
      .input(z.object({ patientId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const doctor = await db.getDoctorByUserId(ctx.user.id);
        const doctorId = ctx.user.role === 'admin' ? undefined : doctor?.id;
        return await db.getVisitsWithPatientInfo(doctorId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getVisitById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        visitId: z.string(),
        patientId: z.number(),
        visitDate: z.string(),
        visitType: z.enum(["定期健診", "突発的受診", "その他"]),
        diagnosis: z.string().optional(),
        chiefComplaint: z.string().optional(),
        findings: z.string().optional(),
        treatment: z.string().optional(),
        prescription: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check access permission
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        await db.createVisit({ 
          ...input, 
          visitDate: new Date(input.visitDate),
          createdBy: ctx.user.id 
        });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        visitDate: z.string().optional(),
        visitType: z.enum(["定期健診", "突発的受診", "その他"]).optional(),
        diagnosis: z.string().optional(),
        chiefComplaint: z.string().optional(),
        findings: z.string().optional(),
        treatment: z.string().optional(),
        prescription: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.visitDate) {
          updateData.visitDate = new Date(data.visitDate);
        }
        await db.updateVisit(id, updateData);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteVisit(input.id);
        return { success: true };
      }),
  }),

  // Test Results
  testResults: router({
    list: protectedProcedure
      .input(z.object({ 
        patientId: z.number().optional(),
        category: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getTestResultsWithDetails(input.patientId, input.category);
      }),
    
    abnormal: protectedProcedure.query(async ({ ctx }) => {
      const doctor = await db.getDoctorByUserId(ctx.user.id);
      const doctorId = ctx.user.role === 'admin' ? undefined : doctor?.id;
      return await db.getAbnormalTestResults(doctorId);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTestResultById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        resultId: z.string(),
        patientId: z.number(),
        visitId: z.number().optional(),
        testDate: z.string(),
        itemId: z.number(),
        resultValue: z.string(),
        resultComment: z.string().optional(),
        additionalComment: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check access permission
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        await db.createTestResult({ 
          ...input, 
          testDate: new Date(input.testDate),
          createdBy: ctx.user.id 
        });
        return { success: true };
      }),
    
    bulkCreate: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        visitId: z.number().optional(),
        testDate: z.string(),
        results: z.array(z.object({
          itemId: z.number(),
          resultValue: z.string(),
          resultComment: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check access permission
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        // Create all test results
        for (const result of input.results) {
          try {
            // resultValueを数値に変換（文字列の場合はそのまま、数値の場合は文字列に変換してから数値に）
            let resultValue: string;
            if (typeof result.resultValue === 'string') {
              // 文字列の場合は、数値に変換できるかチェック
              const numValue = parseFloat(result.resultValue);
              if (isNaN(numValue)) {
                throw new TRPCError({ 
                  code: 'BAD_REQUEST', 
                  message: `検査値が無効です: ${result.resultValue}` 
                });
              }
              resultValue = numValue.toFixed(2);
            } else {
              resultValue = String(result.resultValue);
            }
            
            // visitIdを処理（undefined、null、0、空文字列の場合はnull）
            let visitId: number | null = null;
            if (input.visitId !== undefined && input.visitId !== null) {
              const visitIdNum = typeof input.visitId === 'number' ? input.visitId : parseInt(String(input.visitId), 10);
              if (!isNaN(visitIdNum) && visitIdNum > 0) {
                visitId = visitIdNum;
              }
            }
            
            // resultCommentを処理（undefined、null、空文字列の場合はnull）
            const resultComment = result.resultComment && String(result.resultComment).trim() !== '' 
              ? String(result.resultComment).trim() 
              : null;
            
            // testDateを処理（文字列からDateオブジェクトに変換）
            let testDate: Date;
            if (typeof input.testDate === 'string') {
              testDate = new Date(input.testDate);
              if (isNaN(testDate.getTime())) {
                throw new TRPCError({ 
                  code: 'BAD_REQUEST', 
                  message: `検査日の形式が無効です: ${input.testDate}` 
                });
              }
            } else if (input.testDate instanceof Date) {
              testDate = input.testDate;
            } else {
              throw new TRPCError({ 
                code: 'BAD_REQUEST', 
                message: `検査日の形式が無効です` 
              });
            }
            
            await db.createTestResult({
              resultId: nanoid(),
              patientId: input.patientId,
              visitId: visitId,
              testDate: testDate,
              itemId: result.itemId,
              resultValue: resultValue,
              resultComment: resultComment,
              createdBy: ctx.user.id,
            });
          } catch (error: any) {
            console.error('[bulkCreate] Error creating test result:', error);
            console.error('[bulkCreate] Input data:', { patientId: input.patientId, itemId: result.itemId, resultValue: result.resultValue });
            throw error;
          }
        }
        
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        testDate: z.string().optional(),
        itemId: z.number().optional(),
        resultValue: z.string().optional(),
        resultComment: z.string().optional(),
        additionalComment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.testDate) {
          updateData.testDate = new Date(data.testDate);
        }
        await db.updateTestResult(id, updateData);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTestResult(input.id);
        return { success: true };
      }),
  }),

  // Medications
  medications: router({
    list: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input, ctx }) => {
        console.log(`[Medications Router] list called with patientId: ${input.patientId}`);
        
        // Check access permission
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          console.log(`[Medications Router] Patient not found: ${input.patientId}`);
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            console.log(`[Medications Router] Access denied for patientId: ${input.patientId}`);
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        const result = await db.getMedicationsByPatientId(input.patientId);
        console.log(`[Medications Router] Returning ${result.length} medications for patientId: ${input.patientId}`);
        return result;
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getMedicationById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        medicationId: z.string().optional(),
        patientId: z.number(),
        medicationName: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check access permission
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        await db.createMedication({ 
          ...input,
          medicationId: input.medicationId || nanoid(),
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          createdBy: ctx.user.id 
        });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        medicationName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.startDate) {
          updateData.startDate = new Date(data.startDate);
        }
        if (data.endDate !== undefined) {
          updateData.endDate = data.endDate ? new Date(data.endDate) : null;
        }
        await db.updateMedication(id, updateData);
        return { success: true };
      }),
    
      delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMedication(input.id);
        return { success: true };
      }),
  }),

  // Test Result Images
  testResultImages: router({
    list: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        itemId: z.number(),
        testDate: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Check access permission
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        const images = await db.getTestResultImagesByPatientAndItem(
          input.patientId,
          input.itemId,
          input.testDate
        );
        // gdrive: の場合は、認証付き配信エンドポイントに差し替える（フロント変更を最小化）
        return images.map((img) => {
          if (typeof img.imageUrl === "string" && img.imageUrl.startsWith("gdrive:")) {
            return { ...img, imageUrl: `/api/test-result-images/${img.id}/content` };
          }
          return img;
        });
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTestResultImageById(input.id);
      }),
    
    upload: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        testResultId: z.number().optional(),
        itemId: z.number(),
        testDate: z.string(),
        fileData: z.string(), // base64 encoded image
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check access permission
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        // Convert base64 to buffer
        // image/svg+xml 等（+ を含む）でも安全に data URL を除去する
        const base64Data = input.fileData.replace(/^data:[^,]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        let imageUrl: string;
        
        // 開発環境で認証情報が設定されていない場合は、base64データを直接使用
        try {
          // Upload to Google Drive
          const fileExtension = input.fileName.split('.').pop() || 'jpg';
          const fileName = `test-results_${input.patientId}_${input.itemId}_${Date.now()}.${fileExtension}`;
          const { fileId } = await driveUploadImage({
            buffer,
            mimeType: input.mimeType,
            fileName,
          });
          imageUrl = `gdrive:${fileId}`;
        } catch (error: any) {
          console.error("[testResultImages.upload] Upload failed:", error);
          // 開発環境でGoogle Drive認証情報が設定されていない場合は、base64データを直接使用
          if (ENV.isProduction === false && String(error?.message || "").includes("Google Drive credentials missing")) {
            console.warn('[testResultImages.upload] Google Drive credentials not set, using base64 data URL for development');
            // base64データをdata URLとして保存
            imageUrl = input.fileData; // 元のbase64データ（data:image/...形式）を使用
          } else {
            // その他のエラーは再スロー
            throw error;
          }
        }
        
        // Save to database
        await db.createTestResultImage({
          imageId: nanoid(),
          patientId: input.patientId,
          testResultId: input.testResultId,
          itemId: input.itemId,
          // DATEカラムは文字列で渡してTZ影響を回避（YYYY-MM-DD）
          testDate: input.testDate as any,
          imageUrl: imageUrl,
          fileName: input.fileName,
          fileSize: buffer.length,
          mimeType: input.mimeType,
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),
    
    create: protectedProcedure
      .input(z.object({
        imageId: z.string().optional(),
        patientId: z.number(),
        testResultId: z.number().optional(),
        itemId: z.number(),
        testDate: z.string(),
        imageUrl: z.string(),
        fileName: z.string().optional(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check access permission
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        await db.createTestResultImage({
          imageId: input.imageId || nanoid(),
          patientId: input.patientId,
          testResultId: input.testResultId,
          itemId: input.itemId,
          testDate: new Date(input.testDate),
          imageUrl: input.imageUrl,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Check access permission
        const image = await db.getTestResultImageById(input.id);
        if (!image) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '画像が見つかりません' });
        }
        
        const patient = await db.getPatientById(image.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '患者が見つかりません' });
        }
        
        if (ctx.user.role !== 'admin') {
          const doctor = await db.getDoctorByUserId(ctx.user.id);
          if (patient.doctorId !== doctor?.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'アクセス権限がありません' });
          }
        }
        
        // Google Driveのファイル削除（DB削除に失敗してもストレージ側を残すのは危険なので、先に試す）
        if (typeof image.imageUrl === "string" && image.imageUrl.startsWith("gdrive:")) {
          const fileId = image.imageUrl.slice("gdrive:".length);
          if (fileId) {
            try {
              await driveDeleteFile(fileId);
            } catch (e) {
              // Drive側削除に失敗しても、DB削除は継続（運用上はログで追えるようにする）
              console.warn("[testResultImages.delete] Failed to delete Google Drive file:", e);
            }
          }
        }

        await db.deleteTestResultImage(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
