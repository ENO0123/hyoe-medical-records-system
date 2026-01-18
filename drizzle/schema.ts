import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "doctor"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 顧問医師マスタテーブル
 */
export const doctors = mysqlTable("doctors", {
  id: int("id").autoincrement().primaryKey(),
  doctorId: varchar("doctorId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  affiliation: varchar("affiliation", { length: 255 }),
  specialties: text("specialties"), // JSON array stored as text
  notes: text("notes"),
  userId: int("userId").references(() => users.id), // Link to users table for authentication
  loginId: varchar("loginId", { length: 64 }), // Login ID for doctor authentication
  passwordHash: varchar("passwordHash", { length: 255 }), // Hashed password for doctor authentication
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;

/**
 * 患者マスタテーブル
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  patientId: varchar("patientId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  nameKana: varchar("nameKana", { length: 255 }),
  gender: mysqlEnum("gender", ["男", "女", "その他"]).notNull(),
  birthDate: date("birthDate").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  doctorId: int("doctorId").notNull().references(() => doctors.id),
  status: mysqlEnum("status", ["契約中", "終了", "新規"]).default("新規").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * 検査項目マスタテーブル
 */
export const testItems = mysqlTable("testItems", {
  id: int("id").autoincrement().primaryKey(),
  itemCode: varchar("itemCode", { length: 64 }).notNull().unique(),
  itemName: varchar("itemName", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["身体", "脳・血管", "肺機能", "血圧", "血液", "脂質代謝", "糖代謝", "腎・尿路系", "肝胆膵", "内分泌", "口腔", "診察", "循環器", "呼吸器", "消化器", "生殖器", "乳がん", "腫瘍マーカー", "感染症・免疫", "糖尿", "貧血", "尿", "身長体重", "肝機能", "腎機能", "視力聴力", "画像検査", "その他"]).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  referenceMin: decimal("referenceMin", { precision: 10, scale: 2 }), // 後方互換性のため残す（性別共通または男性基準値）
  referenceMax: decimal("referenceMax", { precision: 10, scale: 2 }), // 後方互換性のため残す（性別共通または男性基準値）
  referenceMinMale: decimal("referenceMinMale", { precision: 10, scale: 2 }), // 男性基準値下限
  referenceMaxMale: decimal("referenceMaxMale", { precision: 10, scale: 2 }), // 男性基準値上限
  referenceMinFemale: decimal("referenceMinFemale", { precision: 10, scale: 2 }), // 女性基準値下限
  referenceMaxFemale: decimal("referenceMaxFemale", { precision: 10, scale: 2 }), // 女性基準値上限
  displayOrder: int("displayOrder").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TestItem = typeof testItems.$inferSelect;
export type InsertTestItem = typeof testItems.$inferInsert;

/**
 * 受診記録テーブル
 */
export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  visitId: varchar("visitId", { length: 64 }).notNull().unique(),
  patientId: int("patientId").notNull().references(() => patients.id),
  visitDate: date("visitDate").notNull(),
  visitType: mysqlEnum("visitType", ["定期健診", "突発的受診", "その他"]).notNull(),
  diagnosis: text("diagnosis"),
  chiefComplaint: text("chiefComplaint"),
  findings: text("findings"),
  treatment: text("treatment"),
  prescription: text("prescription"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = typeof visits.$inferInsert;

/**
 * 検査結果テーブル
 */
export const testResults = mysqlTable("testResults", {
  id: int("id").autoincrement().primaryKey(),
  resultId: varchar("resultId", { length: 64 }).notNull().unique(),
  patientId: int("patientId").notNull().references(() => patients.id),
  visitId: int("visitId").references(() => visits.id),
  testDate: date("testDate").notNull(),
  itemId: int("itemId").notNull().references(() => testItems.id),
  resultValue: decimal("resultValue", { precision: 10, scale: 2 }).notNull(),
  resultComment: text("resultComment"),
  additionalComment: text("additionalComment"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = typeof testResults.$inferInsert;

/**
 * 薬歴テーブル
 */
export const medications = mysqlTable("medications", {
  id: int("id").autoincrement().primaryKey(),
  medicationId: varchar("medicationId", { length: 64 }).notNull().unique(),
  patientId: int("patientId").notNull().references(() => patients.id),
  medicationName: varchar("medicationName", { length: 255 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;

/**
 * 検査結果画像テーブル
 */
export const testResultImages = mysqlTable("testResultImages", {
  id: int("id").autoincrement().primaryKey(),
  imageId: varchar("imageId", { length: 64 }).notNull().unique(),
  patientId: int("patientId").notNull().references(() => patients.id),
  testResultId: int("testResultId").references(() => testResults.id),
  itemId: int("itemId").notNull().references(() => testItems.id),
  testDate: date("testDate").notNull(),
  imageUrl: text("imageUrl").notNull(),
  fileName: varchar("fileName", { length: 255 }),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TestResultImage = typeof testResultImages.$inferSelect;
export type InsertTestResultImage = typeof testResultImages.$inferInsert;
