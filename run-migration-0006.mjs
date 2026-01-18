import "dotenv/config";
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[Migration] DATABASE_URL環境変数が設定されていません');
  process.exit(1);
}

// DATABASE_URLから接続情報を抽出
// mysql://user:password@host:port/database
const urlMatch = connectionString.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!urlMatch) {
  console.error('[Migration] DATABASE_URLの形式が正しくありません');
  process.exit(1);
}

// URLデコードを実行
const decodeURIComponentSafe = (str) => {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
};

const [, user, password, host, port, database] = urlMatch;
const decodedPassword = decodeURIComponentSafe(password);
const decodedUser = decodeURIComponentSafe(user);

try {
  console.log('[Migration] MySQLに接続中...');
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port, 10),
    user: decodedUser,
    password: decodedPassword,
    database,
    multipleStatements: true,
  });

  console.log('[Migration] マイグレーションファイルを読み込み中...');
  const migrationFile = join(__dirname, 'drizzle', '0006_add_doctor_login.sql');
  const sql = readFileSync(migrationFile, 'utf-8');

  // SQL文を分割（--> statement-breakpointで区切る）
  const statements = sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => {
      // 空文字列やコメントのみの行を除外
      const cleaned = s.replace(/^--.*$/gm, '').trim();
      return cleaned.length > 0;
    })
    .map(s => {
      // コメント行を除去
      return s.split('\n')
        .filter(line => !line.trim().startsWith('--') || line.trim() === '')
        .join('\n')
        .trim();
    })
    .filter(s => s.length > 0);

  console.log(`[Migration] ${statements.length}個のSQL文を実行します...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement.trim()) continue;

    try {
      console.log(`[Migration] SQL文 ${i + 1}/${statements.length} を実行中...`);
      await connection.execute(statement);
      console.log(`[Migration] ✓ SQL文 ${i + 1} が正常に実行されました`);
    } catch (error) {
      // カラムが既に存在する場合はスキップ
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log(`[Migration] ⚠ SQL文 ${i + 1}: カラムは既に存在します（スキップ）`);
        continue;
      }
      // ENUM値が既に存在する場合もスキップ
      if (error.code === 'ER_DUP_FIELDNAME' || error.message?.includes('Duplicate column name')) {
        console.log(`[Migration] ⚠ SQL文 ${i + 1}: 変更は既に適用されています（スキップ）`);
        continue;
      }
      throw error;
    }
  }

  await connection.end();
  console.log('');
  console.log('[Migration] ✓ マイグレーションが正常に完了しました');
  console.log('[Migration] サーバーを再起動してください');

} catch (error) {
  console.error('[Migration] エラーが発生しました:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('[Migration] MySQLサーバーに接続できません。サーバーが起動しているか確認してください。');
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('[Migration] 認証エラー。ユーザー名とパスワードを確認してください。');
  } else if (error.code === 'ER_BAD_DB_ERROR') {
    console.error('[Migration] データベースが見つかりません。データベースが存在するか確認してください。');
  }
  process.exit(1);
}
