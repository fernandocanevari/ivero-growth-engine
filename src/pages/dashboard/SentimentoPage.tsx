import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { sentimentData } from "@/lib/mock-data";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";

const sentimentColor = { positive: "bg-emerald-100 text-emerald-700", neutral: "bg-amber-100 text-amber-700", negative: "bg-red-100 text-red-600" };
const sentimentLabel = { positive: "Positivo", neutral: "Neutro", negative: "Negativo" };

export default function SentimentoPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const hasBrand = !!settings?.brand_name;
  const hasData = false;

  if (isLoading) return null;

  if (!hasData) {
    return (
      <EmptyStatePage
        icon={<Search className="h-12 w-12" />}
        title="Análise de Sentimento"
        subtitle="Como as IAs falam sobre sua marca — tom positivo, neutro ou negativo."
        message="Nenhum dado de sentimento disponível ainda"
        hasBrand={hasBrand}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Análise de Sentimento</h1>
        <p className="text-muted-foreground mt-1">Como as IAs falam sobre sua marca — tom positivo, neutro ou negativo.</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center"><CardContent className="p-5"><p className="text-3xl font-bold text-emerald-600">{sentimentData.positive}%</p><p className="text-sm text-muted-foreground">Positivo</p></CardContent></Card>
        <Card className="text-center"><CardContent className="p-5"><p className="text-3xl font-bold text-amber-500">{sentimentData.neutral}%</p><p className="text-sm text-muted-foreground">Neutro</p></CardContent></Card>
        <Card className="text-center"><CardContent className="p-5"><p className="text-3xl font-bold text-red-500">{sentimentData.negative}%</p><p className="text-sm text-muted-foreground">Negativo</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-3">Distribuição</p>
          <div className="flex h-4 rounded-full overflow-hidden">
            <div className="bg-emerald-500 transition-all" style={{ width: `${sentimentData.positive}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${sentimentData.neutral}%` }} />
            <div className="bg-red-400 transition-all" style={{ width: `${sentimentData.negative}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-4">Menções Recentes</p>
          <div className="space-y-3">
            {sentimentData.recentMentions.map((m) => (
              <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <Badge className={`${sentimentColor[m.sentiment]} text-[10px] shrink-0 hover:bg-opacity-100`}>
                  {sentimentLabel[m.sentiment]}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">"{m.text}"</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.model} · {m.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
