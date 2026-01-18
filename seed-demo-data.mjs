import "dotenv/config";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";

if (!process.env.DATABASE_URL) {
  console.error("エラー: DATABASE_URL環境変数が設定されていません。");
  console.error("以下のいずれかの方法で環境変数を設定してください：");
  console.error("1. .envファイルを作成してDATABASE_URLを設定する");
  console.error("2. 環境変数として直接設定する: export DATABASE_URL='...'");
  console.error("3. 実行時に設定する: DATABASE_URL='...' pnpm seed:demo-data");
  process.exit(1);
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// ランダムな数値を生成する関数（0も含む）
function randomFloat(min, max) {
  const value = Math.random() * (max - min) + min;
  return value.toFixed(2);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 基準値に基づいてランダムな値を生成（70%の確率で基準値内、15%で低値、15%で高値、5%で0）
function generateValue(referenceMin, referenceMax, gender = null, referenceMinMale = null, referenceMaxMale = null, referenceMinFemale = null, referenceMaxFemale = null) {
  let min, max;
  
  // 性別別の基準値がある場合はそれを使用
  if (gender === "男" && referenceMinMale !== null && referenceMaxMale !== null) {
    min = parseFloat(referenceMinMale);
    max = parseFloat(referenceMaxMale);
  } else if (gender === "女" && referenceMinFemale !== null && referenceMaxFemale !== null) {
    min = parseFloat(referenceMinFemale);
    max = parseFloat(referenceMaxFemale);
  } else if (referenceMin !== null && referenceMax !== null) {
    min = parseFloat(referenceMin);
    max = parseFloat(referenceMax);
  } else {
    // 基準値がない場合は適当な値を返す
    return null;
  }
  
  const range = max - min;
  const random = Math.random();
  
  let value;
  if (random < 0.05) {
    // 5%の確率で0
    value = 0;
  } else if (random < 0.75) {
    // 70%の確率で基準値内（中央値±30%の範囲）
    value = (min + max) / 2 + (Math.random() - 0.5) * range * 0.3;
  } else if (random < 0.90) {
    // 15%の確率で低値（基準値下限より10-30%低い、または0）
    if (min > 0 && Math.random() > 0.3) {
      const lowRange = range * 0.2;
      value = min - (Math.random() * lowRange + range * 0.1);
      if (value < 0) value = 0;
    } else {
      value = 0;
    }
  } else {
    // 15%の確率で高値（基準値上限より10-30%高い）
    const highRange = range * 0.2;
    value = max + (Math.random() * highRange + range * 0.1);
  }
  
  // 負の値にならないようにする
  if (value < 0) {
    value = 0;
  }
  
  return value.toFixed(2);
}

// 非数値項目の値を生成
function generateNonNumericValue(itemCode, itemName, category) {
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
    const findings = [
      "異常なし",
      "軽度異常所見あり",
      "要精査",
      "異常所見あり",
      "所見なし",
      "正常範囲内"
    ];
    return findings[Math.floor(Math.random() * findings.length)];
  }
  
  // 内視鏡
  if (itemCode === "EGD" || itemCode === "COLONOSCOPY") {
    const findings = [
      "異常なし",
      "軽度炎症",
      "びらん",
      "ポリープ",
      "要精査",
      "正常"
    ];
    return findings[Math.floor(Math.random() * findings.length)];
  }
  
  // 眼底
  if (itemCode.includes("FUNDUS")) {
    if (itemCode.includes("FINDINGS")) {
      const findings = ["異常なし", "軽度変化", "要観察", "正常"];
      return findings[Math.floor(Math.random() * findings.length)];
    } else {
      // K-W, Scheie S, Scheie H
      return ["0", "I", "II", "III", "IV"][Math.floor(Math.random() * 5)];
    }
  }
  
  // 診察所見
  if (itemCode === "EXAM_FINDINGS") {
    const findings = [
      "異常なし",
      "軽度異常",
      "要観察",
      "正常範囲内"
    ];
    return findings[Math.floor(Math.random() * findings.length)];
  }
  
  // 定性検査（抗原・抗体）
  if (itemCode === "HBS_AG" || itemCode === "HCV_AB" || itemCode === "HIV_AB" || 
      itemCode === "TP_AB" || itemCode === "RPR" || itemCode === "SYPHILIS_AB" ||
      itemCode === "HBC_AB" || itemCode === "HCV_AB2") {
    return Math.random() > 0.95 ? "(+)" : "(-)"; // 95%の確率で陰性
  }
  
  // 抗体検査（判定付き）
  if (itemCode.includes("_RESULT") || itemCode.includes("_AB") && 
      (itemCode.includes("MEASLES") || itemCode.includes("RUBELLA") || 
       itemCode.includes("VARICELLA") || itemCode.includes("MUMPS"))) {
    const options = ["陰性", "陽性", "要再検査"];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // 便潜血
  if (itemCode === "FOBT1" || itemCode === "FOBT2") {
    return Math.random() > 0.9 ? "陽性" : "陰性";
  }
  
  // 細胞診
  if (itemCode === "CERVICAL_CYTOLOGY") {
    const options = ["NILM", "ASC-US", "ASC-H", "LSIL", "HSIL", "正常"];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // HPV
  if (itemCode === "HPV16" || itemCode === "HPV18" || itemCode === "HPV_OTHER") {
    return Math.random() > 0.9 ? "陽性" : "陰性";
  }
  
  // アレルゲン（MAST系）
  if (itemCode.startsWith("MAST_")) {
    const options = ["クラス0", "クラス1", "クラス2", "クラス3", "クラス4", "クラス5"];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // 視力
  if (itemCode.includes("VISION")) {
    const visionValues = ["0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0", "1.2", "1.5", "2.0"];
    return visionValues[Math.floor(Math.random() * visionValues.length)];
  }
  
  // 聴力
  if (itemCode.includes("HEARING")) {
    const hearingValues = ["0", "5", "10", "15", "20", "25", "30", "35", "40"];
    return hearingValues[Math.floor(Math.random() * hearingValues.length)];
  }
  
  // 眼圧
  if (itemCode.includes("IOP")) {
    return randomInt(10, 21).toString(); // 10-21 mmHg
  }
  
  // 口腔（本数）
  if (itemCode === "CARIES" || itemCode === "C0" || itemCode === "C1" || itemCode === "C2" || 
      itemCode === "C3" || itemCode === "C4" || itemCode === "MOBILE_TEETH" || 
      itemCode === "CALCULUS_TEETH" || itemCode === "HEALTHY_TEETH" || itemCode === "PERIODONTAL_3") {
    return randomInt(0, 32).toString(); // 0-32本
  }
  
  // その他のテキスト項目
  if (category === "診察" || category === "画像検査" || itemName.includes("所見")) {
    const options = ["異常なし", "軽度異常", "要観察", "正常"];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  // デフォルト: 数値として扱う
  return null;
}

// 日付を生成（過去N日から今日まで）
function randomDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
}

console.log("=== デモデータのシードを開始します ===\n");

// 1. ユーザーを作成（既存のユーザーを取得、なければ作成）
console.log("1. ユーザーの確認...");
const [existingUsers] = await connection.execute("SELECT id FROM users LIMIT 1");
let userId;
if (existingUsers.length > 0) {
  userId = existingUsers[0].id;
  console.log(`   既存のユーザーIDを使用: ${userId}`);
} else {
  const [userResult] = await connection.execute(
    "INSERT INTO users (openId, name, email, role) VALUES (?, ?, ?, ?)",
    [`demo_${nanoid(12)}`, "デモユーザー", "demo@example.com", "admin"]
  );
  userId = userResult.insertId;
  console.log(`   新しいユーザーを作成: ${userId}`);
}

// 2. 医師データを作成
console.log("\n2. 医師データの作成...");
const doctors = [
  {
    doctorId: "D001",
    name: "山田太郎",
    email: "yamada@example.com",
    affiliation: "総合病院 内科",
    specialties: JSON.stringify(["内科", "循環器科"]),
  },
  {
    doctorId: "D002",
    name: "佐藤花子",
    email: "sato@example.com",
    affiliation: "クリニック",
    specialties: JSON.stringify(["小児科", "アレルギー科"]),
  },
  {
    doctorId: "D003",
    name: "鈴木一郎",
    email: "suzuki@example.com",
    affiliation: "大学病院",
    specialties: JSON.stringify(["消化器内科", "肝臓内科"]),
  },
];

const doctorIds = [];
for (const doctor of doctors) {
  try {
    const [result] = await connection.execute(
      `INSERT INTO doctors (doctorId, name, email, affiliation, specialties, userId)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [doctor.doctorId, doctor.name, doctor.email, doctor.affiliation, doctor.specialties, userId]
    );
    
    let doctorDbId;
    if (result.insertId) {
      doctorDbId = result.insertId;
    } else {
      const [existing] = await connection.execute(
        "SELECT id FROM doctors WHERE doctorId = ?",
        [doctor.doctorId]
      );
      doctorDbId = existing[0].id;
    }
    
    doctorIds.push(doctorDbId);
    console.log(`   ✓ ${doctor.name} (ID: ${doctorDbId})`);
  } catch (error) {
    console.error(`   ✗ ${doctor.name} - ${error.message}`);
  }
}

// 3. 患者データを作成
console.log("\n3. 患者データの作成...");
const patients = [
  {
    patientId: "P001",
    name: "田中一郎",
    nameKana: "タナカイチロウ",
    gender: "男",
    birthDate: "1975-05-15",
    phone: "03-1234-5678",
    email: "tanaka@example.com",
    address: "東京都渋谷区1-1-1",
    doctorId: doctorIds[0],
    status: "契約中",
  },
  {
    patientId: "P002",
    name: "山本花子",
    nameKana: "ヤマモトハナコ",
    gender: "女",
    birthDate: "1980-08-22",
    phone: "03-2345-6789",
    email: "yamamoto@example.com",
    address: "東京都新宿区2-2-2",
    doctorId: doctorIds[0],
    status: "契約中",
  },
  {
    patientId: "P003",
    name: "佐藤次郎",
    nameKana: "サトウジロウ",
    gender: "男",
    birthDate: "1965-12-10",
    phone: "03-3456-7890",
    email: "sato2@example.com",
    address: "東京都港区3-3-3",
    doctorId: doctorIds[1],
    status: "新規",
  },
  {
    patientId: "P004",
    name: "鈴木三郎",
    nameKana: "スズキサブロウ",
    gender: "男",
    birthDate: "1990-03-25",
    phone: "03-4567-8901",
    email: "suzuki3@example.com",
    address: "東京都世田谷区4-4-4",
    doctorId: doctorIds[2],
    status: "終了",
  },
  {
    patientId: "P005",
    name: "高橋美咲",
    nameKana: "タカハシミサキ",
    gender: "女",
    birthDate: "1985-07-18",
    phone: "03-5678-9012",
    email: "takahashi@example.com",
    address: "東京都目黒区5-5-5",
    doctorId: doctorIds[1],
    status: "契約中",
  },
];

const patientDbIds = [];
for (const patient of patients) {
  try {
    const [result] = await connection.execute(
      `INSERT INTO patients (patientId, name, nameKana, gender, birthDate, phone, email, address, doctorId, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)`,
      [
        patient.patientId,
        patient.name,
        patient.nameKana,
        patient.gender,
        patient.birthDate,
        patient.phone,
        patient.email,
        patient.address,
        patient.doctorId,
        patient.status || "新規",
      ]
    );
    
    let patientDbId;
    if (result.insertId) {
      patientDbId = result.insertId;
    } else {
      const [existing] = await connection.execute(
        "SELECT id FROM patients WHERE patientId = ?",
        [patient.patientId]
      );
      patientDbId = existing[0].id;
    }
    
    patientDbIds.push({ id: patientDbId, ...patient });
    console.log(`   ✓ ${patient.name} (ID: ${patientDbId})`);
  } catch (error) {
    console.error(`   ✗ ${patient.name} - ${error.message}`);
  }
}

// 4. 検査項目を取得
console.log("\n4. 検査項目の確認...");
const [testItems] = await connection.execute(
  "SELECT id, itemCode, itemName, category, unit, referenceMin, referenceMax, referenceMinMale, referenceMaxMale, referenceMinFemale, referenceMaxFemale FROM testItems ORDER BY displayOrder"
);

if (testItems.length === 0) {
  console.log("   警告: 検査項目が見つかりません。先に seed-all-test-items.mjs を実行してください。");
} else {
  console.log(`   ${testItems.length}個の検査項目を取得しました。`);
}

// 5. 受診記録と検査結果を作成
console.log("\n5. 受診記録と検査結果の作成...");

const visitTypes = ["定期健診", "突発的受診", "その他"];
const diagnoses = [
  "健康診断",
  "風邪",
  "高血圧症",
  "糖尿病",
  "脂質異常症",
  "貧血",
  "肝機能異常",
  "腎機能異常",
  "定期検査",
];

for (const patientData of patientDbIds) {
  const patientId = patientData.id;
  const gender = patientData.gender;
  
  // 各患者に対して3-5回の受診記録を作成
  const visitCount = randomInt(3, 5);
  
  for (let v = 0; v < visitCount; v++) {
    const visitDate = randomDate(365); // 過去1年以内
    const visitType = visitTypes[Math.floor(Math.random() * visitTypes.length)];
    const diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];
    
    // 受診記録を作成
    const visitId = `V${nanoid(12)}`;
    let visitDbId;
    
    try {
      const [visitResult] = await connection.execute(
        `INSERT INTO visits (visitId, patientId, visitDate, visitType, diagnosis, chiefComplaint, findings, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          visitId,
          patientId,
          visitDate,
          visitType,
          diagnosis,
          visitType === "突発的受診" ? "体調不良" : null,
          visitType === "突発的受診" ? "所見あり" : "異常なし",
          userId,
        ]
      );
      visitDbId = visitResult.insertId;
    } catch (error) {
      console.error(`   受診記録作成エラー: ${error.message}`);
      continue;
    }
    
    // 検査結果を作成（各受診記録に対して10-30個の検査結果）
    const testResultCount = randomInt(10, 30);
    const selectedTestItems = [];
    
    // ランダムに検査項目を選択
    for (let i = 0; i < testResultCount; i++) {
      const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
      if (!selectedTestItems.find(item => item.id === randomItem.id)) {
        selectedTestItems.push(randomItem);
      }
    }
    
    for (const testItem of selectedTestItems) {
      const resultId = `R${nanoid(12)}`;
      
      // 検査値を生成
      let resultValue;
      
      // まず非数値項目かチェック
      resultValue = generateNonNumericValue(testItem.itemCode, testItem.itemName, testItem.category);
      
      if (resultValue === null) {
        // 数値項目として処理
        resultValue = generateValue(
          testItem.referenceMin,
          testItem.referenceMax,
          gender,
          testItem.referenceMinMale,
          testItem.referenceMaxMale,
          testItem.referenceMinFemale,
          testItem.referenceMaxFemale
        );
        
        if (resultValue === null) {
          // 基準値がない場合は適当な値を生成（0も含む）
          const rand = Math.random();
          if (rand < 0.1) {
            resultValue = "0.00"; // 10%の確率で0
          } else {
            resultValue = randomFloat(0, 100);
          }
        }
      }
      
      try {
        await connection.execute(
          `INSERT INTO testResults (resultId, patientId, visitId, testDate, itemId, resultValue, createdBy)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [resultId, patientId, visitDbId, visitDate, testItem.id, resultValue, userId]
        );
      } catch (error) {
        // エラーは無視（重複など）
      }
    }
    
    console.log(`   ✓ ${patientData.name} - ${visitDate} (${selectedTestItems.length}件の検査結果)`);
  }
}

console.log("\n=== デモデータのシードが完了しました ===");
console.log(`\n作成されたデータ:`);
console.log(`- 医師: ${doctors.length}名`);
console.log(`- 患者: ${patients.length}名`);
console.log(`- 受診記録: 各患者あたり3-5回`);
console.log(`- 検査結果: 各受診記録あたり10-30件`);

await connection.end();
process.exit(0);

