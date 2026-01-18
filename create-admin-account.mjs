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

// 管理者アカウント情報
const ADMIN_LOGIN_ID = 'r.enomoto';
const ADMIN_PASSWORD = 'ryoe0123';
const ADMIN_NAME = '榎本';
const ADMIN_EMAIL = 'r.enomoto@example.com';
const ADMIN_DOCTOR_ID = 'ADMIN002';

try {
  console.log('[Setup] MySQLに接続中...');
  const connection = await mysql.createConnection({
    host,
    port: parseInt(port, 10),
    user: decodedUser,
    password: decodedPassword,
    database,
  });

  // 既存の管理者アカウントを確認
  const [existingDoctors] = await connection.execute(
    'SELECT * FROM doctors WHERE loginId = ? OR doctorId = ?',
    [ADMIN_LOGIN_ID, ADMIN_DOCTOR_ID]
  );

  if (existingDoctors.length > 0) {
    console.log(`\n[Setup] ⚠ 既に管理者アカウントが存在します:`);
    existingDoctors.forEach(doctor => {
      console.log(`  - ID: ${doctor.id}, 医師ID: ${doctor.doctorId}, ログインID: ${doctor.loginId}, 名前: ${doctor.name}`);
    });
    console.log('\n[Setup] 上書きしますか？ (y/n)');
    // 自動で上書きする場合は以下のコメントを外す
    // const overwrite = true;
  }

  // パスワードをハッシュ化
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 既存の管理者アカウントがある場合は更新、ない場合は新規作成
  if (existingDoctors.length > 0) {
    const existingDoctor = existingDoctors[0];
    console.log(`\n[Setup] 管理者アカウント「${existingDoctor.name}」を更新します...`);
    
    await connection.execute(
      'UPDATE doctors SET name = ?, email = ?, loginId = ?, passwordHash = ?, updatedAt = NOW() WHERE id = ?',
      [ADMIN_NAME, ADMIN_EMAIL, ADMIN_LOGIN_ID, passwordHash, existingDoctor.id]
    );
    
    console.log(`\n[Setup] ✓ 管理者アカウントを更新しました`);
  } else {
    console.log(`\n[Setup] 管理者アカウントを作成します...`);
    
    await connection.execute(
      'INSERT INTO doctors (doctorId, name, email, loginId, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [ADMIN_DOCTOR_ID, ADMIN_NAME, ADMIN_EMAIL, ADMIN_LOGIN_ID, passwordHash]
    );
    
    console.log(`\n[Setup] ✓ 管理者アカウントを作成しました`);
  }

  // ログイン時にusersテーブルにadminロールでユーザーが作成されるようにするため、
  // 既存のusersテーブルのレコードを確認・更新
  const [createdDoctor] = await connection.execute(
    'SELECT * FROM doctors WHERE loginId = ?',
    [ADMIN_LOGIN_ID]
  );

  if (createdDoctor.length > 0) {
    const doctor = createdDoctor[0];
    const openId = `doctor-${doctor.doctorId}`;
    
    // usersテーブルに管理者ユーザーを作成または更新
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE openId = ?',
      [openId]
    );

    if (existingUsers.length > 0) {
      // 既存ユーザーのroleをadminに更新
      await connection.execute(
        'UPDATE users SET role = ?, name = ?, email = ?, updatedAt = NOW() WHERE openId = ?',
        ['admin', ADMIN_NAME, ADMIN_EMAIL, openId]
      );
      console.log(`\n[Setup] ✓ usersテーブルのユーザーを管理者に更新しました`);
    } else {
      // 新規ユーザーを作成
      await connection.execute(
        'INSERT INTO users (openId, name, email, role, loginMethod, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
        [openId, ADMIN_NAME, ADMIN_EMAIL, 'admin', 'doctor']
      );
      console.log(`\n[Setup] ✓ usersテーブルに管理者ユーザーを作成しました`);
    }

    // doctorsテーブルのuserIdを更新
    const [updatedUsers] = await connection.execute(
      'SELECT * FROM users WHERE openId = ?',
      [openId]
    );
    if (updatedUsers.length > 0 && !doctor.userId) {
      await connection.execute(
        'UPDATE doctors SET userId = ? WHERE id = ?',
        [updatedUsers[0].id, doctor.id]
      );
      console.log(`\n[Setup] ✓ doctorsテーブルのuserIdを更新しました`);
    }
  }

  console.log(`\n[Setup] 管理者アカウント情報:`);
  console.log(`  ログインID: ${ADMIN_LOGIN_ID}`);
  console.log(`  パスワード: ${ADMIN_PASSWORD}`);
  console.log(`  名前: ${ADMIN_NAME}`);
  console.log(`  メールアドレス: ${ADMIN_EMAIL}`);
  console.log(`\n[Setup] ログイン画面で上記のログインIDとパスワードを使用してログインしてください`);

  await connection.end();
} catch (error) {
  console.error('[Setup] エラーが発生しました:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('[Setup] MySQLサーバーに接続できません。サーバーが起動しているか確認してください。');
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('[Setup] 認証エラー。ユーザー名とパスワードを確認してください。');
  } else if (error.code === 'ER_BAD_DB_ERROR') {
    console.error('[Setup] データベースが見つかりません。データベースが存在するか確認してください。');
  } else if (error.code === 'ER_DUP_ENTRY') {
    console.error('[Setup] 重複エラー。既に同じログインIDまたはメールアドレスが存在します。');
  }
  console.error('[Setup] エラー詳細:', error);
  process.exit(1);
}
