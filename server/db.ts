import { eq, and, gte, lte, desc, asc, sql, or, notInArray, coalesce } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  doctors, InsertDoctor,
  patients, InsertPatient,
  testItems, InsertTestItem,
  visits, InsertVisit,
  testResults, InsertTestResult,
  medications, InsertMedication,
  testResultImages, InsertTestResultImage,
  type Doctor,
  type Patient,
  type TestItem,
  type Medication
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _connectionTested = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      
      // 接続テストを実行（初回のみ）
      if (!_connectionTested) {
        _connectionTested = true;
        // 簡単なクエリで接続をテスト
        await _db.execute(sql`SELECT 1`);
        console.log("[Database] Successfully connected to MySQL");
      }
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      if (error instanceof Error) {
        console.error("[Database] Error message:", error.message);
        console.error("[Database] Error stack:", error.stack);
      }
      _db = null;
      _connectionTested = false;
    }
  } else if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL is not set");
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== Dummy Data for Development ==========

function getDummyDoctors(): Doctor[] {
  return [
    {
      id: 1,
      doctorId: "D001",
      name: "山田太郎",
      email: "yamada@example.com",
      affiliation: "総合病院 内科",
      specialties: JSON.stringify(["内科", "循環器科"]),
      notes: null,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      doctorId: "D002",
      name: "佐藤花子",
      email: "sato@example.com",
      affiliation: "クリニック",
      specialties: JSON.stringify(["小児科", "アレルギー科"]),
      notes: null,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      doctorId: "D003",
      name: "鈴木一郎",
      email: "suzuki@example.com",
      affiliation: "大学病院",
      specialties: JSON.stringify(["消化器内科", "肝臓内科"]),
      notes: null,
      userId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

function getDummyPatients(): Array<{ patient: Patient; doctor: Doctor | null }> {
  const dummyDoctors = getDummyDoctors();
  return [
    {
      patient: {
        id: 1,
        patientId: "P001",
        name: "田中一郎",
        nameKana: "タナカイチロウ",
        gender: "男",
        birthDate: new Date("1975-05-15"),
        phone: "03-1234-5678",
        email: "tanaka@example.com",
        address: "東京都渋谷区1-1-1",
        doctorId: 1,
        status: "契約中",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      doctor: dummyDoctors[0],
    },
    {
      patient: {
        id: 2,
        patientId: "P002",
        name: "山本花子",
        nameKana: "ヤマモトハナコ",
        gender: "女",
        birthDate: new Date("1980-08-22"),
        phone: "03-2345-6789",
        email: "yamamoto@example.com",
        address: "東京都新宿区2-2-2",
        doctorId: 1,
        status: "契約中",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      doctor: dummyDoctors[0],
    },
    {
      patient: {
        id: 3,
        patientId: "P003",
        name: "佐藤次郎",
        nameKana: "サトウジロウ",
        gender: "男",
        birthDate: new Date("1965-12-10"),
        phone: "03-3456-7890",
        email: "sato2@example.com",
        address: "東京都港区3-3-3",
        doctorId: 2,
        status: "新規",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      doctor: dummyDoctors[1],
    },
    {
      patient: {
        id: 4,
        patientId: "P004",
        name: "鈴木三郎",
        nameKana: "スズキサブロウ",
        gender: "男",
        birthDate: new Date("1990-03-25"),
        phone: "03-4567-8901",
        email: "suzuki3@example.com",
        address: "東京都世田谷区4-4-4",
        doctorId: 3,
        status: "終了",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      doctor: dummyDoctors[2],
    },
    {
      patient: {
        id: 5,
        patientId: "P005",
        name: "高橋美咲",
        nameKana: "タカハシミサキ",
        gender: "女",
        birthDate: new Date("1985-07-18"),
        phone: "03-5678-9012",
        email: "takahashi@example.com",
        address: "東京都目黒区5-5-5",
        doctorId: 2,
        status: "契約中",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      doctor: dummyDoctors[1],
    },
  ];
}

import { dummyTestItemsData } from "./dummy-test-items";

function getDummyTestItems(): TestItem[] {
  const now = new Date();
  return dummyTestItemsData.map((item, index) => ({
    id: index + 1,
    ...item,
    createdAt: now,
    updatedAt: now,
  }));
}

function getDummyMedications(patientId: number): Medication[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  console.log(`[getDummyMedications] Called with patientId: ${patientId}`);
  
  // 患者IDに応じて異なる薬歴データを返す
  const medicationData: { [key: number]: Array<{
    medicationId: string;
    medicationName: string;
    startDate: Date;
    endDate: Date | null;
    notes: string | null;
  }> } = {
    1: [ // 田中一郎
      {
        medicationId: "M001",
        medicationName: "アムロジピン錠5mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 3, 15),
        endDate: null, // 継続中
        notes: "高血圧治療",
      },
      {
        medicationId: "M002",
        medicationName: "メトホルミン塩酸塩錠250mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 6, 1),
        endDate: new Date(today.getFullYear(), today.getMonth() - 2, 28),
        notes: "糖尿病治療",
      },
      {
        medicationId: "M003",
        medicationName: "アスピリン錠100mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 12, 1),
        endDate: null, // 継続中
        notes: "抗血小板薬",
      },
    ],
    2: [ // 山本花子
      {
        medicationId: "M004",
        medicationName: "レボチロキシンナトリウム錠50μg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 8, 10),
        endDate: null, // 継続中
        notes: "甲状腺機能低下症",
      },
      {
        medicationId: "M005",
        medicationName: "カルシウム錠500mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 4, 1),
        endDate: null, // 継続中
        notes: "骨粗鬆症予防",
      },
    ],
    3: [ // 佐藤次郎
      {
        medicationId: "M006",
        medicationName: "ロサルタンカリウム錠50mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 5, 20),
        endDate: null, // 継続中
        notes: "高血圧治療",
      },
      {
        medicationId: "M007",
        medicationName: "アトルバスタチンカルシウム錠10mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 10, 1),
        endDate: null, // 継続中
        notes: "脂質異常症",
      },
      {
        medicationId: "M008",
        medicationName: "オメプラゾール錠20mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 2, 5),
        endDate: new Date(today.getFullYear(), today.getMonth() - 1, 30),
        notes: "胃潰瘍治療",
      },
    ],
    4: [ // 鈴木三郎
      {
        medicationId: "M009",
        medicationName: "セレコキシブ錠200mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 1, 15),
        endDate: null, // 継続中
        notes: "関節炎",
      },
    ],
    5: [ // 高橋美咲
      {
        medicationId: "M010",
        medicationName: "エストラジオール錠1mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 6, 1),
        endDate: null, // 継続中
        notes: "更年期障害",
      },
      {
        medicationId: "M011",
        medicationName: "プロゲステロン錠100mg",
        startDate: new Date(today.getFullYear(), today.getMonth() - 6, 1),
        endDate: null, // 継続中
        notes: "ホルモン補充療法",
      },
    ],
  };

  // 患者IDが1〜5以外の場合は、患者ID 1のデータを返す（デフォルト）
  const medications = medicationData[patientId] || medicationData[1] || [];
  
  console.log(`[getDummyMedications] Found ${medications.length} medications for patientId ${patientId}`);
  
  const result = medications.map((med, index) => ({
    id: index + 1,
    medicationId: med.medicationId,
    patientId: patientId, // 実際の患者IDを使用
    medicationName: med.medicationName,
    startDate: med.startDate,
    endDate: med.endDate,
    notes: med.notes,
    createdBy: 1, // ダミーユーザーID
    createdAt: now,
    updatedAt: now,
  }));
  
  console.log(`[getDummyMedications] Returning ${result.length} medications`);
  return result;
}

// ========== ID Generation Functions ==========

/**
 * 次の患者IDを自動生成（P001, P002, ...）
 */
export async function generateNextPatientId(): Promise<string> {
  const db = await getDb();
  if (!db) {
    // データベースが利用できない場合は、ダミーIDを返す
    return "P001";
  }
  
  try {
    // 既存の患者IDを取得して、最大の番号を見つける
    const allPatients = await db.select({ patientId: patients.patientId }).from(patients);
    
    let maxNumber = 0;
    for (const patient of allPatients) {
      // P001形式のIDから数値を抽出
      const match = patient.patientId.match(/^P(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    // 次の番号を生成（3桁でゼロパディング）
    const nextNumber = maxNumber + 1;
    return `P${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("[Database] Failed to generate patient ID:", error);
    // エラー時はP001を返す
    return "P001";
  }
}

/**
 * 次の顧問医師IDを自動生成（D001, D002, ...）
 */
export async function generateNextDoctorId(): Promise<string> {
  const db = await getDb();
  if (!db) {
    // データベースが利用できない場合は、ダミーIDを返す
    return "D001";
  }
  
  try {
    // 既存の顧問医師IDを取得して、最大の番号を見つける
    const allDoctors = await db.select({ doctorId: doctors.doctorId }).from(doctors);
    
    let maxNumber = 0;
    for (const doctor of allDoctors) {
      // D001形式のIDから数値を抽出
      const match = doctor.doctorId.match(/^D(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    // 次の番号を生成（3桁でゼロパディング）
    const nextNumber = maxNumber + 1;
    return `D${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("[Database] Failed to generate doctor ID:", error);
    // エラー時はD001を返す
    return "D001";
  }
}

// ========== Doctor Queries ==========

export async function getAllDoctors() {
  const db = await getDb();
  if (!db) {
    if (ENV.isProduction === false) {
      return getDummyDoctors();
    }
    return [];
  }
  try {
    return await db.select().from(doctors).orderBy(desc(doctors.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get all doctors:", error);
    if (error instanceof Error) {
      console.error("[Database] Error message:", error.message);
      // マイグレーションが必要な可能性がある
      if (error.message.includes("Unknown column") || error.message.includes("loginId") || error.message.includes("passwordHash")) {
        console.error("[Database] ⚠️ マイグレーションが必要です。以下のSQLを実行してください：");
        console.error("[Database] ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','doctor') NOT NULL DEFAULT 'user';");
        console.error("[Database] ALTER TABLE `doctors` ADD COLUMN `loginId` varchar(64);");
        console.error("[Database] ALTER TABLE `doctors` ADD COLUMN `passwordHash` varchar(255);");
        // マイグレーションエラーの場合は、ダミーデータを返さずにエラーを再スロー
        throw new Error("データベースマイグレーションが必要です。上記のSQLを実行してください。");
      }
    }
    // マイグレーション以外のエラー時は開発環境ではダミーデータを返す
    if (ENV.isProduction === false) {
      console.warn("[Database] Using dummy data due to error");
      return getDummyDoctors();
    }
    throw error;
  }
}

export async function getDoctorById(id: number) {
  const db = await getDb();
  if (!db) {
    if (ENV.isProduction === false) {
      // 開発環境では、ダミーデータを返す
      const dummyDoctors = getDummyDoctors();
      return dummyDoctors.find(d => d.id === id) || undefined;
    }
    return undefined;
  }
  const result = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
  return result[0];
}

export async function getDoctorByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    if (ENV.isProduction === false) {
      // 開発環境では、最初の医師を返す
      const dummyDoctors = getDummyDoctors();
      return dummyDoctors[0] || undefined;
    }
    return undefined;
  }
  try {
    const result = await db.select().from(doctors).where(eq(doctors.userId, userId)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get doctor by userId:", error);
    if (error instanceof Error) {
      console.error("[Database] Error message:", error.message);
      // マイグレーションが必要な可能性がある
      if (error.message.includes("Unknown column") || error.message.includes("loginId") || error.message.includes("passwordHash")) {
        console.error("[Database] ⚠️ マイグレーションが必要です。以下のSQLを実行してください：");
        console.error("[Database] ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','doctor') NOT NULL DEFAULT 'user';");
        console.error("[Database] ALTER TABLE `doctors` ADD COLUMN `loginId` varchar(64);");
        console.error("[Database] ALTER TABLE `doctors` ADD COLUMN `passwordHash` varchar(255);");
        // マイグレーションエラーの場合は、ダミーデータを返さずにエラーを再スロー
        throw new Error("データベースマイグレーションが必要です。上記のSQLを実行してください。");
      }
    }
    // マイグレーション以外のエラー時は開発環境ではダミーデータを返す
    if (ENV.isProduction === false) {
      console.warn("[Database] Using dummy data due to error");
      const dummyDoctors = getDummyDoctors();
      return dummyDoctors[0] || undefined;
    }
    return undefined;
  }
}

export async function createDoctor(doctor: InsertDoctor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // doctorIdが提供されていない場合は自動生成
  const doctorData = { ...doctor };
  if (!doctorData.doctorId) {
    doctorData.doctorId = await generateNextDoctorId();
  }
  
  const result = await db.insert(doctors).values(doctorData);
  return result;
}

export async function updateDoctor(id: number, doctor: Partial<InsertDoctor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctors).set(doctor).where(eq(doctors.id, id));
}

export async function getDoctorByLoginId(loginId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(doctors).where(eq(doctors.loginId, loginId)).limit(1);
  return result[0];
}

export async function deleteDoctor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(doctors).where(eq(doctors.id, id));
}

// ========== Patient Queries ==========

/**
 * ひらがなをカタカナに変換する関数
 */
function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) + 0x60);
  });
}

/**
 * カタカナをひらがなに変換する関数
 */
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
}

export async function getAllPatients(doctorId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // 50音順でソート（読み仮名優先、なければ患者名）
  const orderByField = sql`COALESCE(${patients.nameKana}, ${patients.name})`;
  
  if (doctorId !== undefined) {
    return await db.select().from(patients).where(eq(patients.doctorId, doctorId)).orderBy(asc(orderByField));
  }
  
  return await db.select().from(patients).orderBy(asc(orderByField));
}

export async function getPatientsWithDoctorInfo(
  doctorId?: number,
  searchQuery?: string,
  statusFilter?: string[]
) {
  const db = await getDb();
  if (!db) {
    if (ENV.isProduction === false) {
      let dummyPatients = getDummyPatients();
      if (doctorId !== undefined) {
        dummyPatients = dummyPatients.filter(p => p.patient.doctorId === doctorId);
      }
      // 検索フィルタ（ひらがな・カタカナ対応）
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        // ひらがなをカタカナに変換したクエリも作成
        const queryKatakana = hiraganaToKatakana(query);
        const queryHiragana = katakanaToHiragana(query);
        
        dummyPatients = dummyPatients.filter(p => {
          const name = p.patient.name.toLowerCase();
          const nameKana = p.patient.nameKana ? p.patient.nameKana.toLowerCase() : '';
          const nameKanaHiragana = nameKana ? katakanaToHiragana(nameKana) : '';
          
          return name.includes(query) ||
                 name.includes(queryKatakana) ||
                 name.includes(queryHiragana) ||
                 (nameKana && nameKana.includes(query)) ||
                 (nameKana && nameKana.includes(queryKatakana)) ||
                 (nameKanaHiragana && nameKanaHiragana.includes(query)) ||
                 (nameKanaHiragana && nameKanaHiragana.includes(queryHiragana));
        });
      }
      // ステータスフィルタ
      if (statusFilter && statusFilter.length > 0) {
        dummyPatients = dummyPatients.filter(p => 
          p.patient.status && statusFilter.includes(p.patient.status)
        );
      } else {
        // デフォルトは終了以外を表示
        dummyPatients = dummyPatients.filter(p => 
          !p.patient.status || p.patient.status !== "終了"
        );
      }
      // 50音順でソート（読み仮名優先、なければ患者名）
      dummyPatients.sort((a, b) => {
        const aName = a.patient.nameKana || a.patient.name;
        const bName = b.patient.nameKana || b.patient.name;
        return aName.localeCompare(bName, 'ja');
      });
      return dummyPatients;
    }
    return [];
  }
  
  const conditions: any[] = [];
  
  if (doctorId !== undefined) {
    conditions.push(eq(patients.doctorId, doctorId));
  }
  
  // 検索フィルタ（患者名または読み仮名で部分一致、ひらがな・カタカナ対応）
  if (searchQuery) {
    // ひらがなをカタカナに変換したクエリも作成
    const queryKatakana = hiraganaToKatakana(searchQuery);
    const queryHiragana = katakanaToHiragana(searchQuery);
    
    const patterns = [
      `%${searchQuery}%`,
      `%${queryKatakana}%`,
      `%${queryHiragana}%`,
    ];
    
    // 重複を除去
    const uniquePatterns = Array.from(new Set(patterns));
    
    conditions.push(
      or(
        // 患者名で検索（元のクエリ、カタカナ変換、ひらがな変換のすべて）
        ...uniquePatterns.map(pattern => sql`${patients.name} LIKE ${pattern}`),
        // 読み仮名で検索（元のクエリ、カタカナ変換、ひらがな変換のすべて）
        ...uniquePatterns.map(pattern => sql`${patients.nameKana} LIKE ${pattern}`)
      )!
    );
  }
  
  // ステータスフィルタ
  if (statusFilter && statusFilter.length > 0) {
    conditions.push(sql`${patients.status} IN (${sql.join(statusFilter.map(s => sql`${s}`), sql`, `)})`);
  } else {
    // デフォルトは終了以外を表示
    conditions.push(sql`${patients.status} != '終了' OR ${patients.status} IS NULL`);
  }
  
  try {
    const query = db
      .select({
        patient: patients,
        doctor: doctors,
      })
      .from(patients)
      .leftJoin(doctors, eq(patients.doctorId, doctors.id));
    
    // 50音順でソート（読み仮名優先、なければ患者名）
    const orderByField = sql`COALESCE(${patients.nameKana}, ${patients.name})`;
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(asc(orderByField));
    }
    
    return await query.orderBy(asc(orderByField));
  } catch (error) {
    console.error("[Database] Failed to get patients with doctor info:", error);
    if (error instanceof Error) {
      console.error("[Database] Error message:", error.message);
      // マイグレーションが必要な可能性がある
      if (error.message.includes("Unknown column") || error.message.includes("loginId") || error.message.includes("passwordHash")) {
        console.error("[Database] ⚠️ マイグレーションが必要です。以下のSQLを実行してください：");
        console.error("[Database] ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','doctor') NOT NULL DEFAULT 'user';");
        console.error("[Database] ALTER TABLE `doctors` ADD COLUMN `loginId` varchar(64);");
        console.error("[Database] ALTER TABLE `doctors` ADD COLUMN `passwordHash` varchar(255);");
        // マイグレーションエラーの場合は、ダミーデータを返さずにエラーを再スロー
        throw new Error("データベースマイグレーションが必要です。上記のSQLを実行してください。");
      }
    }
    // マイグレーション以外のエラー時は開発環境ではダミーデータを返す
    if (ENV.isProduction === false) {
      console.warn("[Database] Using dummy data due to error");
      let dummyPatients = getDummyPatients();
      if (doctorId !== undefined) {
        dummyPatients = dummyPatients.filter(p => p.patient.doctorId === doctorId);
      }
      return dummyPatients;
    }
    throw error;
  }
}

export async function getPatientById(id: number) {
  const db = await getDb();
  if (!db) {
    if (ENV.isProduction === false) {
      // 開発環境では、ダミーデータを返す
      const dummyPatients = getDummyPatients();
      const patient = dummyPatients.find(p => p.patient.id === id);
      return patient ? patient.patient : undefined;
    }
    return undefined;
  }
  
  try {
    const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    if (result.length > 0) {
      return result[0];
    }
    
    // データベースにデータがない場合、開発環境ではダミーデータを返す
    if (ENV.isProduction === false) {
      const dummyPatients = getDummyPatients();
      const patient = dummyPatients.find(p => p.patient.id === id);
      return patient ? patient.patient : undefined;
    }
    
    return undefined;
  } catch (error) {
    // エラー時も開発環境ではダミーデータを返す
    if (ENV.isProduction === false) {
      console.warn("[Database] Failed to get patient, using dummy data:", error);
      const dummyPatients = getDummyPatients();
      const patient = dummyPatients.find(p => p.patient.id === id);
      return patient ? patient.patient : undefined;
    }
    throw error;
  }
}

export async function getPatientWithDoctorById(id: number) {
  const db = await getDb();
  if (!db) {
    if (ENV.isProduction === false) {
      // 開発環境では、ダミーデータを返す
      const dummyPatients = getDummyPatients();
      const dummyPatient = dummyPatients.find(p => p.patient.id === id);
      return dummyPatient || undefined;
    }
    return undefined;
  }
  
  const result = await db
    .select({
      patient: patients,
      doctor: doctors,
    })
    .from(patients)
    .leftJoin(doctors, eq(patients.doctorId, doctors.id))
    .where(eq(patients.id, id))
    .limit(1);
  
  return result[0];
}

export async function createPatient(patient: InsertPatient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // patientIdが提供されていない場合は自動生成
  const patientData = { ...patient };
  if (!patientData.patientId) {
    patientData.patientId = await generateNextPatientId();
  }
  
  const result = await db.insert(patients).values(patientData);
  return result;
}

export async function updatePatient(id: number, patient: Partial<InsertPatient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(patients).set(patient).where(eq(patients.id, id));
}

export async function deletePatient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(patients).where(eq(patients.id, id));
}

// ========== Test Item Queries ==========

export async function getAllTestItems() {
  const db = await getDb();
  console.log('[getAllTestItems] Database connection:', !!db);
  console.log('[getAllTestItems] ENV.isProduction:', ENV.isProduction);
  console.log('[getAllTestItems] NODE_ENV:', process.env.NODE_ENV);
  
  if (!db) {
    if (ENV.isProduction === false) {
      const dummyItems = getDummyTestItems();
      console.log('[getAllTestItems] No database connection, returning dummy items, count:', dummyItems.length);
      return dummyItems;
    }
    console.log('[getAllTestItems] No database and production mode, returning empty array');
    return [];
  }
  
  try {
    const items = await db.select().from(testItems).orderBy(testItems.displayOrder, testItems.itemName);
    console.log('[getAllTestItems] Fetched from database, count:', items.length);
    
    // 開発環境でデータベースが空の場合はダミーデータをデータベースに登録
    if (items.length === 0 && ENV.isProduction === false) {
      console.log('[getAllTestItems] Database is empty, seeding dummy items for development');
      const dummyItemsData = dummyTestItemsData;
      
      // ダミーデータをデータベースに登録
      for (const item of dummyItemsData) {
        try {
          await db.insert(testItems).values({
            itemCode: item.itemCode,
            itemName: item.itemName,
            category: item.category,
            unit: item.unit,
            referenceMin: item.referenceMin,
            referenceMax: item.referenceMax,
            referenceMinMale: item.referenceMinMale || null,
            referenceMaxMale: item.referenceMaxMale || null,
            referenceMinFemale: item.referenceMinFemale || null,
            referenceMaxFemale: item.referenceMaxFemale || null,
            displayOrder: item.displayOrder || 0,
            notes: item.notes || null,
          });
        } catch (error: any) {
          // 重複エラーは無視（itemCodeがユニーク制約）
          if (error.code !== 'ER_DUP_ENTRY') {
            console.error(`[getAllTestItems] Error inserting ${item.itemName}:`, error.message);
          }
        }
      }
      
      // 登録後に再度取得
      const insertedItems = await db.select().from(testItems).orderBy(testItems.displayOrder, testItems.itemName);
      console.log('[getAllTestItems] Seeded and fetched items, count:', insertedItems.length);
      return insertedItems;
    }
    
    return items;
  } catch (error) {
    console.error('[getAllTestItems] Database query error:', error);
    // エラー時は開発環境ならダミーデータを返す
    if (ENV.isProduction === false) {
      console.log('[getAllTestItems] Returning dummy items due to error');
      return getDummyTestItems();
    }
    throw error;
  }
}

export async function getTestItemsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testItems).where(eq(testItems.category, category as any)).orderBy(testItems.displayOrder);
}

