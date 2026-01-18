import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// 要件定義書に基づく全検査項目リスト
const items = [
  // ①身体
  { itemCode: "HEIGHT", itemName: "身長", category: "身体", unit: "cm", referenceMin: null, referenceMax: null, displayOrder: 1 },
  { itemCode: "WEIGHT", itemName: "体重", category: "身体", unit: "kg", referenceMin: null, referenceMax: null, displayOrder: 2 },
  { itemCode: "BMI", itemName: "BMI", category: "身体", unit: "", referenceMin: "18.5", referenceMax: "24.9", displayOrder: 3 },
  { itemCode: "WAIST", itemName: "腹囲", category: "身体", unit: "cm", referenceMin: null, referenceMax: null, displayOrder: 4 },
  { itemCode: "BODY_FAT", itemName: "体脂肪率", category: "身体", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 5 },
  { itemCode: "LEAN_BODY_MASS", itemName: "除脂肪率", category: "身体", unit: "kg", referenceMin: null, referenceMax: null, displayOrder: 6 },
  { itemCode: "BMR", itemName: "基礎代謝量", category: "身体", unit: "kcal/day", referenceMin: null, referenceMax: null, displayOrder: 7 },
  { itemCode: "VISION_NAKED_R", itemName: "視力裸眼 (右)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 8 },
  { itemCode: "VISION_NAKED_L", itemName: "視力裸眼 (左)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 9 },
  { itemCode: "VISION_CORRECTED_R", itemName: "視力矯正 (右)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 10 },
  { itemCode: "VISION_CORRECTED_L", itemName: "視力矯正 (左)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 11 },
  { itemCode: "HEARING_4K_R", itemName: "聴力 (4000Hz,右)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 12 },
  { itemCode: "HEARING_4K_L", itemName: "聴力 (4000Hz,左)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 13 },
  { itemCode: "HEARING_1K_R", itemName: "聴力 (1000Hz,右)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 14 },
  { itemCode: "HEARING_1K_L", itemName: "聴力 (1000Hz,左)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 15 },
  { itemCode: "IOP_R", itemName: "眼圧 (右)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 16 },
  { itemCode: "IOP_L", itemName: "眼圧 (左)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 17 },
  { itemCode: "IOP_CORRECTED_R", itemName: "修正眼圧 (右)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 18 },
  { itemCode: "IOP_CORRECTED_L", itemName: "修正眼圧 (左)", category: "身体", unit: "", referenceMin: null, referenceMax: null, displayOrder: 19 },
  { itemCode: "Z_SCORE", itemName: "同年齢比較(Z値)", category: "身体", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 20 },
  { itemCode: "YAM_T_SCORE", itemName: "若年比較(YAM,t値)", category: "身体", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 21 },

  // ②脳・血管
  { itemCode: "CAROTID_ECHO", itemName: "頸動脈エコー", category: "脳・血管", unit: "", referenceMin: null, referenceMax: null, displayOrder: 30 },
  { itemCode: "HEAD_MRI_MRA", itemName: "頭部MRI/MRA", category: "脳・血管", unit: "", referenceMin: null, referenceMax: null, displayOrder: 31 },
  { itemCode: "ODI", itemName: "血中酸素ウェルネス低下指数(ODI)", category: "脳・血管", unit: "回", referenceMin: null, referenceMax: null, displayOrder: 32 },
  { itemCode: "SLEEP_STABILITY", itemName: "睡眠の安定度", category: "脳・血管", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 33 },

  // ③肺機能
  { itemCode: "VC", itemName: "肺活量", category: "肺機能", unit: "L", referenceMin: null, referenceMax: null, displayOrder: 40 },
  { itemCode: "%VC", itemName: "%肺活量(%VC)", category: "肺機能", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 41 },
  { itemCode: "FEV1", itemName: "1秒量(FEV1)", category: "肺機能", unit: "L", referenceMin: null, referenceMax: null, displayOrder: 42 },
  { itemCode: "%FEV1", itemName: "%1秒量(%FEV1)", category: "肺機能", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 43 },
  { itemCode: "FEV1%", itemName: "1秒率(FEV1%)", category: "肺機能", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 44 },
  { itemCode: "FVC", itemName: "努力性肺活量(FVC)", category: "肺機能", unit: "L", referenceMin: null, referenceMax: null, displayOrder: 45 },
  { itemCode: "PEF", itemName: "ピークフロー", category: "肺機能", unit: "L/sec", referenceMin: null, referenceMax: null, displayOrder: 46 },
  { itemCode: "PRED_VC", itemName: "予測肺活量", category: "肺機能", unit: "L", referenceMin: null, referenceMax: null, displayOrder: 47 },
  { itemCode: "KL6", itemName: "KL-6", category: "肺機能", unit: "", referenceMin: null, referenceMax: null, displayOrder: 48 },

  // ④血圧
  { itemCode: "SBP", itemName: "収縮期血圧", category: "血圧", unit: "mmHg", referenceMin: "90", referenceMax: "139", displayOrder: 50 },
  { itemCode: "DBP", itemName: "拡張期血圧", category: "血圧", unit: "mmHg", referenceMin: "60", referenceMax: "89", displayOrder: 51 },

  // ⑤血液
  { itemCode: "RBC", itemName: "赤血球数", category: "血液", unit: "x10^6/µL", referenceMin: null, referenceMax: null, referenceMinMale: "435", referenceMaxMale: "555", referenceMinFemale: "386", referenceMaxFemale: "492", displayOrder: 60 }, // PDF: 男性 435～555 (x10^4/µL)、女性 386～492 (x10^4/µL) ※単位注意
  { itemCode: "HGB", itemName: "Hb", category: "血液", unit: "g/dL", referenceMin: "13.7", referenceMax: "16.8", referenceMinMale: "13.7", referenceMaxMale: "16.8", referenceMinFemale: "11.6", referenceMaxFemale: "14.8", displayOrder: 61 }, // PDF: 男性 13.7～16.8、女性 11.6～14.8
  { itemCode: "HCT", itemName: "Ht", category: "血液", unit: "%", referenceMin: "40.7", referenceMax: "50.1", referenceMinMale: "40.7", referenceMaxMale: "50.1", referenceMinFemale: "35.1", referenceMaxFemale: "44.4", displayOrder: 62 }, // PDF: 男性 40.7～50.1、女性 35.1～44.4
  { itemCode: "FE", itemName: "鉄", category: "血液", unit: "µg/dL", referenceMin: null, referenceMax: null, referenceMinMale: null, referenceMaxMale: null, referenceMinFemale: null, referenceMaxFemale: null, displayOrder: 63 },
  { itemCode: "FERRITIN", itemName: "フェリチン", category: "血液", unit: "ng/mL", referenceMin: "25", referenceMax: "280", referenceMinMale: "25", referenceMaxMale: "280", referenceMinFemale: "10", referenceMaxFemale: "120", displayOrder: 64 }, // PDF: 男性 25～280、女性 10～120
  { itemCode: "RETIC", itemName: "網状赤血球", category: "血液", unit: "‰", referenceMin: "3.6", referenceMax: "20.6", referenceMinMale: "3.6", referenceMaxMale: "20.6", referenceMinFemale: "3.6", referenceMaxFemale: "22.0", displayOrder: 65 }, // PDF: 男性 3.6～20.6、女性 3.6～22.0
  { itemCode: "LDH", itemName: "LDH", category: "血液", unit: "U/L", referenceMin: "120", referenceMax: "240", referenceMinMale: "120", referenceMaxMale: "240", referenceMinFemale: "120", referenceMaxFemale: "240", displayOrder: 66 },
  { itemCode: "WBC", itemName: "白血球数", category: "血液", unit: "x10^3/µL", referenceMin: "3.3", referenceMax: "8.6", referenceMinMale: "3.3", referenceMaxMale: "8.6", referenceMinFemale: "3.3", referenceMaxFemale: "8.6", displayOrder: 67 }, // PDF: 3.3～8.6 (男性基準を採用)
  { itemCode: "NEUTROPHIL", itemName: "好中球", category: "血液", unit: "%", referenceMin: "45.2", referenceMax: "68.8", referenceMinMale: "45.2", referenceMaxMale: "68.8", referenceMinFemale: "49.7", referenceMaxFemale: "72.7", displayOrder: 68 }, // PDF: 男性 45.2～68.8、女性 49.7～72.7
  { itemCode: "LYMPHOCYTE", itemName: "リンパ球", category: "血液", unit: "%", referenceMin: "26.8", referenceMax: "43.8", referenceMinMale: "26.8", referenceMaxMale: "43.8", referenceMinFemale: "24.5", referenceMaxFemale: "38.9", displayOrder: 69 }, // PDF: 男性 26.8～43.8、女性 24.5～38.9
  { itemCode: "MONOCYTE", itemName: "単球", category: "血液", unit: "%", referenceMin: "2.7", referenceMax: "7.9", referenceMinMale: "2.7", referenceMaxMale: "7.9", referenceMinFemale: "1.7", referenceMaxFemale: "8.7", displayOrder: 70 }, // PDF: 男性 2.7～7.9、女性 1.7～8.7
  { itemCode: "EOSINOPHIL", itemName: "好酸球", category: "血液", unit: "%", referenceMin: "0.0", referenceMax: "10.0", referenceMinMale: "0.0", referenceMaxMale: "10.0", referenceMinFemale: "0.0", referenceMaxFemale: "5.0", displayOrder: 71 }, // PDF: 男性 0.0～10.0、女性 0.0～5.0
  { itemCode: "BASOPHIL", itemName: "好塩基球", category: "血液", unit: "%", referenceMin: "0.0", referenceMax: "5.0", referenceMinMale: "0.0", referenceMaxMale: "5.0", referenceMinFemale: "0.0", referenceMaxFemale: "3.0", displayOrder: 72 }, // PDF: 男性 0.0～5.0、女性 0.0～3.0
  { itemCode: "PLT", itemName: "血小板数", category: "血液", unit: "x10^4/µL", referenceMin: "15.8", referenceMax: "34.8", displayOrder: 73 }, // PDF: 15.8～34.8
  { itemCode: "MCV", itemName: "MCV", category: "血液", unit: "fL", referenceMin: "83.6", referenceMax: "98.2", displayOrder: 74 }, // PDF: 83.6～98.2
  { itemCode: "MCH", itemName: "MCH", category: "血液", unit: "pg", referenceMin: "27.5", referenceMax: "33.2", displayOrder: 75 }, // PDF: 27.5～33.2
  { itemCode: "MCHC", itemName: "MCHC", category: "血液", unit: "%", referenceMin: "31.7", referenceMax: "35.3", displayOrder: 76 }, // PDF: 31.7～35.3 (g/dL) ※単位注意
  { itemCode: "TIBC", itemName: "総鉄結合能(TIBC)", category: "血液", unit: "μg/dL", referenceMin: null, referenceMax: null, displayOrder: 77 },
  { itemCode: "UIBC", itemName: "不飽和鉄結合能(UIBC)", category: "血液", unit: "μg/dL", referenceMin: null, referenceMax: null, displayOrder: 78 },
  { itemCode: "ABO", itemName: "ABO", category: "血液", unit: "", referenceMin: null, referenceMax: null, displayOrder: 79 },
  { itemCode: "RH", itemName: "RH", category: "血液", unit: "", referenceMin: null, referenceMax: null, displayOrder: 80 },

  // ⑥脂質代謝
  { itemCode: "TC", itemName: "総コレステロール", category: "脂質代謝", unit: "mg/dL", referenceMin: "120", referenceMax: "219", displayOrder: 90 },
  { itemCode: "HDL", itemName: "HDLコレステロール", category: "脂質代謝", unit: "mg/dL", referenceMin: "40", referenceMax: "119", displayOrder: 91 },
  { itemCode: "LDL", itemName: "LDLコレステロール", category: "脂質代謝", unit: "mg/dL", referenceMin: "60", referenceMax: "139", displayOrder: 92 },
  { itemCode: "L_H_RATIO", itemName: "L/H比", category: "脂質代謝", unit: "", referenceMin: null, referenceMax: null, displayOrder: 93 },
  { itemCode: "NON_HDL", itemName: "non-HDLコレステロール", category: "脂質代謝", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 94 },
  { itemCode: "SD_LDL", itemName: "sd-LDL", category: "脂質代謝", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 95 },
  { itemCode: "TG", itemName: "空腹時中性脂肪", category: "脂質代謝", unit: "mg/dL", referenceMin: "30", referenceMax: "149", displayOrder: 96 },
  { itemCode: "NT_PROBNP", itemName: "NT-proBNP", category: "脂質代謝", unit: "", referenceMin: null, referenceMax: null, displayOrder: 97 },

  // ⑦糖代謝
  { itemCode: "GLU", itemName: "空腹時血糖", category: "糖代謝", unit: "mg/dL", referenceMin: "70", referenceMax: "109", displayOrder: 100 },
  { itemCode: "HBA1C", itemName: "HbA1c", category: "糖代謝", unit: "%", referenceMin: "4.6", referenceMax: "6.2", displayOrder: 101 },
  { itemCode: "1_5_AG", itemName: "1,5-AG", category: "糖代謝", unit: "µg/mL", referenceMin: null, referenceMax: null, displayOrder: 102 },
  { itemCode: "GA", itemName: "グリコアルブミン", category: "糖代謝", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 103 },
  { itemCode: "GLU_2H", itemName: "食後2時間血糖", category: "糖代謝", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 104 },

  // ⑧腎・尿路系
  { itemCode: "U_PRO", itemName: "尿蛋白", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 110 }, // PDF: (－)
  { itemCode: "U_BLD", itemName: "尿潜血", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 111 }, // PDF: (－)
  { itemCode: "U_GLU", itemName: "尿糖", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 112 }, // PDF: (－)
  { itemCode: "U_UBG", itemName: "尿中ウロビリノーゲン", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 113 }, // PDF: n
  { itemCode: "U_PH", itemName: "尿pH", category: "腎・尿路系", unit: "", referenceMin: "4.6", referenceMax: "7.5", displayOrder: 114 }, // PDF: 4.6～7.5
  { itemCode: "U_SG", itemName: "尿比重", category: "腎・尿路系", unit: "", referenceMin: "1.006", referenceMax: "1.022", displayOrder: 115 }, // PDF: 1.006～1.022
  { itemCode: "UA", itemName: "尿酸", category: "腎・尿路系", unit: "mg/dL", referenceMin: "3.0", referenceMax: "7.0", referenceMinMale: "3.0", referenceMaxMale: "7.0", referenceMinFemale: "2.5", referenceMaxFemale: "7.0", displayOrder: 116 }, // PDF: 男性 3.0～7.0、女性 2.5～7.0
  { itemCode: "BUN", itemName: "尿素窒素", category: "腎・尿路系", unit: "mg/dL", referenceMin: "8", referenceMax: "20", referenceMinMale: "8", referenceMaxMale: "20", referenceMinFemale: "8", referenceMaxFemale: "20", displayOrder: 117 },
  { itemCode: "CRE", itemName: "クレアチニン", category: "腎・尿路系", unit: "mg/dL", referenceMin: "0.6", referenceMax: "1.2", referenceMinMale: "0.6", referenceMaxMale: "1.2", referenceMinFemale: "0.4", referenceMaxFemale: "1.0", displayOrder: 118 }, // PDF: 男性 0.6～1.2、女性 0.4～1.0
  { itemCode: "EGFR", itemName: "eGFR", category: "腎・尿路系", unit: "mL/min/1.73m2", referenceMin: "60", referenceMax: null, displayOrder: 119 }, // PDF: 60以上
  { itemCode: "NA", itemName: "Na", category: "腎・尿路系", unit: "mEq/L", referenceMin: "138", referenceMax: "146", displayOrder: 120 },
  { itemCode: "K", itemName: "K", category: "腎・尿路系", unit: "mEq/L", referenceMin: "3.6", referenceMax: "5.0", displayOrder: 121 },
  { itemCode: "CL", itemName: "Cl", category: "腎・尿路系", unit: "mEq/L", referenceMin: "98", referenceMax: "110", displayOrder: 122 },
  { itemCode: "U_ALB", itemName: "尿中アルブミン", category: "腎・尿路系", unit: "mg/gCre", referenceMin: null, referenceMax: null, displayOrder: 123 },
  { itemCode: "U_WBC", itemName: "白血球（尿沈渣）", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 124 },
  { itemCode: "U_RBC", itemName: "赤血球（尿沈渣）", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 125 },
  { itemCode: "U_SQUAMOUS", itemName: "扁平上皮（尿沈渣）", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 126 },
  { itemCode: "U_TRANSITIONAL", itemName: "尿路上皮（尿沈渣）", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 127 },
  { itemCode: "U_CAST", itemName: "円柱（尿沈渣）", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 128 },
  { itemCode: "U_BACTERIA", itemName: "細菌（尿沈渣）", category: "腎・尿路系", unit: "", referenceMin: null, referenceMax: null, displayOrder: 129 },
  { itemCode: "L_FABP", itemName: "L-FABP", category: "腎・尿路系", unit: "μg/gCre", referenceMin: null, referenceMax: null, displayOrder: 130 },

  // ⑨肝胆膵
  { itemCode: "AST", itemName: "AST", category: "肝胆膵", unit: "U/L", referenceMin: "10", referenceMax: "40", displayOrder: 140 },
  { itemCode: "ALT", itemName: "ALT", category: "肝胆膵", unit: "U/L", referenceMin: "5", referenceMax: "45", displayOrder: 141 },
  { itemCode: "GGT", itemName: "γ-GTP", category: "肝胆膵", unit: "U/L", referenceMin: "0", referenceMax: "79", referenceMinMale: "0", referenceMaxMale: "79", referenceMinFemale: "0", referenceMaxFemale: "48", displayOrder: 142 }, // PDF: 男性 0～79、女性 0～48
  { itemCode: "T_BIL", itemName: "総ビリルビン", category: "肝胆膵", unit: "mg/dL", referenceMin: "0.2", referenceMax: "1.2", displayOrder: 143 },
  { itemCode: "D_BIL", itemName: "直接ビリルビン", category: "肝胆膵", unit: "mg/dL", referenceMin: "0.0", referenceMax: "0.4", displayOrder: 144 },
  { itemCode: "I_BIL", itemName: "間接ビリルビン", category: "肝胆膵", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 145 },
  { itemCode: "CPK", itemName: "CPK", category: "肝胆膵", unit: "U/L", referenceMin: "40", referenceMax: "200", referenceMinMale: "40", referenceMaxMale: "200", referenceMinFemale: "30", referenceMaxFemale: "120", displayOrder: 146 }, // PDF: 男性 40～200、女性 30～120
  { itemCode: "CHE", itemName: "Ch-E", category: "肝胆膵", unit: "U/L", referenceMin: "234", referenceMax: "494", referenceMinMale: "234", referenceMaxMale: "494", referenceMinFemale: "196", referenceMaxFemale: "452", displayOrder: 147 }, // PDF: 男性 234～494、女性 196～452
  { itemCode: "TP", itemName: "総蛋白", category: "肝胆膵", unit: "g/dL", referenceMin: "6.6", referenceMax: "8.1", displayOrder: 148 }, // PDF: 6.6～8.1
  { itemCode: "A_G_RATIO", itemName: "A/G比", category: "肝胆膵", unit: "", referenceMin: "1.1", referenceMax: "2.0", displayOrder: 149 },
  { itemCode: "ALB", itemName: "アルブミン量", category: "肝胆膵", unit: "g/dL", referenceMin: "3.8", referenceMax: "5.3", displayOrder: 150 },
  { itemCode: "AMY", itemName: "アミラーゼ", category: "肝胆膵", unit: "U/L", referenceMin: "37", referenceMax: "125", displayOrder: 151 },
  { itemCode: "HBS_AG", itemName: "HBs抗原", category: "肝胆膵", unit: "定性", referenceMin: null, referenceMax: null, displayOrder: 152 }, // PDF: (－)
  { itemCode: "HCV_AB", itemName: "HCV抗体", category: "肝胆膵", unit: "", referenceMin: null, referenceMax: null, displayOrder: 153 }, // PDF: (－)
  { itemCode: "LDH2", itemName: "LDH", category: "肝胆膵", unit: "U/L", referenceMin: "120", referenceMax: "240", displayOrder: 154 },
  { itemCode: "ALP", itemName: "ALP", category: "肝胆膵", unit: "U/L", referenceMin: "100", referenceMax: "340", displayOrder: 155 },
  { itemCode: "CERULOPLASMIN", itemName: "セルロプラスミン", category: "肝胆膵", unit: "mg/dL", referenceMin: "20", referenceMax: "35", displayOrder: 156 },
  { itemCode: "PROT_ALB", itemName: "蛋白分画(アルブミン)", category: "肝胆膵", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 157 },
  { itemCode: "PROT_A1", itemName: "蛋白分画(α1)", category: "肝胆膵", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 158 },
  { itemCode: "PROT_A2", itemName: "蛋白分画(α2)", category: "肝胆膵", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 159 },
  { itemCode: "PROT_B1", itemName: "蛋白分画(β1)", category: "肝胆膵", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 160 },
  { itemCode: "PROT_B2", itemName: "蛋白分画(β2)", category: "肝胆膵", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 161 },
  { itemCode: "PROT_G", itemName: "蛋白分画(γ)", category: "肝胆膵", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 162 },
  { itemCode: "FIB4", itemName: "FIB-4 index", category: "肝胆膵", unit: "", referenceMin: null, referenceMax: null, displayOrder: 163 },
  { itemCode: "ZN", itemName: "亜鉛", category: "肝胆膵", unit: "μg/dL", referenceMin: "65", referenceMax: "110", displayOrder: 164 },
  { itemCode: "MG", itemName: "マグネシウム", category: "肝胆膵", unit: "mg/dL", referenceMin: "1.8", referenceMax: "2.4", displayOrder: 165 },
  { itemCode: "CU", itemName: "血清銅", category: "肝胆膵", unit: "μg/dL", referenceMin: "70", referenceMax: "130", referenceMinMale: "70", referenceMaxMale: "130", referenceMinFemale: "80", referenceMaxFemale: "130", displayOrder: 166 }, // PDF: 男性 70～130、女性 80～130
  { itemCode: "IP", itemName: "無機リン", category: "肝胆膵", unit: "mg/dL", referenceMin: "2.5", referenceMax: "4.5", displayOrder: 167 },
  { itemCode: "25OHVD", itemName: "25OHVD", category: "肝胆膵", unit: "μg/mL", referenceMin: "30", referenceMax: null, displayOrder: 168 }, // PDF: 30以上
  { itemCode: "1_25_OH2VD", itemName: "1,25(OH)2VD", category: "肝胆膵", unit: "PG/mL", referenceMin: "20", referenceMax: "60", displayOrder: 169 },

  // ⑩内分泌
  { itemCode: "PL", itemName: "リン脂質", category: "内分泌", unit: "mg/dL", referenceMin: "150", referenceMax: "300", displayOrder: 170 },
  { itemCode: "HOMOCYSTEINE", itemName: "総ホモシステイン", category: "内分泌", unit: "nmol/mL", referenceMin: "5.0", referenceMax: "15.0", displayOrder: 171 },
  { itemCode: "FFA", itemName: "遊離脂肪酸", category: "内分泌", unit: "μEq/L", referenceMin: "150", referenceMax: "650", displayOrder: 172 },
  { itemCode: "CA", itemName: "カルシウム", category: "内分泌", unit: "mg/dL", referenceMin: "8.5", referenceMax: "10.5", displayOrder: 173 },
  { itemCode: "TSH", itemName: "TSH", category: "内分泌", unit: "μIU/mL", referenceMin: "0.35", referenceMax: "4.94", displayOrder: 174 }, // PDF: 0.35～4.94
  { itemCode: "FT3", itemName: "遊離T3", category: "内分泌", unit: "pg/mL", referenceMin: "1.71", referenceMax: "3.71", displayOrder: 175 }, // PDF: 1.71～3.71
  { itemCode: "FT4", itemName: "遊離T4", category: "内分泌", unit: "ng/dL", referenceMin: "0.70", referenceMax: "1.48", displayOrder: 176 }, // PDF: 0.70～1.48 (ng/dL)
  { itemCode: "THYROID_ECHO", itemName: "甲状腺エコー", category: "内分泌", unit: "", referenceMin: null, referenceMax: null, displayOrder: 177 },

  // ⑪口腔
  { itemCode: "CARIES", itemName: "齲歯本数", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 180 },
  { itemCode: "C0", itemName: "C0", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 181 },
  { itemCode: "C1", itemName: "C1", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 182 },
  { itemCode: "C2", itemName: "C2", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 183 },
  { itemCode: "C3", itemName: "C3", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 184 },
  { itemCode: "C4", itemName: "C4", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 185 },
  { itemCode: "MOBILE_TEETH", itemName: "動揺歯数", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 186 },
  { itemCode: "CALCULUS_TEETH", itemName: "歯石歯数", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 187 },
  { itemCode: "HEALTHY_TEETH", itemName: "健全歯数", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 188 },
  { itemCode: "PERIODONTAL_3", itemName: "歯周ポケットの深さが3以上の歯数", category: "口腔", unit: "", referenceMin: null, referenceMax: null, displayOrder: 189 },

  // ⑫診察
  { itemCode: "EXAM_FINDINGS", itemName: "診察所見", category: "診察", unit: "", referenceMin: null, referenceMax: null, displayOrder: 190 },

  // ⑬循環器
  { itemCode: "FUNDUS_FINDINGS", itemName: "眼底（所見）", category: "循環器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 200 },
  { itemCode: "FUNDUS_KW_R", itemName: "眼底（K-W）右", category: "循環器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 201 },
  { itemCode: "FUNDUS_KW_L", itemName: "眼底（K-W）左", category: "循環器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 202 },
  { itemCode: "FUNDUS_S_S_R", itemName: "眼底（Scheie S）右", category: "循環器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 203 },
  { itemCode: "FUNDUS_S_S_L", itemName: "眼底（Scheie S）左", category: "循環器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 204 },
  { itemCode: "FUNDUS_S_H_R", itemName: "眼底（Scheie H）右", category: "循環器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 205 },
  { itemCode: "FUNDUS_S_H_L", itemName: "眼底（Scheie H）左", category: "循環器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 206 },
  { itemCode: "ECG", itemName: "安静時心電図", category: "循環器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 207 },
  { itemCode: "HR", itemName: "心拍数", category: "循環器", unit: "/min", referenceMin: null, referenceMax: null, displayOrder: 208 },

  // ⑭呼吸器
  { itemCode: "CHEST_XRAY", itemName: "胸部X線", category: "呼吸器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 210 },
  { itemCode: "CTR", itemName: "CTR(心胸郭比)", category: "呼吸器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 211 },
  { itemCode: "CHEST_CT", itemName: "胸部CT", category: "呼吸器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 212 },

  // ⑮消化器
  { itemCode: "ABD_ECHO_LIVER", itemName: "腹部エコー（肝臓所見）", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 220 },
  { itemCode: "ABD_ECHO_GB", itemName: "腹部エコー（胆嚢所見）", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 221 },
  { itemCode: "ABD_ECHO_PANCREAS", itemName: "腹部エコー（すい臓所見）", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 222 },
  { itemCode: "ABD_ECHO_KIDNEY", itemName: "腹部エコー（腎臓所見）", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 223 },
  { itemCode: "ABD_ECHO_SPLEEN", itemName: "腹部エコー（脾臓所見）", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 224 },
  { itemCode: "ABD_ECHO_AORTA", itemName: "腹部エコー（腹部大動脈）", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 225 },
  { itemCode: "EGD", itemName: "上部内視鏡所見", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 226 },
  { itemCode: "COLONOSCOPY", itemName: "下部内視鏡所見", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 227 },
  { itemCode: "UGI", itemName: "胃バリウム", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 228 },
  { itemCode: "FOBT1", itemName: "便潜血(1回目)", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 229 },
  { itemCode: "FOBT2", itemName: "便潜血(2回目)", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 230 },
  { itemCode: "PG1", itemName: "ペプシノーゲンⅠ", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 231 },
  { itemCode: "PG2", itemName: "ペプシノーゲンⅡ", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 232 },
  { itemCode: "PG_RATIO", itemName: "ペプシノーゲン比", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 233 },
  { itemCode: "HP_AB", itemName: "血清ピロリ抗体", category: "消化器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 234 },

  // ⑯生殖器
  { itemCode: "CERVICAL_CYTOLOGY", itemName: "子宮頸部細胞診", category: "生殖器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 240 },
  { itemCode: "HPV16", itemName: "HPV16", category: "生殖器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 241 },
  { itemCode: "HPV18", itemName: "HPV18", category: "生殖器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 242 },
  { itemCode: "HPV_OTHER", itemName: "HPVその他ハイリスクグループ", category: "生殖器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 243 },
  { itemCode: "TV_ECHO_UTERUS", itemName: "経腟エコー（子宮）", category: "生殖器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 244 },
  { itemCode: "TV_ECHO_OVARY", itemName: "経腟エコー（卵巣）", category: "生殖器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 245 },
  { itemCode: "PELVIC_MRI", itemName: "骨盤MRI", category: "生殖器", unit: "", referenceMin: null, referenceMax: null, displayOrder: 246 },

  // ⑰乳がん
  { itemCode: "MAMMO_R", itemName: "マンモグラフィー右", category: "乳がん", unit: "", referenceMin: null, referenceMax: null, displayOrder: 250 },
  { itemCode: "MAMMO_L", itemName: "マンモグラフィー左", category: "乳がん", unit: "", referenceMin: null, referenceMax: null, displayOrder: 251 },
  { itemCode: "BREAST_ECHO_R", itemName: "乳腺エコー右", category: "乳がん", unit: "", referenceMin: null, referenceMax: null, displayOrder: 252 },
  { itemCode: "BREAST_ECHO_L", itemName: "乳腺エコー左", category: "乳がん", unit: "", referenceMin: null, referenceMax: null, displayOrder: 253 },

  // ⑱腫瘍マーカー
  { itemCode: "CEA", itemName: "CEA", category: "腫瘍マーカー", unit: "ng/mL", referenceMin: null, referenceMax: "5.0", displayOrder: 260 }, // PDF: 5.0以下
  { itemCode: "CA199", itemName: "CA19-9", category: "腫瘍マーカー", unit: "U/mL", referenceMin: null, referenceMax: "37.0", displayOrder: 261 }, // PDF: 37.0以下
  { itemCode: "PSA", itemName: "PSA (男性)", category: "腫瘍マーカー", unit: "ng/mL", referenceMin: null, referenceMax: "2.700", displayOrder: 262 }, // PDF: 2.700以下
  { itemCode: "CA125", itemName: "CA125 (女性)", category: "腫瘍マーカー", unit: "U/mL", referenceMin: null, referenceMax: "35.0", displayOrder: 263 }, // PDF: 35.0以下
  { itemCode: "AFP", itemName: "AFP", category: "腫瘍マーカー", unit: "ng/mL", referenceMin: null, referenceMax: "10.0", displayOrder: 264 }, // PDF: 10.0以下
  { itemCode: "SCC", itemName: "SCC抗原", category: "腫瘍マーカー", unit: "ng/mL", referenceMin: null, referenceMax: "1.5", displayOrder: 265 }, // PDF: 1.5以下
  { itemCode: "CYFRA", itemName: "CYFRA", category: "腫瘍マーカー", unit: "ng/mL", referenceMin: null, referenceMax: "2.2", displayOrder: 266 }, // PDF: 2.2以下

  // ⑲感染症・免疫
  { itemCode: "CRP", itemName: "CRP", category: "感染症・免疫", unit: "mg/dL", referenceMin: null, referenceMax: "0.3", displayOrder: 270 }, // PDF: 0.3以下
  { itemCode: "ESR", itemName: "赤沈", category: "感染症・免疫", unit: "mm/1h", referenceMin: "2", referenceMax: "10", referenceMinMale: "2", referenceMaxMale: "10", referenceMinFemale: "3", referenceMaxFemale: "15", displayOrder: 271 }, // PDF: 男性 2～10、女性 3～15
  { itemCode: "RF", itemName: "RF", category: "感染症・免疫", unit: "IU/mL", referenceMin: null, referenceMax: "15", displayOrder: 272 }, // PDF: 15以下
  { itemCode: "ANA", itemName: "抗核抗体", category: "感染症・免疫", unit: "倍", referenceMin: null, referenceMax: "40", displayOrder: 273 }, // PDF: 40未満
  { itemCode: "MPO_ANCA", itemName: "MPO-ANCA", category: "感染症・免疫", unit: "U/mL", referenceMin: null, referenceMax: null, displayOrder: 274 },
  { itemCode: "PR3_ANCA", itemName: "PR3-ANCA", category: "感染症・免疫", unit: "U/mL", referenceMin: null, referenceMax: null, displayOrder: 275 },
  { itemCode: "CCP_AB", itemName: "抗CCP抗体", category: "感染症・免疫", unit: "U/mL", referenceMin: null, referenceMax: null, displayOrder: 276 },
  { itemCode: "HIV_AB", itemName: "HIV抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 277 },
  { itemCode: "TP_AB", itemName: "TP抗体", category: "感染症・免疫", unit: "定性", referenceMin: null, referenceMax: null, displayOrder: 278 },
  { itemCode: "RPR", itemName: "RPR", category: "感染症・免疫", unit: "定性", referenceMin: null, referenceMax: null, displayOrder: 279 },
  { itemCode: "SYPHILIS_AB", itemName: "梅毒抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 280 },
  { itemCode: "HBC_AB", itemName: "HBc抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 281 },
  { itemCode: "HCV_AB2", itemName: "HCV抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 282 },
  { itemCode: "CMV_AB", itemName: "サイトメガロウイルス抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 283 },
  { itemCode: "EBV_AB", itemName: "EBウイルス抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 284 },
  { itemCode: "MYCOPLASMA_AB", itemName: "マイコプラズマ抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 285 },
  { itemCode: "CHLAMYDIA_AB", itemName: "クラミジア抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 286 },
  { itemCode: "INFLUENZA_AB", itemName: "インフルエンザ抗体", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 287 },
  { itemCode: "MEASLES_AB", itemName: "麻疹抗体(EIA法-IgG)", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 288 },
  { itemCode: "MEASLES_AB_RESULT", itemName: "麻疹抗体(EIA-IgG)判定", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 289 },
  { itemCode: "RUBELLA_AB", itemName: "風疹抗体 (EIA法-IgG)", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 290 },
  { itemCode: "RUBELLA_AB_RESULT", itemName: "風疹抗体 (EIA法-IgG)判定", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 291 },
  { itemCode: "VARICELLA_AB", itemName: "水痘抗体(EIA法-IgG)", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 292 },
  { itemCode: "VARICELLA_AB_RESULT", itemName: "水痘抗体(EIA法-IgG)判定", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 293 },
  { itemCode: "MUMPS_AB", itemName: "ムンプス抗体(EIA法-IgG)", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 294 },
  { itemCode: "MUMPS_AB2", itemName: "ムンプス抗体(EIA法-IgG)", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 295 },
  { itemCode: "ASO", itemName: "ASO", category: "感染症・免疫", unit: "IU/mL", referenceMin: null, referenceMax: null, displayOrder: 296 },
  { itemCode: "ASK", itemName: "ASK", category: "感染症・免疫", unit: "IU/mL", referenceMin: null, referenceMax: null, displayOrder: 297 },
  { itemCode: "C3", itemName: "C3", category: "感染症・免疫", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 298 },
  { itemCode: "C4", itemName: "C4", category: "感染症・免疫", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 299 },
  { itemCode: "CH50", itemName: "CH50", category: "感染症・免疫", unit: "U/mL", referenceMin: null, referenceMax: null, displayOrder: 300 },
  { itemCode: "IGA", itemName: "IgA", category: "感染症・免疫", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 301 },
  { itemCode: "IGG", itemName: "IgG", category: "感染症・免疫", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 302 },
  { itemCode: "IGM", itemName: "IgM", category: "感染症・免疫", unit: "mg/dL", referenceMin: null, referenceMax: null, displayOrder: 303 },
  { itemCode: "IGE", itemName: "IgE", category: "感染症・免疫", unit: "IU/mL", referenceMin: null, referenceMax: null, displayOrder: 304 },
  { itemCode: "T_CELL", itemName: "T-cell", category: "感染症・免疫", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 305 },
  { itemCode: "B_CELL", itemName: "B-cell", category: "感染症・免疫", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 306 },
  { itemCode: "NK_CELL", itemName: "NK細胞", category: "感染症・免疫", unit: "%", referenceMin: null, referenceMax: null, displayOrder: 307 },
  
  // MAST48アレルゲン
  { itemCode: "MAST_DERMATOPHAGOIDES_FARINAE", itemName: "ヤケヒョウヒダニ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 310 },
  { itemCode: "MAST_DERMATOPHAGOIDES_PTERONYSSINUS", itemName: "コナヒョウヒダニ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 311 },
  { itemCode: "MAST_HOUSE_DUST", itemName: "ハウスダスト", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 312 },
  { itemCode: "MAST_CEDAR", itemName: "スギ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 313 },
  { itemCode: "MAST_CYPRESS", itemName: "ヒノキ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 314 },
  { itemCode: "MAST_ALDER", itemName: "ハンノキ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 315 },
  { itemCode: "MAST_BIRCH", itemName: "シラカンバ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 316 },
  { itemCode: "MAST_TIMOTHY", itemName: "オオアワガエリ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 317 },
  { itemCode: "MAST_ORCHARD_GRASS", itemName: "カモガヤ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 318 },
  { itemCode: "MAST_PERENNIAL_RYEGRASS", itemName: "ナガハグサ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 319 },
  { itemCode: "MAST_SWEET_VERNAL_GRASS", itemName: "ハルガヤ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 320 },
  { itemCode: "MAST_BERMUDA_GRASS", itemName: "ギョウギシバ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 321 },
  { itemCode: "MAST_MUGWORT", itemName: "ヨモギ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 322 },
  { itemCode: "MAST_RAGWEED", itemName: "ブタクサ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 323 },
  { itemCode: "MAST_GIANT_RAGWEED", itemName: "オオブタクサ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 324 },
  { itemCode: "MAST_FALSE_RAGWEED", itemName: "ブタクサモドキ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 325 },
  { itemCode: "MAST_DOG_DANDER", itemName: "イヌ皮屑", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 326 },
  { itemCode: "MAST_CAT_DANDER", itemName: "ネコ皮屑", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 327 },
  { itemCode: "MAST_LATEX", itemName: "ラテックス", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 328 },
  { itemCode: "MAST_ASPERGILLUS", itemName: "アスペルギルス", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 329 },
  { itemCode: "MAST_CANDIDA", itemName: "カンジダ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 330 },
  { itemCode: "MAST_ALTERNARIA", itemName: "アルテルナリア", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 331 },
  { itemCode: "MAST_PENICILLIUM", itemName: "ペニシリウム", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 332 },
  { itemCode: "MAST_CLADOSPORIUM", itemName: "クラドスポリウム", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 333 },
  { itemCode: "MAST_EGG_WHITE", itemName: "卵白", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 334 },
  { itemCode: "MAST_OVOMUCOID", itemName: "オポムコイド", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 335 },
  { itemCode: "MAST_MILK", itemName: "牛乳", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 336 },
  { itemCode: "MAST_WHEAT", itemName: "小麦", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 337 },
  { itemCode: "MAST_SOYBEAN", itemName: "大豆", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 338 },
  { itemCode: "MAST_RICE", itemName: "米", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 339 },
  { itemCode: "MAST_BUCKWHEAT", itemName: "ソバ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 340 },
  { itemCode: "MAST_SHRIMP", itemName: "エビ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 341 },
  { itemCode: "MAST_CRAB", itemName: "カニ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 342 },
  { itemCode: "MAST_MACKEREL", itemName: "サバ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 343 },
  { itemCode: "MAST_TUNA", itemName: "マグロ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 344 },
  { itemCode: "MAST_SALMON", itemName: "サケ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 345 },
  { itemCode: "MAST_PEANUT", itemName: "ピーナッツ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 346 },
  { itemCode: "MAST_SESAME", itemName: "ゴマ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 347 },
  { itemCode: "MAST_HAZELNUT", itemName: "ヘーゼルナッツ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 348 },
  { itemCode: "MAST_WALNUT", itemName: "クルミ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 349 },
  { itemCode: "MAST_ALMOND", itemName: "アーモンド", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 350 },
  { itemCode: "MAST_TOMATO", itemName: "トマト", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 351 },
  { itemCode: "MAST_PEACH", itemName: "モモ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 352 },
  { itemCode: "MAST_KIWI", itemName: "キウイフルーツ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 353 },
  { itemCode: "MAST_BANANA", itemName: "バナナ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 354 },
  { itemCode: "MAST_APPLE", itemName: "リンゴ", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 355 },
  { itemCode: "MAST_BEEF", itemName: "牛肉", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 356 },
  { itemCode: "MAST_PORK", itemName: "豚肉", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 357 },
  { itemCode: "MAST_CHICKEN", itemName: "鶏肉", category: "感染症・免疫", unit: "", referenceMin: null, referenceMax: null, displayOrder: 358 },
];

console.log("Seeding all test items...");
console.log(`Total items: ${items.length}`);

let successCount = 0;
let errorCount = 0;

for (const item of items) {
  try {
    await connection.execute(
      `INSERT INTO testItems (itemCode, itemName, category, unit, referenceMin, referenceMax, referenceMinMale, referenceMaxMale, referenceMinFemale, referenceMaxFemale, displayOrder) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         itemName = VALUES(itemName),
         category = VALUES(category),
         unit = VALUES(unit),
         referenceMin = VALUES(referenceMin),
         referenceMax = VALUES(referenceMax),
         referenceMinMale = VALUES(referenceMinMale),
         referenceMaxMale = VALUES(referenceMaxMale),
         referenceMinFemale = VALUES(referenceMinFemale),
         referenceMaxFemale = VALUES(referenceMaxFemale),
         displayOrder = VALUES(displayOrder)`,
      [item.itemCode, item.itemName, item.category, item.unit, item.referenceMin, item.referenceMax, item.referenceMinMale || null, item.referenceMaxMale || null, item.referenceMinFemale || null, item.referenceMaxFemale || null, item.displayOrder]
    );
    successCount++;
    console.log(`✓ ${item.itemName} (${item.category})`);
  } catch (error) {
    errorCount++;
    console.log(`✗ ${item.itemName} - ${error.message}`);
  }
}

console.log(`\nSeeding completed!`);
console.log(`Success: ${successCount}, Errors: ${errorCount}`);
await connection.end();
process.exit(0);

