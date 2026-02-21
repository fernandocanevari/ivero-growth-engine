import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle2, XCircle } from "lucide-react";
import { simulatorResponses, brandName } from "@/lib/mock-data";
import { useState } from "react";

const defaultPrompt = Object.keys(simulatorResponses)[0] as keyof typeof simulatorResponses;

export default function SimuladorPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof simulatorResponses[typeof defaultPrompt] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setResults(simulatorResponses[defaultPrompt]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Simulador de Influência em IA</h1>
        <p className="text-muted-foreground mt-1">Teste como os modelos de IA respondem sobre sua marca.</p>
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <div className="flex gap-2">
            <Input
              placeholder="Digite uma pergunta, ex: Qual a melhor ferramenta de marketing?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()} className="bg-primary text-primary-foreground">
              <Send className="h-4 w-4 mr-2" /> {loading ? "Buscando..." : "Simular"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((r) => (
            <Card key={r.model} className={r.mentionsBrand ? "border-l-4 border-l-emerald-500" : ""}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-base font-semibold text-foreground">{r.model}</p>
                  {r.mentionsBrand ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Menciona {brandName}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      <XCircle className="h-3 w-3 mr-1" /> Não menciona
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">"{r.response}"</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {!results && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Digite uma pergunta para ver como as IAs respondem</p>
          <p className="text-sm mt-1">Descubra se sua marca está sendo recomendada</p>
        </div>
      )}
    </div>
  );
}