export async function getTestItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(testItems).where(eq(testItems.id, id)).limit(1);
  return result[0];
}

export async function createTestItem(item: InsertTestItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(testItems).values(item);
  return result;
}

export async function updateTestItem(id: number, item: Partial<InsertTestItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testItems).set(item).where(eq(testItems.id, id));
}

export async function deleteTestItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testItems).where(eq(testItems.id, id));
}

// ========== Visit Queries ==========

export async function getAllVisits(patientId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (patientId !== undefined) {
    return await db.select().from(visits).where(eq(visits.patientId, patientId)).orderBy(desc(visits.visitDate));
  }
  
  return await db.select().from(visits).orderBy(desc(visits.visitDate));
}

export async function getVisitsWithPatientInfo(doctorId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const query = db
    .select({
      visit: visits,
      patient: patients,
    })
    .from(visits)
    .leftJoin(patients, eq(visits.patientId, patients.id));
  
  if (doctorId !== undefined) {
    return await query.where(eq(patients.doctorId, doctorId)).orderBy(desc(visits.visitDate));
  }
  
  return await query.orderBy(desc(visits.visitDate));
}

export async function getVisitById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(visits).where(eq(visits.id, id)).limit(1);
  return result[0];
}

export async function createVisit(visit: InsertVisit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(visits).values(visit);
  return result;
}

