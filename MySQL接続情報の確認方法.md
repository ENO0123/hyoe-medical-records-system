# MySQL接続情報の確認方法

## 1. ローカルMySQLの場合

### 1.1 ユーザー名とパスワードの確認

**macOSの場合：**
```bash
# MySQLに接続を試みる（パスワードを聞かれます）
mysql -u root -p

# または、特定のユーザーで接続
mysql -u ユーザー名 -p
```

**Windowsの場合：**
```cmd
# MySQLコマンドプロンプトから
mysql -u root -p
```

**一般的なデフォルト設定：**
- ユーザー名: `root`
- パスワード: インストール時に設定したパスワード（設定していない場合は空）
- ホスト: `localhost` または `127.0.0.1`
- ポート: `3306`（デフォルト）

### 1.2 ホストとポートの確認

```bash
# MySQLが起動しているか確認（macOS）
brew services list | grep mysql
# または
mysql.server status

# ポートが使用されているか確認
lsof -i :3306
# または
netstat -an | grep 3306
```

### 1.3 データベースの確認

MySQLに接続後：
```sql
-- 既存のデータベース一覧を表示
SHOW DATABASES;

-- 現在のユーザーを確認
SELECT USER();

-- 現在のホストを確認
SELECT @@hostname;
```

## 2. リモートMySQLサーバーの場合

### 2.1 接続情報の取得先

1. **サーバー管理者に確認**
   - ホスト名（IPアドレス）
   - ポート番号
   - ユーザー名
   - パスワード
   - データベース名

2. **既存の設定ファイルを確認**
   ```bash
   # 他のアプリケーションの設定ファイルを確認
   # 例: WordPress, Laravel, Rails など
   cat wp-config.php | grep DB_
   cat .env | grep DATABASE
   ```

3. **MySQL設定ファイルを確認**
   ```bash
   # MySQL設定ファイルの場所（macOS）
   cat /usr/local/etc/my.cnf
   # または
   cat /etc/my.cnf
   
   # Windowsの場合
   # C:\ProgramData\MySQL\MySQL Server X.X\my.ini
   ```

## 3. 接続テスト方法

### 3.1 コマンドラインで接続テスト

```bash
# 基本形式
mysql -h ホスト名 -u ユーザー名 -p データベース名

# ローカルの例
mysql -h localhost -u root -p medical_records

# リモートの例
mysql -h 192.168.1.100 -u myuser -p mydatabase
```

### 3.2 接続情報を確認するSQL

MySQLに接続後、以下を実行：
```sql
-- 現在の接続情報を確認
SELECT 
    USER() as 'ユーザー@ホスト',
    DATABASE() as '現在のデータベース',
    @@hostname as 'ホスト名',
    @@port as 'ポート番号';

-- 利用可能なデータベース一覧
SHOW DATABASES;

-- ユーザー権限を確認
SHOW GRANTS;
```

## 4. よくある設定パターン

### 4.1 ローカル開発環境（macOS Homebrew）

```env
DATABASE_URL=mysql://root:password@localhost:3306/medical_records
```

**確認方法：**
```bash
# MySQLがインストールされているか確認
which mysql
mysql --version

# MySQLサービスが起動しているか確認
brew services list | grep mysql
```

### 4.2 ローカル開発環境（Docker）

```env
DATABASE_URL=mysql://root:password@localhost:3306/medical_records
```

**確認方法：**
```bash
# Dockerコンテナを確認
docker ps | grep mysql

# ポートマッピングを確認
docker port <コンテナ名>
```

### 4.3 クラウドサービス（例：AWS RDS, Google Cloud SQL）

接続情報は各サービスのコンソールから確認：
- **AWS RDS**: RDSコンソール → エンドポイント、ポート、マスターユーザー名
- **Google Cloud SQL**: SQLインスタンス → 接続名、パブリックIP、ユーザー名

## 5. データベースが存在しない場合

### 5.1 データベースの作成

MySQLに接続後：
```sql
-- データベースを作成
CREATE DATABASE medical_records 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 作成したデータベースを確認
SHOW DATABASES;
```

### 5.2 ユーザーと権限の設定（オプション）

```sql
-- 専用ユーザーを作成（推奨）
CREATE USER 'medical_user'@'localhost' IDENTIFIED BY 'password';

-- 権限を付与
GRANT ALL PRIVILEGES ON medical_records.* TO 'medical_user'@'localhost';
FLUSH PRIVILEGES;
```

この場合の`.env`設定：
```env
DATABASE_URL=mysql://medical_user:password@localhost:3306/medical_records
```

## 6. トラブルシューティング

### 6.1 接続できない場合

1. **MySQLサーバーが起動しているか確認**
   ```bash
   # macOS
   brew services list
   mysql.server status
   
   # Linux
   sudo systemctl status mysql
   ```

2. **ファイアウォールの確認**
   - リモート接続の場合、ポート3306が開放されているか確認

3. **ユーザー権限の確認**
   ```sql
   -- ユーザーが存在するか確認
   SELECT user, host FROM mysql.user;
   
   -- 権限を確認
   SHOW GRANTS FOR 'ユーザー名'@'ホスト名';
   ```

### 6.2 パスワードに特殊文字が含まれる場合

URLエンコードが必要です：
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`
- `:` → `%3A`

**例：**
```
パスワード: `p@ss#word`
DATABASE_URL=mysql://root:p%40ss%23word@localhost:3306/medical_records
```

## 7. 確認手順のまとめ

1. **MySQLがインストールされているか確認**
   ```bash
   mysql --version
   ```

2. **MySQLサーバーが起動しているか確認**
   ```bash
   # macOS
   brew services list | grep mysql
   ```

3. **接続テスト**
   ```bash
   mysql -u root -p
   ```

4. **データベースを作成（存在しない場合）**
   ```sql
   CREATE DATABASE medical_records CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. **`.env`ファイルに設定**
   ```env
   DATABASE_URL=mysql://root:あなたのパスワード@localhost:3306/medical_records
   ```

6. **接続確認**
   ```bash
   pnpm dev:admin  # 管理権限用（ポート3001）
   # または
   pnpm dev:doctor  # 医師権限用（ポート3002）
   ```
