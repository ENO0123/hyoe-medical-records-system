import "dotenv/config";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  console.error("エラー: DATABASE_URL環境変数が設定されていません。");
  process.exit(1);
}

// DATABASE_URLから接続情報を解析
const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const port = parseInt(url.port) || 3306;
const user = url.username;
const password = url.password;
const databaseName = url.pathname.slice(1); // 先頭の '/' を除去

// データベース名を除いた接続URLを作成（データベース作成用）
const connectionWithoutDb = `mysql://${user}${password ? ':' + password : ''}@${host}:${port}/`;

console.log(`[Database] 接続情報:`);
console.log(`  ホスト: ${host}`);
console.log(`  ポート: ${port}`);
console.log(`  ユーザー: ${user}`);
console.log(`  データベース名: ${databaseName}`);
console.log('');

try {
  // データベース名を除いて接続
  const connection = await mysql.createConnection(connectionWithoutDb);
  
  console.log(`[Database] MySQLに接続しました`);
  
  // データベースが存在するか確認
  const [databases] = await connection.execute(
    `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
    [databaseName]
  );
  
  if (databases.length > 0) {
    console.log(`[Database] データベース '${databaseName}' は既に存在します`);
  } else {
    // データベースを作成
    console.log(`[Database] データベース '${databaseName}' を作成中...`);
    await connection.execute(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`[Database] ✓ データベース '${databaseName}' を作成しました`);
  }
  
  await connection.end();
  console.log('');
  console.log('[Database] 次のステップ:');
  console.log('  pnpm db:push を実行してマイグレーションを適用してください');
  
} catch (error) {
  console.error('[Database] エラーが発生しました:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('[Database] MySQLサーバーに接続できません。サーバーが起動しているか確認してください。');
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('[Database] 認証エラー。ユーザー名とパスワードを確認してください。');
  }
  process.exit(1);
}
