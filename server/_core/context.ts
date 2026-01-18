import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import * as db from "../db";
import { ENV } from "./env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// この関数は使用されていません（自動ログイン機能を無効化したため）
// 将来の参考のために残しています

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // セッションクッキーがある場合のみ認証を試みる（自動ログイン機能は完全に無効化）
  try {
    user = await sdk.authenticateRequest(opts.req);
    if (user) {
      console.log(`[Context] 認証成功: ${user.openId} (role: ${user.role})`);
    }
  } catch (error) {
    // 認証が失敗した場合はnullを返す（ログアウト状態）
    // エラーログは本番環境でのみ出力（開発環境では頻繁に発生するため）
    if (ENV.isProduction) {
      console.log(`[Context] 認証失敗: ${error instanceof Error ? error.message : String(error)}`);
    }
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
