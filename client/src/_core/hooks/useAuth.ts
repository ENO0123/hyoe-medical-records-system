import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        // 既にログアウト済みの場合は続行
      } else {
        console.error("Logout error:", error);
      }
    } finally {
      // ローカルストレージをクリア
      localStorage.removeItem("manus-runtime-user-info");
      // すべてのキャッシュをクリア
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      // すべてのクエリキャッシュをクリア
      await utils.invalidate();
      // ページを完全にリロードしてログイン画面に移動（確実に状態をリセット）
      if (typeof window !== "undefined") {
        // クッキーも明示的に削除（複数の方法で試行）
        const cookieName = "app_session_id";
        const logoutFlagName = "logout_flag";
        const paths = ["/", window.location.pathname];
        const sameSiteOptions = ["None", "Lax", "Strict"];
        const secureOptions = [true, false];
        
        // すべての組み合わせでセッションクッキーを削除
        paths.forEach(path => {
          sameSiteOptions.forEach(sameSite => {
            secureOptions.forEach(secure => {
              const secureFlag = secure ? "; Secure" : "";
              document.cookie = `${cookieName}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=${sameSite}${secureFlag}`;
            });
          });
        });
        
        // ログアウトフラグを設定（開発環境での自動ログインを防ぐ）
        paths.forEach(path => {
          sameSiteOptions.forEach(sameSite => {
            secureOptions.forEach(secure => {
              const secureFlag = secure ? "; Secure" : "";
              const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString(); // 24時間後
              document.cookie = `${logoutFlagName}=true; path=${path}; expires=${expires}; SameSite=${sameSite}${secureFlag}`;
            });
          });
        });
        
        // 少し待ってからページをリロード（クッキー削除を確実に）
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