export async function updateVisit(id: number, visit: Partial<InsertVisit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(visits).set(visit).where(eq(visits.id, id));
}

export async function deleteVisit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(visits).where(eq(visits.id, id));
}

// ========== Test Result Queries ==========

export async function getAllTestResults(patientId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (patientId !== undefined) {
    return await db.select().from(testResults).where(eq(testResults.patientId, patientId)).orderBy(desc(testResults.testDate));
  }
  
  return await db.select().from(testResults).orderBy(desc(testResults.testDate));
}

export async function getTestResultsWithDetails(patientId?: number, category?: string) {
  const db = await getDb();
  if (!db) {
    if (ENV.isProduction === false) {
      // 開発環境では、ダミーの検査結果を返す
      const dummyTestItems = getDummyTestItems();
      const dummyPatients = getDummyPatients();
      
      // 患者IDが指定されている場合は、その患者のダミーデータを返す
      const targetPatientId = patientId || 1;
      const dummyPatient = dummyPatients.find(p => p.patient.id === targetPatientId);
      
      if (!dummyPatient) return [];
      
      // ダミーの検査結果を生成（20回分の検査日付）
      const dummyResults = [];
      const today = new Date();
      const testDates: Date[] = [];
      
      // 過去30日間から20回分の日付を生成（時系列で横スクロール表示用）
      for (let i = 0; i < 20; i++) {
        const daysAgo = Math.floor((i * 30) / 20); // 均等に分散
        const testDate = new Date(today);
        testDate.setDate(testDate.getDate() - daysAgo);
        testDates.push(testDate);
      }
      
      // 非数値項目の値を生成する関数
      const generateNonNumericValue = (itemCode: string, itemName: string, itemCategory: string): string | null => {
        // 尿検査系
        if (itemCode === "U_PRO" || itemCode === "U_GLU" || itemCode === "U_BLD") {
          const options = ["(-)", "(±)", "(+)", "(++)"];
          return options[Math.floor(Math.random() * options.length)];
        }
        if (itemCode === "U_UBG") {
          const options = ["n", "±", "+", "++"];
          return options[Math.floor(Math.random() * options.length)];
        }
        if (itemCode === "U_WBC" || itemCode === "U_RBC" || itemCode === "U_SQUAMOUS" || 
            itemCode === "U_TRANSITIONAL" || itemCode === "U_CAST" || itemCode === "U_BACTERIA") {
          const options = ["(-)", "1+", "2+", "3+", "少数", "多数"];
          return options[Math.floor(Math.random() * options.length)];
        }
        // 血液型
        if (itemCode === "ABO") {
          return ["A", "B", "O", "AB"][Math.floor(Math.random() * 4)];
        }
        if (itemCode === "RH") {
          return Math.random() > 0.1 ? "(+)" : "(-)";
        }
        // 画像検査・所見系
        if (itemCode.includes("ECHO") || itemCode === "CHEST_XRAY" || itemCode === "ECG" || 
            itemCode === "CHEST_CT" || itemCode === "HEAD_MRI_MRA" || itemCode === "CAROTID_ECHO" ||
            itemCode === "THYROID_ECHO" || itemCode.includes("MAMMO") || itemCode.includes("BREAST_ECHO") ||
            itemCode === "PELVIC_MRI" || itemCode.includes("TV_ECHO") || itemCode === "UGI") {
          const findings = ["異常なし", "軽度異常所見あり", "要精査", "異常所見あり", "所見なし", "正常範囲内"];
          return findings[Math.floor(Math.random() * findings.length)];
        }
        // 内視鏡
        if (itemCode === "EGD" || itemCode === "COLONOSCOPY") {
          const findings = ["異常なし", "軽度炎症", "びらん", "ポリープ", "要精査", "正常"];
          return findings[Math.floor(Math.random() * findings.length)];
        }
        // 眼底
        if (itemCode.includes("FUNDUS")) {
          if (itemCode.includes("FINDINGS")) {
            return ["異常なし", "軽度変化", "要観察", "正常"][Math.floor(Math.random() * 4)];
          } else {
            return ["0", "I", "II", "III", "IV"][Math.floor(Math.random() * 5)];
          }
        }
        // 診察所見
        if (itemCode === "EXAM_FINDINGS") {
          return ["異常なし", "軽度異常", "要観察", "正常範囲内"][Math.floor(Math.random() * 4)];
        }
        // 定性検査
        if (itemCode === "HBS_AG" || itemCode === "HCV_AB" || itemCode === "HIV_AB" || 
            itemCode === "TP_AB" || itemCode === "RPR" || itemCode === "SYPHILIS_AB" ||
            itemCode === "HBC_AB" || itemCode === "HCV_AB2") {
          return Math.random() > 0.95 ? "(+)" : "(-)";
        }
        // 抗体検査判定
        if (itemCode.includes("_RESULT") || (itemCode.includes("_AB") && 
            (itemCode.includes("MEASLES") || itemCode.includes("RUBELLA") || 
             itemCode.includes("VARICELLA") || itemCode.includes("MUMPS")))) {
          return ["陰性", "陽性", "要再検査"][Math.floor(Math.random() * 3)];
        }
        // 便潜血
        if (itemCode === "FOBT1" || itemCode === "FOBT2") {
          return Math.random() > 0.9 ? "陽性" : "陰性";
        }
        // 細胞診
        if (itemCode === "CERVICAL_CYTOLOGY") {
          return ["NILM", "ASC-US", "ASC-H", "LSIL", "HSIL", "正常"][Math.floor(Math.random() * 6)];
        }
        // HPV
        if (itemCode === "HPV16" || itemCode === "HPV18" || itemCode === "HPV_OTHER") {
          return Math.random() > 0.9 ? "陽性" : "陰性";
        }
        // アレルゲン
        if (itemCode.startsWith("MAST_")) {
          return ["クラス0", "クラス1", "クラス2", "クラス3", "クラス4", "クラス5"][Math.floor(Math.random() * 6)];
        }
        // 視力
        if (itemCode.includes("VISION")) {
          return ["0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0", "1.2", "1.5", "2.0"][Math.floor(Math.random() * 13)];
        }
        // 聴力
        if (itemCode.includes("HEARING")) {
          return ["0", "5", "10", "15", "20", "25", "30", "35", "40"][Math.floor(Math.random() * 9)];
        }
        // 眼圧
        if (itemCode.includes("IOP")) {
          return (10 + Math.floor(Math.random() * 12)).toString();
        }
        // 口腔
        if (itemCode === "CARIES" || itemCode === "C0" || itemCode === "C1" || itemCode === "C2" || 
            itemCode === "C3" || itemCode === "C4" || itemCode === "MOBILE_TEETH" || 
            itemCode === "CALCULUS_TEETH" || itemCode === "HEALTHY_TEETH" || itemCode === "PERIODONTAL_3") {
          return Math.floor(Math.random() * 33).toString();
        }
        return null;
      };

      // 各検査日付に対して、複数の検査項目のデータを生成
      for (const testDate of testDates) {
        // 各検査日付に対して、ランダムに10-30個の検査項目を選択
        const selectedItems = [];
        const itemCount = Math.floor(Math.random() * 21) + 10; // 10-30個
        const shuffledItems = [...dummyTestItems].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(itemCount, shuffledItems.length); i++) {
          const item = shuffledItems[i];
          // カテゴリフィルタリング
          if (category && category !== 'ALL' && item.category !== category) {
            continue;
          }
          selectedItems.push(item);
        }
        
        for (const item of selectedItems) {
          // 各検査項目に対して、ランダムな値を生成（基準値内・基準値外を適度に混ぜる、0も含む）
          let value: string;
          
          // まず非数値項目かチェック
          const nonNumericValue = generateNonNumericValue(item.itemCode, item.itemName, item.category);
          if (nonNumericValue !== null) {
            value = nonNumericValue;
          } else if (item.referenceMin === null || item.referenceMax === null || 
                     item.referenceMin === "-" || item.referenceMax === "-") {
            // 基準値がない場合は適当な値を生成（0も含む）
            const rand = Math.random();
            if (rand < 0.1) {
              value = "0.00"; // 10%の確率で0
            } else {
              value = (Math.random() * 100).toFixed(2);
            }
          } else {
            const refMin = Number(item.referenceMin);
            const refMax = Number(item.referenceMax);
            const range = refMax - refMin;
            const random = Math.random();
            
            let numValue: number;
            // 5%の確率で0、70%の確率で基準値内、15%の確率で低値、10%の確率で高値
            if (random < 0.05) {
              numValue = 0;
            } else if (random < 0.75) {
              // 基準値内（中央値±30%の範囲）
              numValue = (refMin + refMax) / 2 + (Math.random() - 0.5) * range * 0.3;
            } else if (random < 0.90) {
              // 低値（基準値下限より10-30%低い、または0）
              if (refMin > 0 && Math.random() > 0.3) {
                const lowRange = range * 0.2;
                numValue = refMin - (Math.random() * lowRange + range * 0.1);
                if (numValue < 0) numValue = 0;
              } else {
                numValue = 0;
              }
            } else {
              // 高値（基準値上限より10-30%高い）
              const highRange = range * 0.2;
              numValue = refMax + (Math.random() * highRange + range * 0.1);
            }
            
            // 負の値にならないようにする
            if (numValue < 0) {
              numValue = 0;
            }
            
            value = numValue.toFixed(2);
          }
          
          dummyResults.push({
            result: {
              id: dummyResults.length + 1,
              resultId: `R${Date.now()}_${item.id}_${testDate.getTime()}`,
              patientId: targetPatientId,
              visitId: null,
              testDate: testDate,
              itemId: item.id,
              resultValue: value as any, // decimal型は文字列として扱われる
              resultComment: null,
              additionalComment: null,
              createdBy: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            item: item,
            patient: dummyPatient.patient,
          });
        }
      }
      
      return dummyResults;
    }
    return [];
  }
  
  let query = db
    .select({
      result: testResults,
      item: testItems,
      patient: patients,
    })
    .from(testResults)
    .leftJoin(testItems, eq(testResults.itemId, testItems.id))
    .leftJoin(patients, eq(testResults.patientId, patients.id));
  
  const conditions = [];
  if (patientId !== undefined) {
    conditions.push(eq(testResults.patientId, patientId));
  }
  if (category && category !== 'ALL') {
    conditions.push(eq(testItems.category, category as any));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(testResults.testDate), testItems.displayOrder);
}

