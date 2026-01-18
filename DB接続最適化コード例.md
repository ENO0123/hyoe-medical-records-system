# DB接続最適化コード例

このドキュメントでは、RailwayでのDB常時接続コストを削減するためのコード最適化例を提供します。

## 現在の実装

現在の `server/db.ts` は、`drizzle(process.env.DATABASE_URL)` で直接接続文字列を渡しています。これは動作しますが、コネクションプールの設定を制御できません。

## 最適化案1：明示的なコネクションプールの使用

`server/db.ts` を以下のように変更することで、接続数を制限し、コストを削減できます。

### 実装例

```typescript
// server/db.ts
import { eq, and, gte, lte, desc, asc, sql, or, notInArray, coalesce } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  InsertUser, users, 
  doctors, InsertDoctor,
  patients, InsertPatient,
  testItems, InsertTestItem,
  visits, InsertVisit,
  testResults, InsertTestResult,
  medications, InsertMedication,
  testResultImages, InsertTestResultImage,
  type Doctor,
  type Patient,
  type TestItem,
  type Medication
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _connectionPool: mysql.Pool | null = null;
let _connectionTested = false;

/**
 * データベース接続を取得（コネクションプール使用）
 */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // コネクションプールを作成
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        // 接続数の制限（コスト削減のため）
        connectionLimit: 5, // 最大5接続まで
        queueLimit: 0, // キュー制限なし（必要に応じて調整）
        
        // 接続の維持設定
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        
        // タイムアウト設定
        connectTimeout: 10000, // 10秒で接続タイムアウト
        acquireTimeout: 10000, // 10秒で取得タイムアウト
        timeout: 10000, // 10秒でクエリタイムアウト
        
        // 接続の再利用
        waitForConnections: true,
        
        // アイドル接続の最大時間（ミリ秒）
        // 30分アイドル状態が続いた接続は閉じる
        idleTimeout: 30 * 60 * 1000,
      });

      _connectionPool = pool;
      
      // Drizzle ORMにプールを渡す
      _db = drizzle(pool);
      
      // 接続テストを実行（初回のみ）
      if (!_connectionTested) {
        _connectionTested = true;
        await _db.execute(sql`SELECT 1`);
        console.log("[Database] Successfully connected to MySQL with connection pool");
        console.log("[Database] Connection pool settings:", {
          connectionLimit: 5,
          idleTimeout: "30 minutes"
        });
      }
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      if (error instanceof Error) {
        console.error("[Database] Error message:", error.message);
        console.error("[Database] Error stack:", error.stack);
      }
      _db = null;
      _connectionPool = null;
      _connectionTested = false;
    }
  } else if (!process.env.DATABASE_URL) {
    console.warn("[Database] DATABASE_URL is not set");
  }
  return _db;
}

/**
 * 接続プールの状態を取得（デバッグ用）
 */
export async function getPoolStats() {
  if (!_connectionPool) {
    return null;
  }
  
  return {
    totalConnections: _connectionPool.pool._allConnections?.length || 0,
    freeConnections: _connectionPool.pool._freeConnections?.length || 0,
    queueLength: _connectionPool.pool._connectionQueue?.length || 0,
  };
}

/**
 * 接続プールを閉じる（アプリケーション終了時）
 */
export async function closeDb() {
  if (_connectionPool) {
    await _connectionPool.end();
    console.log("[Database] Connection pool closed");
    _connectionPool = null;
    _db = null;
    _connectionTested = false;
  }
}

// アプリケーション終了時にプールを閉じる
process.on('SIGTERM', async () => {
  await closeDb();
});

process.on('SIGINT', async () => {
  await closeDb();
  process.exit(0);
});

// 既存の関数はそのまま使用可能
// ... (既存のコード)
```

### 変更点の説明

1. **`mysql2/promise` のインポート**
   - 明示的なコネクションプールを作成するために必要

2. **`connectionLimit: 5`**
   - 最大接続数を5に制限（デフォルトは10）
   - これにより、同時接続数が制限され、コストが削減されます

3. **`idleTimeout: 30 * 60 * 1000`**
   - 30分間アイドル状態の接続を自動的に閉じる
   - 不要な接続を維持しないことでコストを削減

4. **タイムアウト設定**
   - 接続、取得、クエリのタイムアウトを10秒に設定
   - 長時間待機する接続を防ぐ

5. **`closeDb()` 関数**
   - アプリケーション終了時にプールを適切に閉じる
   - リソースのクリーンアップ

## 最適化案2：環境変数による設定

接続数の制限を環境変数で制御できるようにする：

```typescript
// server/db.ts の getDb() 関数内
const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || "5", 10);
const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT_MS || String(30 * 60 * 1000), 10);

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: connectionLimit,
  idleTimeout: idleTimeout,
  // ... その他の設定
});
```

環境変数の設定例（Railway）：
- `DB_CONNECTION_LIMIT=3`（テスト環境ではさらに少なく）
- `DB_IDLE_TIMEOUT_MS=1800000`（30分）

## 最適化案3：接続の監視とログ

接続プールの使用状況を監視：

```typescript
// 定期的にプールの状態をログ出力（開発環境のみ）
if (ENV.isProduction === false) {
  setInterval(async () => {
    const stats = await getPoolStats();
    if (stats) {
      console.log("[Database] Pool stats:", stats);
    }
  }, 60000); // 1分ごと
}
```

## 最適化案4：PlanetScaleなどの外部サービスへの移行

PlanetScaleを使用する場合、接続文字列の形式が異なります：

```typescript
// PlanetScaleの場合
// DATABASE_URL の形式: mysql://ユーザー名:パスワード@ホスト:ポート/データベース名?sslaccept=strict

// 既存のコードはそのまま動作しますが、PlanetScaleの特性に合わせて設定を調整
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 1, // PlanetScaleはサーバーレスなので1接続で十分
  ssl: {
    rejectUnauthorized: true,
  },
  // ... その他の設定
});
```

## パフォーマンステスト

最適化後、以下のコマンドで接続数を確認：

```bash
# RailwayのShellで実行
railway run node -e "
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 5,
});
setInterval(async () => {
  const stats = {
    total: pool.pool._allConnections?.length || 0,
    free: pool.pool._freeConnections?.length || 0,
  };
  console.log('Pool stats:', stats);
}, 5000);
"
```

## 注意事項

1. **接続数の削減による影響**
   - 接続数を減らしすぎると、同時リクエストが多い場合にパフォーマンスが低下する可能性があります
   - アプリケーションの負荷に応じて調整してください

2. **Railwayの制限**
   - Railwayの無料プランでは、一定時間アクセスがないとサービスがスリープします
   - データベースもスリープするため、初回アクセス時に接続が遅くなる可能性があります

3. **外部データベースサービスの検討**
   - コストを大幅に削減したい場合は、PlanetScaleなどの外部サービスへの移行を検討してください

## 実装手順

1. `package.json` に `mysql2` が含まれていることを確認（既に含まれているはず）

2. `server/db.ts` を上記の最適化コードに置き換え

3. 環境変数を設定（オプション）：
   - `DB_CONNECTION_LIMIT=5`
   - `DB_IDLE_TIMEOUT_MS=1800000`

4. ローカルでテスト：
   ```bash
   pnpm dev
   ```

5. Railwayにデプロイして動作確認

## 参考

- [mysql2 Connection Pooling](https://github.com/sidorares/node-mysql2#using-connection-pools)
- [Drizzle ORM MySQL2](https://orm.drizzle.team/docs/get-started-mysql)
- [Railway Database Best Practices](https://docs.railway.app/databases/postgresql)
