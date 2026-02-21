import { useUserRole } from "@/hooks/useUserRole";
import { ShieldAlert, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSectionNegocio } from "@/components/admin/AdminSectionNegocio";
import { AdminSectionProduto } from "@/components/admin/AdminSectionProduto";
import { AdminSectionEstrategica } from "@/components/admin/AdminSectionEstrategica";
import { AdminSectionRisco } from "@/components/admin/AdminSectionRisco";

export default function AdminDashboardPage() {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground text-sm">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Visão completa do negócio — dados mock</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="negocio" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="negocio">💰 Negócio</TabsTrigger>
          <TabsTrigger value="produto">🧠 Produto</TabsTrigger>
          <TabsTrigger value="estrategica">🔥 Estratégicas</TabsTrigger>
          <TabsTrigger value="risco">🚨 Risco</TabsTrigger>
        </TabsList>

        <TabsContent value="negocio" className="mt-6">
          <AdminSectionNegocio />
        </TabsContent>
        <TabsContent value="produto" className="mt-6">
          <AdminSectionProduto />
        </TabsContent>
        <TabsContent value="estrategica" className="mt-6">
          <AdminSectionEstrategica />
        </TabsContent>
        <TabsContent value="risco" className="mt-6">
          <AdminSectionRisco />
        </TabsContent>
      </Tabs>
    </div>
  );
}