export async function getAbnormalTestResults(doctorId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // 患者の性別に応じて適切な基準値を使用する条件を作成
  // 女性の場合は女性基準値、男性・その他の場合は男性基準値を使用
  // 性別別の基準値が設定されていない場合は共通基準値を使用
  const conditions = [
    or(
      // 女性の場合
      and(
        eq(patients.gender, "女"),
        or(
          sql`(${testItems.referenceMinFemale} IS NOT NULL AND ${testResults.resultValue} < ${testItems.referenceMinFemale})`,
          sql`(${testItems.referenceMaxFemale} IS NOT NULL AND ${testResults.resultValue} > ${testItems.referenceMaxFemale})`,
          sql`(${testItems.referenceMinFemale} IS NULL AND ${testItems.referenceMaxFemale} IS NULL AND ${testItems.referenceMin} IS NOT NULL AND ${testResults.resultValue} < ${testItems.referenceMin})`,
          sql`(${testItems.referenceMinFemale} IS NULL AND ${testItems.referenceMaxFemale} IS NULL AND ${testItems.referenceMax} IS NOT NULL AND ${testResults.resultValue} > ${testItems.referenceMax})`
        )
      ),
      // 男性・その他の場合
      and(
        or(eq(patients.gender, "男"), eq(patients.gender, "その他")),
        or(
          sql`(${testItems.referenceMinMale} IS NOT NULL AND ${testResults.resultValue} < ${testItems.referenceMinMale})`,
          sql`(${testItems.referenceMaxMale} IS NOT NULL AND ${testResults.resultValue} > ${testItems.referenceMaxMale})`,
          sql`(${testItems.referenceMinMale} IS NULL AND ${testItems.referenceMaxMale} IS NULL AND ${testItems.referenceMin} IS NOT NULL AND ${testResults.resultValue} < ${testItems.referenceMin})`,
          sql`(${testItems.referenceMinMale} IS NULL AND ${testItems.referenceMaxMale} IS NULL AND ${testItems.referenceMax} IS NOT NULL AND ${testResults.resultValue} > ${testItems.referenceMax})`
        )
      )
    )
  ];
  
  if (doctorId !== undefined) {
    conditions.push(eq(patients.doctorId, doctorId));
  }
  
  return await db
    .select({
      result: testResults,
      item: testItems,
      patient: patients,
    })
    .from(testResults)
    .leftJoin(testItems, eq(testResults.itemId, testItems.id))
    .leftJoin(patients, eq(testResults.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(desc(testResults.testDate));
}

export async function getTestResultById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(testResults).where(eq(testResults.id, id)).limit(1);
  return result[0];
}

export async function createTestResult(result: InsertTestResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // visitIdが空文字列や0の場合はnullに変換
    let visitId: number | null = null;
    if (result.visitId !== undefined && result.visitId !== null) {
      const visitIdNum = typeof result.visitId === 'number' ? result.visitId : parseInt(String(result.visitId), 10);
      if (!isNaN(visitIdNum) && visitIdNum > 0) {
        visitId = visitIdNum;
      }
    }
    
    // resultCommentとadditionalCommentを処理
    const resultComment = result.resultComment && String(result.resultComment).trim() !== '' 
      ? String(result.resultComment).trim() 
      : null;
    const additionalComment = result.additionalComment && String(result.additionalComment).trim() !== '' 
      ? String(result.additionalComment).trim() 
      : null;
    
    // testDateを処理（Dateオブジェクトを文字列に変換）
    let testDate: string;
    if (result.testDate instanceof Date) {
      // YYYY-MM-DD形式に変換
      const year = result.testDate.getFullYear();
      const month = String(result.testDate.getMonth() + 1).padStart(2, '0');
      const day = String(result.testDate.getDate()).padStart(2, '0');
      testDate = `${year}-${month}-${day}`;
    } else {
      testDate = String(result.testDate);
    }
    
    const processedResult = {
      ...result,
      visitId: visitId,
      testDate: testDate,
      resultComment: resultComment,
      additionalComment: additionalComment,
    };
    
    console.log('[createTestResult] Inserting:', {
      resultId: processedResult.resultId,
      patientId: processedResult.patientId,
      visitId: processedResult.visitId,
      testDate: processedResult.testDate,
      itemId: processedResult.itemId,
      resultValue: processedResult.resultValue,
    });
    
    const insertResult = await db.insert(testResults).values(processedResult);
    return insertResult;
  } catch (error: any) {
    console.error('[createTestResult] Database error:', error);
    console.error('[createTestResult] Error message:', error.message);
    console.error('[createTestResult] Error stack:', error.stack);
    console.error('[createTestResult] Attempted to insert:', result);
    throw error;
  }
}

