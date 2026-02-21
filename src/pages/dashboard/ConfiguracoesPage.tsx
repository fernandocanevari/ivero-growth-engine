import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua marca e preferências.</p>
      </motion.div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Dados da Marca</h2>
          <div><Label>Nome da Marca</Label><Input defaultValue="TechNova" className="mt-1" /></div>
          <div><Label>Website</Label><Input defaultValue="https://technova.com.br" className="mt-1" /></div>
          <div><Label>Setor</Label><Input defaultValue="Marketing & Tecnologia" className="mt-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Concorrentes Monitorados</h2>
          <div><Label>Concorrente Principal</Label><Input defaultValue="DigiPrime" className="mt-1" /></div>
          <div><Label>Outros Concorrentes</Label><Input placeholder="Separados por vírgula..." className="mt-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Notificações</h2>
          <p className="text-sm text-muted-foreground">Configurações de alertas e relatórios por email.</p>
          <Separator />
          <p className="text-xs text-muted-foreground">Em breve — configurações de notificação serão adicionadas aqui.</p>
        </CardContent>
      </Card>

      <Button className="bg-primary text-primary-foreground">Salvar Alterações</Button>
    </div>
  );
}
