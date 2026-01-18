import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, Users, UserCog, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

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

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 認証状態が確定してからクエリを実行
  const { data: patients, isLoading, refetch: refetchPatients } = trpc.patients.list.useQuery(
    {
      searchQuery: searchQuery || undefined,
    },
    {
      enabled: !authLoading && !!user, // 認証が完了し、ユーザーが存在する場合のみ実行
    }
  );
  const { data: doctors } = trpc.doctors.list.useQuery(undefined, {
    enabled: !authLoading && !!user && user.role === "admin", // 管理者のみ実行
  });
  
  const createPatientMutation = trpc.patients.create.useMutation();

  const handleCreatePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createPatientMutation.mutateAsync({
        name: formData.get("name") as string,
        gender: formData.get("gender") as "男" | "女" | "その他",
        birthDate: formData.get("birthDate") as string,
        doctorId: Number(formData.get("advisorId")),
        email: formData.get("email") as string || undefined,
        phone: formData.get("phone") as string || undefined,
        address: formData.get("address") as string || undefined,
      });
      toast.success("患者を登録しました");
      setIsPatientDialogOpen(false);
      refetchPatients();
    } catch (error: any) {
      toast.error(error.message || "登録に失敗しました");
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">電子カルテシステム</h1>
            <p className="text-muted-foreground mt-2">患者情報と検査結果の管理</p>
          </div>
          <div className="flex gap-3">
            {user?.role === "admin" && (
              <Link href="/doctors">
                <Button variant="outline">
                  <UserCog className="mr-2 h-4 w-4" />
                  顧問医師管理
                </Button>
              </Link>
            )}
            {user?.role === "admin" && (
              <Button onClick={() => setIsPatientDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新規患者登録
              </Button>
            )}
          </div>
        </div>

        {/* 患者一覧 */}
        <Card className="card-elegant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">患者一覧</h2>
              <div className="w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="患者名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : patients && patients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table-elegant">
                  <thead>
                    <tr>
                      <th>患者ID</th>
                      <th>氏名</th>
                      <th>性別</th>
                      <th>年齢</th>
                      <th>顧問医師</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => (
                      <tr 
                        key={p.patient.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/patients/${p.patient.id}`)}
                      >
                        <td className="font-mono">{p.patient.patientId}</td>
                        <td className="font-medium">{p.patient.name}</td>
                        <td>{p.patient.gender}</td>
                        <td>{calculateAge(new Date(p.patient.birthDate))}歳</td>
                        <td>{p.doctor?.name || "-"}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Link href={`/patients/${p.patient.id}`}>
                            <Button variant="ghost" size="sm">詳細</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">患者が登録されていません</p>
                {user?.role === "admin" && (
                  <Button className="mt-4" onClick={() => setIsPatientDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />最初の患者を登録
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 患者登録ダイアログ */}
        <Dialog open={isPatientDialogOpen} onOpenChange={setIsPatientDialogOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreatePatient}>
              <DialogHeader>
                <DialogTitle>新規患者登録</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">氏名 *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="gender">性別 *</Label>
                    <Select name="gender" required>
                      <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="男">男性</SelectItem>
                        <SelectItem value="女">女性</SelectItem>
                        <SelectItem value="その他">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">生年月日 *</Label>
                    <Input id="birthDate" name="birthDate" type="date" required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="doctorId">顧問医師 *</Label>
                  <Select name="advisorId" required>
                    <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                    <SelectContent>
                      {doctors?.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id.toString()}>{doc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">電話番号</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">住所</Label>
                  <Input id="address" name="address" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPatientDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={createPatientMutation.isPending}>
                  {createPatientMutation.isPending ? "登録中..." : "登録"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