export async function updateTestResult(id: number, result: Partial<InsertTestResult>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testResults).set(result).where(eq(testResults.id, id));
}

export async function deleteTestResult(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testResults).where(eq(testResults.id, id));
}

// ========== Medication Queries ==========

export async function getMedicationsByPatientId(patientId: number) {
  const db = await getDb();
  if (!db) {
    // データベースが接続されていない場合、開発環境ではダミーデータを返す
    if (ENV.isProduction === false) {
      const dummyData = getDummyMedications(patientId);
      console.log(`[Medications] Database not available, returning dummy data for patientId ${patientId}, count: ${dummyData.length}`);
      return dummyData;
    }
    return [];
  }
  
  try {
    const result = await db.select().from(medications)
      .where(eq(medications.patientId, patientId))
      .orderBy(desc(medications.startDate));
    console.log(`[Medications] Returning ${result.length} medications from database for patientId ${patientId}`);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get medications:", error);
    // エラー時も開発環境ではダミーデータを返す
    if (ENV.isProduction === false) {
      console.log(`[Medications] Error occurred, returning dummy data for patientId ${patientId}`);
      return getDummyMedications(patientId);
    }
    throw error;
  }
}

export async function getMedicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
  return result[0];
}

export async function createMedication(medication: InsertMedication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertResult = await db.insert(medications).values(medication);
  return insertResult;
}

