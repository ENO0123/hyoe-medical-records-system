import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const items = [
  // 糖尿カテゴリ
  { itemCode: "GLU", itemName: "空腹時血糖", category: "糖尿", unit: "mg/dL", referenceMin: "70", referenceMax: "109", displayOrder: 1 },
  { itemCode: "HBA1C", itemName: "HbA1c", category: "糖尿", unit: "%", referenceMin: "4.6", referenceMax: "6.2", displayOrder: 2 },
  { itemCode: "GLU_RANDOM", itemName: "随時血糖", category: "糖尿", unit: "mg/dL", referenceMin: "70", referenceMax: "140", displayOrder: 3 },
  
  // 貧血カテゴリ
  { itemCode: "RBC", itemName: "赤血球数", category: "貧血", unit: "万/μL", referenceMin: "400", referenceMax: "550", displayOrder: 10 },
  { itemCode: "HGB", itemName: "ヘモグロビン", category: "貧血", unit: "g/dL", referenceMin: "13.0", referenceMax: "17.0", displayOrder: 11 },
  { itemCode: "HCT", itemName: "ヘマトクリット", category: "貧血", unit: "%", referenceMin: "40.0", referenceMax: "52.0", displayOrder: 12 },
  { itemCode: "MCV", itemName: "MCV", category: "貧血", unit: "fL", referenceMin: "83", referenceMax: "102", displayOrder: 13 },
  { itemCode: "MCH", itemName: "MCH", category: "貧血", unit: "pg", referenceMin: "28", referenceMax: "34", displayOrder: 14 },
  { itemCode: "MCHC", itemName: "MCHC", category: "貧血", unit: "%", referenceMin: "32", referenceMax: "36", displayOrder: 15 },
  
  // 血液カテゴリ
  { itemCode: "WBC", itemName: "白血球数", category: "血液", unit: "/μL", referenceMin: "3500", referenceMax: "9000", displayOrder: 20 },
  { itemCode: "PLT", itemName: "血小板数", category: "血液", unit: "万/μL", referenceMin: "14.0", referenceMax: "37.9", displayOrder: 21 },
  { itemCode: "TC", itemName: "総コレステロール", category: "血液", unit: "mg/dL", referenceMin: "120", referenceMax: "219", displayOrder: 22 },
  { itemCode: "HDL", itemName: "HDLコレステロール", category: "血液", unit: "mg/dL", referenceMin: "40", referenceMax: "119", displayOrder: 23 },
  { itemCode: "LDL", itemName: "LDLコレステロール", category: "血液", unit: "mg/dL", referenceMin: "60", referenceMax: "139", displayOrder: 24 },
  { itemCode: "TG", itemName: "中性脂肪", category: "血液", unit: "mg/dL", referenceMin: "30", referenceMax: "149", displayOrder: 25 },
  { itemCode: "AST", itemName: "AST(GOT)", category: "血液", unit: "U/L", referenceMin: "10", referenceMax: "40", displayOrder: 26 },
  { itemCode: "ALT", itemName: "ALT(GPT)", category: "血液", unit: "U/L", referenceMin: "5", referenceMax: "45", displayOrder: 27 },
  { itemCode: "GGT", itemName: "γ-GTP", category: "血液", unit: "U/L", referenceMin: "0", referenceMax: "79", displayOrder: 28 },
  { itemCode: "UA", itemName: "尿酸", category: "血液", unit: "mg/dL", referenceMin: "3.0", referenceMax: "7.0", displayOrder: 29 },
  { itemCode: "CRE", itemName: "クレアチニン", category: "血液", unit: "mg/dL", referenceMin: "0.6", referenceMax: "1.2", displayOrder: 30 },
  { itemCode: "BUN", itemName: "尿素窒素", category: "血液", unit: "mg/dL", referenceMin: "8", referenceMax: "20", displayOrder: 31 },
  
  // 尿カテゴリ
  { itemCode: "U_PRO", itemName: "尿蛋白", category: "尿", unit: "", referenceMin: "-", referenceMax: "-", displayOrder: 40 },
  { itemCode: "U_GLU", itemName: "尿糖", category: "尿", unit: "", referenceMin: "-", referenceMax: "-", displayOrder: 41 },
  { itemCode: "U_BLD", itemName: "尿潜血", category: "尿", unit: "", referenceMin: "-", referenceMax: "-", displayOrder: 42 },
  { itemCode: "U_PH", itemName: "尿pH", category: "尿", unit: "", referenceMin: "5.0", referenceMax: "7.5", displayOrder: 43 },
  { itemCode: "U_SG", itemName: "尿比重", category: "尿", unit: "", referenceMin: "1.010", referenceMax: "1.025", displayOrder: 44 },
  
  // 身長/体重カテゴリ
  { itemCode: "HEIGHT", itemName: "身長", category: "身長体重", unit: "cm", referenceMin: "140", referenceMax: "200", displayOrder: 50 },
  { itemCode: "WEIGHT", itemName: "体重", category: "身長体重", unit: "kg", referenceMin: "40", referenceMax: "100", displayOrder: 51 },
  { itemCode: "BMI", itemName: "BMI", category: "身長体重", unit: "", referenceMin: "18.5", referenceMax: "24.9", displayOrder: 52 },
  { itemCode: "WAIST", itemName: "腹囲", category: "身長体重", unit: "cm", referenceMin: "0", referenceMax: "85", displayOrder: 53 },
  { itemCode: "SBP", itemName: "収縮期血圧", category: "身長体重", unit: "mmHg", referenceMin: "90", referenceMax: "139", displayOrder: 54 },
  { itemCode: "DBP", itemName: "拡張期血圧", category: "身長体重", unit: "mmHg", referenceMin: "60", referenceMax: "89", displayOrder: 55 },
];

console.log("Seeding test items...");

for (const item of items) {
  try {
    await connection.execute(
      `INSERT INTO test_items (itemCode, itemName, category, unit, referenceMin, referenceMax, displayOrder) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.itemCode, item.itemName, item.category, item.unit, item.referenceMin, item.referenceMax, item.displayOrder]
    );
    console.log(`✓ ${item.itemName} (${item.category})`);
  } catch (error) {
    console.log(`✗ ${item.itemName} - ${error.message}`);
  }
}

console.log("Seeding completed!");
await connection.end();
process.exit(0);
