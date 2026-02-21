import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreateCampaign } from "@/hooks/useCampaigns";

export default function NovaCampanhaPage() {
  const navigate = useNavigate();
  const createMutation = useCreateCampaign();

  const [form, setForm] = useState({
    name: "",
    objective: "",
    start_date: "",
    end_date: "",
    keywords: "",
  });

  const handleSubmit = () => {
    if (!form.name) return;
    createMutation.mutate(
      {
        name: form.name,
        objective: form.objective,
        status: "draft",
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        keywords: form.keywords,
      },
      { onSuccess: () => navigate("/dashboard/campanhas") }
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/campanhas")} className="mb-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold font-display text-foreground">Nova Campanha</h1>
        <p className="text-muted-foreground mt-1">Configure uma nova campanha de monitoramento.</p>
      </motion.div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div><Label>Nome da Campanha</Label><Input placeholder="Ex: Lançamento Q2 2026" className="mt-1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div><Label>Objetivo</Label><Textarea placeholder="Descreva o objetivo da campanha..." className="mt-1" value={form.objective} onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Data Início</Label><Input type="date" className="mt-1" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
            <div><Label>Data Fim</Label><Input type="date" className="mt-1" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
          </div>
          <div><Label>Palavras-chave</Label><Input placeholder="marketing, automação, IA..." className="mt-1" value={form.keywords} onChange={(e) => setForm((p) => ({ ...p, keywords: e.target.value }))} /></div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-primary text-primary-foreground">
              {createMutation.isPending ? "Criando..." : "Criar Campanha"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard/campanhas")}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
