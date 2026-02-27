import { motion } from "framer-motion";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface TestResult {
  id: number;
  prompt: string;
  date: string;
  results: Record<string, boolean>;
}

export default function PromptTesterPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<TestResult[]>([]);
  const { data: brand } = useBrandSettings();

  const brandName = brand?.brand_name || "Sua Marca";

  const handleTest = async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("simulate-ai", {
        body: { prompt: query, brandName, mode: "tester" },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const resultsMap: Record<string, boolean> = {};
      data.results.forEach((r: { model: string; mentioned: boolean }) => {
        resultsMap[r.model] = r.mentioned;
      });

      setHistory((prev) => [
        {
          id: Date.now(),
          prompt: query,
          date: new Date().toISOString().slice(0, 10),
          results: resultsMap,
        },
        ...prev,
      ]);
      setQuery("");
    } catch (e: any) {
      console.error("Prompt tester error:", e);
      toast({ title: "Erro ao testar", description: e.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center">Prompt Tester <InfoTooltip text="Teste rapidamente qualquer pergunta e descubra em quais IAs sua marca aparece. Use para validar estratégias de conteúdo e garantir que você está presente onde importa." /></h1>
        <p className="text-muted-foreground mt-1">Teste rapidamente se sua marca aparece em respostas de IA.</p>
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <div className="flex gap-2">
            <Input
              placeholder="Digite um prompt para testar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleTest()}
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={loading || !query.trim()} className="bg-primary text-primary-foreground">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {loading ? "Testando..." : "Testar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-4">Histórico de Testes</p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum teste realizado ainda. Digite um prompt acima para começar.</p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm font-medium text-foreground">"{h.prompt}"</p>
                  <p className="text-xs text-muted-foreground mt-1">{h.date}</p>
                  <div className="flex gap-2 mt-2">
                    {Object.entries(h.results).map(([model, found]) => (
                      <Badge key={model} variant="outline" className={`text-[10px] gap-1 ${found ? "border-emerald-200 text-emerald-700" : "border-border text-muted-foreground"}`}>
                        {found ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