export async function updateMedication(id: number, medication: Partial<InsertMedication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(medications).set(medication).where(eq(medications.id, id));
}

export async function deleteMedication(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(medications).where(eq(medications.id, id));
}

// ========== Test Result Images Queries ==========

function getDummyTestResultImages(
  patientId: number,
  itemId: number,
  testDate?: string,
  imageItemIdMap?: Map<string, number>
): Array<{
  id: number;
  imageId: string;
  patientId: number;
  testResultId: number | null;
  itemId: number;
  testDate: Date;
  imageUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}> {
  // 画像項目名のリスト（IMAGE_ITEMSと同じ）
  const imageItemNames = [
    "甲状腺エコー",
    "安静時心電図",
    "胸部X線",
    "CTR(心胸郭比)",
    "胸部CT",
    "腹部エコー（肝臓所見）",
    "腹部エコー（胆嚢所見）",
    "腹部エコー（すい臓所見）",
    "腹部エコー（腎臓所見）",
    "腹部エコー（脾臓所見）",
    "腹部エコー（腹部大動脈）",
    "経腟エコー（子宮）",
    "経腟エコー（卵巣）",
    "骨盤MRI",
    "マンモグラフィー右",
    "マンモグラフィー左",
    "乳腺エコー右",
    "乳腺エコー左",
  ];
  
  const dummyImages: Array<{
    id: number;
    imageId: string;
    patientId: number;
    testResultId: number | null;
    itemId: number;
    testDate: Date;
    imageUrl: string;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    createdBy: number;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  
  // ランダムに画像がある項目とない項目を作成
  const now = new Date();
  const dates = [
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15),
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  ];
  
  // 各患者、各日付、各画像項目に対して、ランダムに画像を追加
  dates.forEach((date, dateIdx) => {
    if (testDate) {
      const testDateObj = new Date(testDate);
      if (testDateObj.toDateString() !== date.toDateString()) {
        return; // 日付フィルタが指定されている場合は該当日付のみ
      }
    }
    
    imageItemNames.forEach((itemName, itemIdx) => {
      // 実際のIDマッピングがある場合はそれを使用、なければスキップ
      const imgItemId = imageItemIdMap?.get(itemName);
      if (!imgItemId) {
        return; // IDマッピングがない場合はスキップ
      }
      
      // itemIdフィルタが指定されている場合は該当項目のみ
      if (itemId !== 0 && itemId !== imgItemId) {
        return;
      }
      
      // ランダムに画像を追加（約50%の確率で画像あり）
      // 患者IDと項目IDの組み合わせで一貫性を持たせる
      const seed = patientId * 10000 + imgItemId * 100 + dateIdx;
      const random = (Math.sin(seed) * 10000) % 1;
      
      if (random > 0.5) {
        const imageId = `IMG_${patientId}_${imgItemId}_${dateIdx}_${itemIdx}`;
        dummyImages.push({
          id: dummyImages.length + 1,
          imageId,
          patientId,
          testResultId: null,
          itemId: imgItemId,
          testDate: date,
          imageUrl: `https://picsum.photos/800/600?random=${patientId}_${imgItemId}_${dateIdx}`, // ランダム画像URL
          fileName: `${itemName}_${patientId}_${dateIdx}.jpg`,
          fileSize: Math.floor(Math.random() * 1000000) + 100000, // 100KB-1MB
          mimeType: "image/jpeg",
          createdBy: 1,
          createdAt: date,
          updatedAt: date,
        });
      }
    });
  });
  
  return dummyImages;
}

