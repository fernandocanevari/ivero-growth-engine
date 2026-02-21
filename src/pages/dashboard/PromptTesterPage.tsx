import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle2, XCircle } from "lucide-react";
import { promptTesterHistory, brandName } from "@/lib/mock-data";
import { useState } from "react";

export default function PromptTesterPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Prompt Tester</h1>
        <p className="text-muted-foreground mt-1">Teste rapidamente se sua marca aparece em respostas de IA.</p>
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <div className="flex gap-2">
            <Input placeholder="Digite um prompt para testar..." value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1" />
            <Button className="bg-primary text-primary-foreground"><Send className="h-4 w-4 mr-2" /> Testar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-4">Histórico de Testes</p>
          <div className="space-y-3">
            {promptTesterHistory.map((h) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
