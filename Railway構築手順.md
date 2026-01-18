# Railway構築手順 - 本番環境とテスト環境

## 目次
1. [概要](#概要)
2. [Railwayアカウントの準備](#railwayアカウントの準備)
3. [プロジェクトの準備](#プロジェクトの準備)
4. [本番環境の構築](#本番環境の構築)
5. [テスト環境の構築](#テスト環境の構築)
6. [データベースの設定](#データベースの設定)
7. [環境変数の設定](#環境変数の設定)
8. [デプロイと確認](#デプロイと確認)
9. [DB常時接続のコスト対策](#db常時接続のコスト対策)

---

## 概要

このドキュメントでは、電子カルテシステムをRailwayで本番環境とテスト環境にデプロイする手順を説明します。

### 前提条件
- Railwayアカウント（[railway.app](https://railway.app)）
- GitHubアカウント（コードリポジトリ）
- Node.js 18以上（ローカル開発用）

---

## Railwayアカウントの準備

1. **Railwayアカウントの作成**
   - [railway.app](https://railway.app)にアクセス
   - 「Start a New Project」をクリック
   - GitHubアカウントでログイン（推奨）

2. **Railway CLIのインストール（オプション）**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

---

## プロジェクトの準備

### 1. Railway設定ファイルの作成

プロジェクトルートに `railway.json` を作成：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. Dockerfileの作成（オプション：より細かい制御が必要な場合）

`Dockerfile` を作成：

```dockerfile
FROM node:20-alpine AS base

# pnpmのインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 本番用の依存関係のみインストール
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/public ./client/public

# ポートを公開
EXPOSE 3000

# アプリケーションを起動
CMD ["node", "dist/index.js"]
```

### 3. .dockerignoreの作成

```dockerignore
node_modules
dist
.git
.env
.env.local
.env.*.local
*.log
.DS_Store
coverage
.vscode
.idea
```

### 4. package.jsonの確認

`package.json` に以下が含まれていることを確認：

```json
{
  "scripts": {
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

---

## 本番環境の構築

### 1. Railwayプロジェクトの作成

1. Railwayダッシュボードで「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. リポジトリを選択
4. ブランチを選択（例：`main` または `production`）

### 2. サービス名の設定

- サービス名：`medical-records-production` など

### 3. データベースサービスの追加

1. 「+ New」→「Database」→「MySQL」を選択
2. サービス名：`mysql-production`
3. データベース名、ユーザー名、パスワードは自動生成される

### 4. 環境変数の設定

後述の「環境変数の設定」セクションを参照

---

## テスト環境の構築

### 1. 新しいプロジェクトまたはサービスとして作成

**方法A：同じプロジェクト内にサービスとして追加（推奨）**

1. 本番環境のプロジェクト内で「+ New」→「GitHub Repo」を選択
2. 同じリポジトリを選択
3. ブランチを選択（例：`develop` または `staging`）
4. サービス名：`medical-records-staging`

**方法B：別プロジェクトとして作成**

1. 「New Project」をクリック
2. リポジトリとブランチ（例：`develop`）を選択
3. プロジェクト名：`Medical Records - Staging`

### 2. テスト環境用データベースの追加

1. 「+ New」→「Database」→「MySQL」を選択
2. サービス名：`mysql-staging`

### 3. 環境変数の設定

テスト環境用の環境変数を設定（後述）

---

## データベースの設定

### 1. データベース接続情報の取得

Railwayダッシュボードで：
1. MySQLサービスを選択
2. 「Variables」タブで接続情報を確認：
   - `MYSQLDATABASE`：データベース名
   - `MYSQLUSER`：ユーザー名
   - `MYSQLPASSWORD`：パスワード
   - `MYSQLHOST`：ホスト名
   - `MYSQLPORT`：ポート番号（通常3306）

### 2. DATABASE_URLの構築

以下の形式で `DATABASE_URL` を構築：

```
mysql://ユーザー名:パスワード@ホスト名:ポート/データベース名
```

例：
```
mysql://root:abc123xyz@containers-us-west-123.railway.app:3306/railway
```

**注意：** パスワードに特殊文字が含まれる場合はURLエンコードが必要：
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

### 3. データベースの初期化

デプロイ後、以下のいずれかの方法でデータベースを初期化：

**方法A：Railway CLIを使用**

```bash
railway link  # プロジェクトをリンク
railway run pnpm db:setup
```

**方法B：RailwayのShell機能を使用**

1. Railwayダッシュボードでサービスを選択
2. 「Deployments」タブで最新のデプロイを選択
3. 「Shell」を開く
4. 以下を実行：
   ```bash
   pnpm db:setup
   ```

**方法C：マイグレーションのみ実行**

```bash
railway run pnpm db:push
```

### 4. 初期データの投入（オプション）

```bash
railway run pnpm seed:demo-data
```

---

## 環境変数の設定

### 本番環境の環境変数

Railwayダッシュボードで、アプリケーションサービス（本番環境）の「Variables」タブで以下を設定：

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NODE_ENV` | 環境 | `production` |
| `DATABASE_URL` | データベース接続URL | `mysql://...`（MySQLサービスから取得） |
| `PORT` | ポート番号 | `3000`（Railwayが自動設定する場合は不要） |
| `JWT_SECRET` | JWT署名用シークレット | ランダムな長い文字列（32文字以上推奨） |
| `VITE_APP_ID` | アプリケーションID | （Manus認証を使用する場合） |
| `OAUTH_SERVER_URL` | OAuthサーバーURL | （Manus認証を使用する場合） |
| `OWNER_OPEN_ID` | オーナーのOpenID | （管理者権限用） |
| `BUILT_IN_FORGE_API_URL` | Forge API URL | （Google Maps等を使用する場合） |
| `BUILT_IN_FORGE_API_KEY` | Forge API キー | （Google Maps等を使用する場合） |

### テスト環境の環境変数

テスト環境でも同様の環境変数を設定しますが、以下の点が異なります：

| 変数名 | 値 |
|--------|-----|
| `NODE_ENV` | `staging` または `development` |
| `DATABASE_URL` | テスト環境用MySQLの接続URL |

### 環境変数の設定方法

1. Railwayダッシュボードでサービスを選択
2. 「Variables」タブを開く
3. 「+ New Variable」をクリック
4. 変数名と値を入力
5. 「Add」をクリック

**注意：** 機密情報（パスワード、APIキー等）は必ず環境変数で管理し、コードに直接書かないでください。

---

## デプロイと確認

### 1. 初回デプロイ

1. GitHubにコードをプッシュ
2. Railwayが自動的にデプロイを開始
3. 「Deployments」タブでデプロイ状況を確認

### 2. デプロイの確認

デプロイが完了したら：

1. **ログの確認**
   - 「Deployments」タブで最新のデプロイを選択
   - 「View Logs」でログを確認
   - エラーがないか確認

2. **データベース接続の確認**
   - ログに `[Database] Successfully connected to MySQL` が表示されることを確認

3. **アプリケーションの動作確認**
   - 「Settings」タブで生成されたURLを確認
   - ブラウザでアクセスして動作確認

### 3. カスタムドメインの設定（オプション）

1. 「Settings」タブの「Domains」セクション
2. 「Generate Domain」をクリック
3. または「Custom Domain」で独自ドメインを設定

---

## DB常時接続のコスト対策

RailwayのMySQLサービスは常時接続でコストがかかります。以下の対策を検討してください。

### 対策1：外部データベースサービスの利用（推奨）

RailwayのMySQLの代わりに、よりコスト効率の良い外部サービスを使用：

#### A. PlanetScale（推奨）
- **特徴**：サーバーレスMySQL、自動スケーリング
- **コスト**：無料プランあり、従量課金
- **接続**：ブランチ機能で本番/テスト環境を分離可能
- **設定方法**：
  1. [PlanetScale](https://planetscale.com)でアカウント作成
  2. データベースを作成
  3. 接続文字列を取得
  4. Railwayの環境変数 `DATABASE_URL` に設定

#### B. Supabase
- **特徴**：PostgreSQLベース（MySQLから移行が必要）
- **コスト**：無料プランあり
- **メリット**：リアルタイム機能、認証機能内蔵

#### C. AWS RDS / Google Cloud SQL
- **特徴**：エンタープライズ向け
- **コスト**：従量課金、より細かい制御が可能
- **メリット**：高可用性、バックアップ機能

#### D. Render PostgreSQL
- **特徴**：PostgreSQL、無料プランあり
- **コスト**：無料プランあり（90日間無料、その後スリープ）

### 対策2：コネクションプーリングの最適化

現在のコード（`server/db.ts`）を最適化：

```typescript
// server/db.ts の改善例
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let _db: ReturnType<typeof drizzle> | null = null;
let _connectionPool: mysql.Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // コネクションプールを作成
      const connection = mysql.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 5, // 最大接続数を制限
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      _connectionPool = connection;
      _db = drizzle(connection);
      
      // 接続テスト
      await _db.execute(sql`SELECT 1`);
      console.log("[Database] Successfully connected to MySQL with connection pool");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _connectionPool = null;
    }
  }
  return _db;
}

// アプリケーション終了時にプールを閉じる
process.on('SIGTERM', async () => {
  if (_connectionPool) {
    await _connectionPool.end();
    console.log("[Database] Connection pool closed");
  }
});
```

### 対策3：接続タイムアウトの設定

データベース接続にタイムアウトを設定：

```typescript
const connection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 5,
  connectTimeout: 10000, // 10秒でタイムアウト
  acquireTimeout: 10000,
  timeout: 10000,
});
```

### 対策4：Railwayのスリープ機能の活用

**注意：** Railwayの無料プランでは、一定時間アクセスがないとサービスがスリープします。データベースもスリープするため、初回アクセス時に接続が遅くなる可能性があります。

**対策：**
- 定期的なヘルスチェックエンドポイントを実装
- 外部の監視サービス（UptimeRobot等）で定期的にアクセス

### 対策5：接続のオンデマンド化（非推奨）

接続を必要時のみ確立する方法もありますが、パフォーマンスが低下するため推奨しません。

### 対策6：コスト比較

| サービス | 無料プラン | 月額コスト（概算） | 特徴 |
|---------|-----------|------------------|------|
| Railway MySQL | なし | $5/月〜 | 簡単、統合性が高い |
| PlanetScale | あり | $0〜（従量課金） | サーバーレス、スケーラブル |
| Supabase | あり | $0〜 | PostgreSQL、機能豊富 |
| Render PostgreSQL | あり（90日） | $0〜$7/月 | シンプル、スリープあり |
| AWS RDS | なし | $15/月〜 | エンタープライズ向け |

### 推奨アプローチ

1. **開発・テスト環境**：PlanetScaleの無料プランまたはRender PostgreSQL
2. **本番環境**：PlanetScaleの有料プラン（使用量に応じて）またはAWS RDS

---

## トラブルシューティング

### デプロイが失敗する場合

1. **ログを確認**
   - Railwayダッシュボードの「Deployments」→「View Logs」

2. **ビルドエラーの確認**
   - `package.json` の `build` スクリプトが正しいか確認
   - 依存関係が正しくインストールされているか確認

3. **環境変数の確認**
   - 必要な環境変数がすべて設定されているか確認
   - `DATABASE_URL` の形式が正しいか確認

### データベース接続エラー

1. **接続情報の確認**
   - `DATABASE_URL` が正しいか確認
   - パスワードに特殊文字が含まれる場合はURLエンコードされているか確認

2. **ネットワーク設定の確認**
   - RailwayのMySQLサービスが同じプロジェクト内にあるか確認
   - 外部データベースを使用する場合、RailwayのIPアドレスが許可されているか確認

### アプリケーションが起動しない

1. **ポートの確認**
   - `PORT` 環境変数が設定されているか確認
   - Railwayは自動的に `PORT` 環境変数を設定するため、コードで `process.env.PORT` を使用しているか確認

2. **起動コマンドの確認**
   - `package.json` の `start` スクリプトが正しいか確認

---

## 次のステップ

1. **CI/CDの設定**
   - GitHub Actionsで自動デプロイを設定
   - テスト環境への自動デプロイ、本番環境への手動承認フロー

2. **監視の設定**
   - Railwayのメトリクスでリソース使用状況を監視
   - エラーログの監視

3. **バックアップの設定**
   - データベースの定期バックアップ
   - Railwayのバックアップ機能または外部サービスを利用

4. **セキュリティの強化**
   - HTTPSの有効化（Railwayで自動）
   - 環境変数の暗号化
   - アクセスログの監視

---

## 参考リンク

- [Railway Documentation](https://docs.railway.app)
- [PlanetScale Documentation](https://planetscale.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [MySQL Connection Pooling](https://github.com/sidorares/node-mysql2#using-connection-pools)