export async function getTestResultImagesByPatientAndItem(
  patientId: number,
  itemId: number,
  testDate?: string
) {
  // 開発環境ではダミーデータを返す
  if (ENV.isProduction === false) {
    // 実際の画像項目IDを取得して使用
    const allTestItems = await getAllTestItems();
    const imageItemNames = [
      "甲状腺エコー",
      "安静時心電図",
      "胸部X線",
      "CTR(心胸郭比)",
      "胸部CT",
      "腹部エコー（肝臓所見）",
      "腹部エコー（胆嚢所見）",
      "腹部エコー（すい臓所見）",
      "腹部エコー（腎臓所見）",
      "腹部エコー（脾臓所見）",
      "腹部エコー（腹部大動脈）",
      "経腟エコー（子宮）",
      "経腟エコー（卵巣）",
      "骨盤MRI",
      "マンモグラフィー右",
      "マンモグラフィー左",
      "乳腺エコー右",
      "乳腺エコー左",
    ];
    
    // 画像項目名から実際のIDへのマッピングを作成
    const imageItemIdMap = new Map<string, number>();
    allTestItems.forEach(item => {
      if (imageItemNames.includes(item.itemName)) {
        imageItemIdMap.set(item.itemName, item.id);
      }
    });
    
    return getDummyTestResultImages(patientId, itemId, testDate, imageItemIdMap);
  }
  
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(testResultImages.patientId, patientId),
  ];
  
  // itemIdが0の場合は全ての項目を取得
  if (itemId !== 0) {
    conditions.push(eq(testResultImages.itemId, itemId));
  }
  
  if (testDate) {
    conditions.push(eq(testResultImages.testDate, new Date(testDate)));
  }
  
  return await db.select().from(testResultImages)
    .where(and(...conditions))
    .orderBy(desc(testResultImages.createdAt));
}

