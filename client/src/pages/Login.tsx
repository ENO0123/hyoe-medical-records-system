import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Key } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = trpc.auth.login.useMutation();

  // 既にログインしている場合はリダイレクト（useEffectで遅延実行）
  useEffect(() => {
    if (user && !loading) {
      // ログアウト直後の可能性があるため、少し遅延させて再チェック
      const timer = setTimeout(() => {
        // 再度userをチェック（ログアウト直後はnullになっている可能性がある）
        if (user) {
          navigate("/");
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  // ローディング中は何も表示しない
  if (loading) {
    return null;
  }

  // 既にログインしている場合は何も表示しない（useEffectでリダイレクトされる）
  if (user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const result = await loginMutation.mutateAsync({
        loginId,
        password,
      });
      
      if (result.success) {
        toast.success("ログインしました");
        // セッションクッキーが確実に設定されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 200));
        // ページを完全にリロードして、確実に認証状態を更新
        window.location.href = "/";
      }
    } catch (error: any) {
      toast.error(error.message || "ログインに失敗しました");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Key className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">医師ログイン</CardTitle>
          <CardDescription className="text-center">
            ログインIDとパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginId">ログインID</Label>
              <Input
                id="loginId"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="ログインIDを入力"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
