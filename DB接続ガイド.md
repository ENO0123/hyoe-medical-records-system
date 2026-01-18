# MySQL接続ガイド

## 1. 確認すべきポイント

### 1.1 環境変数の設定（.envファイル）

プロジェクトルートに `.env` ファイルを作成し、以下の形式で `DATABASE_URL` を設定してください：

```env
DATABASE_URL=mysql://ユーザー名:パスワード@ホスト:ポート/データベース名
```

**例：**
```env
# ローカルMySQLの場合
DATABASE_URL=mysql://root:password@localhost:3306/medical_records

# リモートMySQLの場合
DATABASE_URL=mysql://user:pass@example.com:3306/medical_records_db
```

### 1.2 データベースの作成

MySQLに接続して、データベースを作成してください：

```sql
CREATE DATABASE medical_records CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 1.3 接続確認

以下のコマンドで接続を確認できます：

```bash
# 環境変数を設定して接続テスト
mysql -h ホスト名 -u ユーザー名 -p データベース名
```

## 2. マイグレーションの実行

データベース接続が確認できたら、スキーマを適用します：

```bash
# マイグレーションファイルの生成と適用
pnpm db:push
```

このコマンドは以下を実行します：
- `drizzle-kit generate` - スキーマからマイグレーションファイルを生成
- `drizzle-kit migrate` - マイグレーションをデータベースに適用

## 3. 開発環境の起動

### 3.1 ダミーデータ環境（ポート3000）

```bash
pnpm dev
```

この環境では、`DATABASE_URL` が設定されていなくてもダミーデータで動作します。

### 3.2 管理権限用環境（ポート3001）

```bash
pnpm dev:admin
```

この環境では、`DATABASE_URL` が必須です。設定されていない場合は接続エラーになります。また、自動的に管理者としてログインされます。

### 3.3 医師権限用環境（ポート3002）

```bash
pnpm dev:doctor
```

この環境では、`DATABASE_URL` が必須です。設定されていない場合は接続エラーになります。また、自動的に医師としてログインされます。

## 4. データベース構造の確認

スキーマ定義は以下のファイルで確認できます：
- `drizzle/schema.ts` - テーブル定義
- `drizzle/0000_lonely_silvermane.sql` など - マイグレーションファイル

主要なテーブル：
- `users` - ユーザー情報
- `doctors` - 顧問医師マスタ
- `patients` - 患者マスタ
- `testItems` - 検査項目マスタ
- `visits` - 受診記録
- `testResults` - 検査結果
- `medications` - 薬歴
- `testResultImages` - 検査結果画像

## 5. トラブルシューティング

### 接続エラーが発生する場合

1. **DATABASE_URLの形式を確認**
   - 正しい形式: `mysql://ユーザー名:パスワード@ホスト:ポート/データベース名`
   - パスワードに特殊文字が含まれる場合はURLエンコードが必要

2. **MySQLサーバーが起動しているか確認**
   ```bash
   # macOSの場合
   brew services list
   # または
   mysql.server status
   ```

3. **データベースが存在するか確認**
   ```sql
   SHOW DATABASES;
   ```

4. **ユーザー権限を確認**
   ```sql
   SHOW GRANTS FOR 'ユーザー名'@'ホスト';
   ```

### マイグレーションエラーが発生する場合

1. 既存のテーブルがある場合は、先に削除するか、別のデータベースを使用
2. マイグレーションファイルを確認: `drizzle/` ディレクトリ内の `.sql` ファイル

## 6. シードデータの投入（オプション）

テストデータを投入する場合：

```bash
# デモデータの投入
pnpm seed:demo-data

# 検査結果データの投入
pnpm seed:test-results
```

**注意**: シードデータを投入する前に、患者データが存在する必要があります。