export async function getTestResultImageById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(testResultImages).where(eq(testResultImages.id, id)).limit(1);
  return result[0];
}

export async function createTestResultImage(image: InsertTestResultImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertResult = await db.insert(testResultImages).values(image);
  return insertResult;
}

export async function deleteTestResultImage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testResultImages).where(eq(testResultImages.id, id));
}

// ========== Dashboard Statistics ==========

export async function getDashboardStats(doctorId?: number) {
  const db = await getDb();
  if (!db) {
    if (ENV.isProduction === false) {
      // 開発環境では、ダミーデータの統計を返す
      const dummyPatients = getDummyPatients();
      const filteredPatients = doctorId !== undefined
        ? dummyPatients.filter(p => p.patient.doctorId === doctorId)
        : dummyPatients;
      return {
        patientCount: filteredPatients.length,
        visitCount: 5,
        abnormalCount: 2,
      };
    }
    return { patientCount: 0, visitCount: 0, abnormalCount: 0 };
  }
  
  const patientCount = doctorId !== undefined
    ? await db.select({ count: sql<number>`count(*)` }).from(patients).where(eq(patients.doctorId, doctorId))
    : await db.select({ count: sql<number>`count(*)` }).from(patients);
  
  const visitCondition = doctorId !== undefined
    ? and(
        eq(patients.doctorId, doctorId),
        gte(visits.visitDate, sql`DATE_SUB(CURDATE(), INTERVAL 30 DAY)`)
      )
    : gte(visits.visitDate, sql`DATE_SUB(CURDATE(), INTERVAL 30 DAY)`);
  
  const visitCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(visits)
    .leftJoin(patients, eq(visits.patientId, patients.id))
    .where(visitCondition);
  
  const abnormalResults = await getAbnormalTestResults(doctorId);
  
  return {
    patientCount: Number(patientCount[0]?.count || 0),
    visitCount: Number(visitCount[0]?.count || 0),
    abnormalCount: abnormalResults.length,
  };
}
