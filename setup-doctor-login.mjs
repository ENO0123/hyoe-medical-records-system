import "dotenv/config";
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[Setup] DATABASE_URL環境変数が設定されていません');
  process.exit(1);
}

// DATABASE_URLから接続情報を抽出
const urlMatch = connectionString.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!urlMatch) {
  console.error('[Setup] DATABASE_URLの形式が正しくありません');
  process.exit(1);
}

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
  console.log('[Setup] MySQLに接続中...');
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port, 10),
    user: decodedUser,
    password: decodedPassword,
    database,
  });

  // 既存の医師を取得
  const [doctors] = await connection.execute('SELECT * FROM doctors ORDER BY id LIMIT 5');
  
  if (doctors.length === 0) {
    console.log('[Setup] 医師データが見つかりませんでした');
    await connection.end();
    process.exit(1);
  }

  console.log('\n[Setup] 医師一覧:');
  doctors.forEach((doctor, index) => {
    console.log(`  ${index + 1}. ${doctor.name} (ID: ${doctor.doctorId}, Email: ${doctor.email})`);
  });

  // 最初の医師にログイン情報を設定（デモ用）
  const targetDoctor = doctors[0];
  const loginId = `doctor${targetDoctor.id}`;
  const plainPassword = 'password123'; // デフォルトパスワード
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  console.log(`\n[Setup] 医師「${targetDoctor.name}」にログイン情報を設定します...`);
  console.log(`  ログインID: ${loginId}`);
  console.log(`  パスワード: ${plainPassword}`);

  // 既にログイン情報が設定されているか確認
  if (targetDoctor.loginId) {
    console.log(`\n[Setup] ⚠ 既にログインID「${targetDoctor.loginId}」が設定されています。`);
    console.log('[Setup] 上書きしますか？ (y/n)');
    // 自動で上書きする場合は以下のコメントを外す
    // const overwrite = true;
  }

  await connection.execute(
    'UPDATE doctors SET loginId = ?, passwordHash = ? WHERE id = ?',
    [loginId, passwordHash, targetDoctor.id]
  );

  console.log(`\n[Setup] ✓ ログイン情報を設定しました`);
  console.log(`\n[Setup] ログイン情報:`);
  console.log(`  ログインID: ${loginId}`);
  console.log(`  パスワード: ${plainPassword}`);
  console.log(`\n[Setup] 別のポートでサーバーを起動し、/login にアクセスしてログインしてください`);

  await connection.end();
} catch (error) {
  console.error('[Setup] エラーが発生しました:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('[Setup] MySQLサーバーに接続できません。サーバーが起動しているか確認してください。');
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('[Setup] 認証エラー。ユーザー名とパスワードを確認してください。');
  } else if (error.code === 'ER_BAD_DB_ERROR') {
    console.error('[Setup] データベースが見つかりません。データベースが存在するか確認してください。');
  }
  process.exit(1);
}
