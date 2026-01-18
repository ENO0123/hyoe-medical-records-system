import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Doctors() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, navigate] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  
  const { data: doctors, isLoading, refetch } = trpc.doctors.list.useQuery();
  const createMutation = trpc.doctors.create.useMutation();
  const updateMutation = trpc.doctors.update.useMutation();
  const deleteMutation = trpc.doctors.delete.useMutation();

  if (user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createMutation.mutateAsync({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        affiliation: formData.get("affiliation") as string || undefined,
        specialties: formData.get("specialties") as string || undefined,
        notes: formData.get("notes") as string || undefined,
      });
      
      toast.success("顧問医師を登録しました");
      setIsCreateOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "登録に失敗しました");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    
    const formData = new FormData(e.currentTarget);
    
    try {
      // doctorIdは変更不可のため送信しない
      await updateMutation.mutateAsync({
        id: selectedDoctor.id,
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        affiliation: formData.get("affiliation") as string || undefined,
        specialties: formData.get("specialties") as string || undefined,
        notes: formData.get("notes") as string || undefined,
      });
      
      toast.success("顧問医師情報を更新しました");
      setIsEditOpen(false);
      setSelectedDoctor(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "更新に失敗しました");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("本当に削除しますか?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("顧問医師を削除しました");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "削除に失敗しました");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">顧問医師一覧</h1>
            <p className="text-muted-foreground mt-2">顧問医師情報の閲覧と管理</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規顧問医師登録
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : doctors && doctors.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doctor) => (
              <Card 
                key={doctor.id} 
                className="card-elegant cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/doctors/${doctor.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <UserCog className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{doctor.name}</CardTitle>
                        <CardDescription className="text-xs">ID: {doctor.doctorId}</CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedDoctor(doctor); setIsEditOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(doctor.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">メール:</span> <span className="font-medium">{doctor.email}</span></div>
                  {doctor.affiliation && <div><span className="text-muted-foreground">所属:</span> <span>{doctor.affiliation}</span></div>}
                  {doctor.specialties && <div><span className="text-muted-foreground">専門:</span> <span>{doctor.specialties}</span></div>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">顧問医師が登録されていません</p>
            </CardContent>
          </Card>
        )}

        {/* 顧問医師登録ダイアログ */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>新規顧問医師登録</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">氏名 *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">メールアドレス *</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="affiliation">所属</Label>
                  <Input id="affiliation" name="affiliation" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="specialties">専門分野</Label>
                  <Input id="specialties" name="specialties" placeholder="例: 内科, 循環器科" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">備考</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "登録中..." : "登録"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 顧問医師編集ダイアログ */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle>顧問医師情報の編集</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-doctorId">医師ID</Label>
                  <Input id="edit-doctorId" defaultValue={selectedDoctor?.doctorId} readOnly disabled />
                  <p className="text-xs text-muted-foreground">医師IDは変更できません</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">氏名 *</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedDoctor?.name} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">メールアドレス *</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={selectedDoctor?.email} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-affiliation">所属</Label>
                  <Input id="edit-affiliation" name="affiliation" defaultValue={selectedDoctor?.affiliation || ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-specialties">専門分野</Label>
                  <Input id="edit-specialties" name="specialties" defaultValue={selectedDoctor?.specialties || ""} placeholder="例: 内科, 循環器科" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">備考</Label>
                  <Textarea id="edit-notes" name="notes" defaultValue={selectedDoctor?.notes || ""} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setSelectedDoctor(null); }}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "更新中..." : "更新"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
