import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";

if (!process.env.DATABASE_URL) {
  console.error("エラー: DATABASE_URL環境変数が設定されていません。");
  console.error("以下のいずれかの方法で環境変数を設定してください：");
  console.error("1. .envファイルを作成してDATABASE_URLを設定する");
  console.error("2. 環境変数として直接設定する: export DATABASE_URL='...'");
  console.error("3. 実行時に設定する: DATABASE_URL='...' pnpm seed:test-results");
  process.exit(1);
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// 既存の患者を取得
const [patients] = await connection.execute("SELECT id, patientId, name FROM patients ORDER BY id LIMIT 1");
if (patients.length === 0) {
  console.error("患者が見つかりません。先に患者を登録してください。");
  await connection.end();
  process.exit(1);
}
const patient = patients[0];
console.log(`患者: ${patient.name} (ID: ${patient.id})`);

// 既存の検査項目を取得
const [testItems] = await connection.execute("SELECT id, itemCode, itemName, category, unit, referenceMin, referenceMax FROM test_items ORDER BY displayOrder LIMIT 20");
if (testItems.length === 0) {
  console.error("検査項目が見つかりません。先に検査項目を登録してください。");
  await connection.end();
  process.exit(1);
}
console.log(`${testItems.length}個の検査項目を取得しました。`);

// 既存のユーザーを取得（createdByに使用）
const [users] = await connection.execute("SELECT id FROM users ORDER BY id LIMIT 1");
if (users.length === 0) {
  console.error("ユーザーが見つかりません。先にユーザーを登録してください。");
  await connection.end();
  process.exit(1);
}
const userId = users[0].id;
console.log(`ユーザーID: ${userId}`);

// 20回分の検査データを生成
const testResults = [];
const today = new Date();

for (let i = 0; i < 20; i++) {
  // 過去30日間からランダムに日付を選択
  const daysAgo = Math.floor(Math.random() * 30);
  const testDate = new Date(today);
  testDate.setDate(testDate.getDate() - daysAgo);
  const testDateStr = testDate.toISOString().split('T')[0]; // YYYY-MM-DD形式

  // ランダムに検査項目を選択
  const testItem = testItems[Math.floor(Math.random() * testItems.length)];
  
  // 検査値を生成（基準値内・基準値外を適度に混ぜる）
  let resultValue;
  if (testItem.referenceMin === "-" || testItem.referenceMax === "-") {
    // 基準値が"-"の項目（尿蛋白、尿糖、尿潜血、画像検査など）
    if (testItem.itemCode === "U_PRO" || testItem.itemCode === "U_GLU" || testItem.itemCode === "U_BLD") {
      resultValue = Math.random() > 0.7 ? "(±)" : "(-)"; // 陰性を主に返す
    } else if (testItem.itemCode === "CHEST_XRAY" || testItem.itemCode === "ECG") {
      resultValue = "異常なし";
    } else {
      resultValue = "正常";
    }
  } else {
    const refMin = parseFloat(testItem.referenceMin);
    const refMax = parseFloat(testItem.referenceMax);
    const range = refMax - refMin;
    const random = Math.random();
    
    let numValue;
    // 70%の確率で基準値内、15%の確率で低値、15%の確率で高値
    if (random < 0.7) {
      // 基準値内（中央値±30%の範囲）
      numValue = (refMin + refMax) / 2 + (Math.random() - 0.5) * range * 0.3;
    } else if (random < 0.85) {
      // 低値（基準値下限より10-30%低い）
      const lowRange = range * 0.2;
      numValue = refMin - (Math.random() * lowRange + range * 0.1);
    } else {
      // 高値（基準値上限より10-30%高い）
      const highRange = range * 0.2;
      numValue = refMax + (Math.random() * highRange + range * 0.1);
    }
    
    // 負の値にならないようにする
    if (numValue < 0) {
      numValue = Math.abs(numValue);
    }
    
    resultValue = numValue.toFixed(2);
  }

  // ユニークなresultIdを生成
  const resultId = `R${nanoid(12)}`;

  testResults.push({
    resultId,
    patientId: patient.id,
    visitId: null, // 受診記録はオプショナル
    testDate: testDateStr,
    itemId: testItem.id,
    resultValue,
    resultComment: null,
    additionalComment: null,
    createdBy: userId,
  });
}

console.log("\n検査データを登録中...");

let successCount = 0;
let errorCount = 0;

for (const result of testResults) {
  try {
    await connection.execute(
      `INSERT INTO test_results (resultId, patientId, visitId, testDate, itemId, resultValue, resultComment, additionalComment, createdBy) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        result.resultId,
        result.patientId,
        result.visitId,
        result.testDate,
        result.itemId,
        result.resultValue,
        result.resultComment,
        result.additionalComment,
        result.createdBy,
      ]
    );
    
    const testItem = testItems.find(item => item.id === result.itemId);
    console.log(`✓ ${result.testDate} - ${testItem.itemName}: ${result.resultValue} ${testItem.unit}`);
    successCount++;
  } catch (error) {
    console.error(`✗ エラー: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n登録完了: ${successCount}件成功, ${errorCount}件失敗`);
await connection.end();
process.exit(0);

