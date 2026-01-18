import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, UserCog, Users, Key } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

function calculateAge(birthDate: Date): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function DoctorDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const doctorId = Number(params.id);
  const { user } = useAuth();
  const [isLoginSettingsOpen, setIsLoginSettingsOpen] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const { data: doctor, isLoading: doctorLoading, refetch: refetchDoctor } = trpc.doctors.get.useQuery({ id: doctorId });
  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery();
  const updateMutation = trpc.doctors.update.useMutation();

  // この医師の担当患者をフィルタリング
  const doctorPatients = patients?.filter(p => p.patient.doctorId === doctorId) || [];

  const handleSaveLoginSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      await updateMutation.mutateAsync({
        id: doctorId,
        loginId: loginId || undefined,
        password: password || undefined,
      });
      
      toast.success("ログイン情報を設定しました");
      setIsLoginSettingsOpen(false);
      setLoginId("");
      setPassword("");
      refetchDoctor();
    } catch (error: any) {
      toast.error(error.message || "設定に失敗しました");
    }
  };

  const isAdmin = user?.role === "admin";

  if (doctorLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!doctor) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">顧問医師が見つかりません</p>
          <Button className="mt-4" onClick={() => navigate("/doctors")}>
            <ArrowLeft className="mr-2 h-4 w-4" />顧問医師一覧に戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/doctors")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">顧問医師詳細</h1>
              <p className="text-muted-foreground mt-2">{doctor.name} ({doctor.doctorId})</p>
            </div>
          </div>
        </div>

        <Card className="card-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <UserCog className="h-5 w-5" />
                <span>基本情報</span>
              </CardTitle>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoginId(doctor.loginId || "");
                    setIsLoginSettingsOpen(true);
                  }}
                >
                  <Key className="mr-2 h-4 w-4" />
                  ログイン情報設定
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">医師ID</p>
              <p className="font-mono font-medium">{doctor.doctorId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">氏名</p>
              <p className="font-medium">{doctor.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">メールアドレス</p>
              <p>{doctor.email}</p>
            </div>
            {doctor.loginId && (
              <div>
                <p className="text-sm text-muted-foreground">ログインID</p>
                <p className="font-mono font-medium">{doctor.loginId}</p>
              </div>
            )}
            {doctor.affiliation && (
              <div>
                <p className="text-sm text-muted-foreground">所属</p>
                <p>{doctor.affiliation}</p>
              </div>
            )}
            {doctor.specialties && (
              <div>
                <p className="text-sm text-muted-foreground">専門分野</p>
                <p>{doctor.specialties}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ログイン情報設定ダイアログ */}
        {isAdmin && (
          <Dialog open={isLoginSettingsOpen} onOpenChange={setIsLoginSettingsOpen}>
            <DialogContent className="max-w-md">
              <form onSubmit={handleSaveLoginSettings}>
                <DialogHeader>
                  <DialogTitle>ログイン情報設定</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="loginId">ログインID</Label>
                    <Input
                      id="loginId"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder="医師がログインに使用するID"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">パスワード</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="新しいパスワード（変更しない場合は空欄）"
                    />
                    <p className="text-xs text-muted-foreground">
                      パスワードを変更する場合のみ入力してください
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsLoginSettingsOpen(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "設定中..." : "設定"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        <Card className="card-elegant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>担当患者一覧</span>
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({doctorPatients.length}名)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : doctorPatients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>患者ID</th>
                      <th>氏名</th>
                      <th>性別</th>
                      <th>年齢</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorPatients.map((p) => (
                      <tr 
                        key={p.patient.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/patients/${p.patient.id}`)}
                      >
                        <td className="font-mono">{p.patient.patientId}</td>
                        <td className="font-medium">{p.patient.name}</td>
                        <td>{p.patient.gender}</td>
                        <td>{calculateAge(new Date(p.patient.birthDate))}歳</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">担当患者が登録されていません</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

