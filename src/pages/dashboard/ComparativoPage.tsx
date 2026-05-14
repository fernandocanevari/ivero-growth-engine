import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Settings } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { comparativeData } from "@/lib/mock-data";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";

export default function ComparativoPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const hasBrand = !!settings?.brand_name;
  const hasCompetitor = !!settings?.main_competitor;
  const hasData = false;

  const displayName = settings?.brand_name || "Sua marca";
  const displayCompetitor = settings?.main_competitor || "Concorrente";

  if (isLoading) return null;

  if (!hasData || !hasCompetitor) {
    return (
      <EmptyStatePage
        icon={<Target className="h-12 w-12" />}
        title="Análise Comparativa"
        subtitle="Compare sua visibilidade com a de concorrentes em cada modelo de IA."
        message={!hasCompetitor ? "Adicione um concorrente nas configurações para comparar" : "Nenhum dado comparativo disponível ainda"}
        hasBrand={hasBrand}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Análise Comparativa</h1>
        <p className="text-muted-foreground mt-1">{displayName} vs {displayCompetitor} — visibilidade por modelo de IA.</p>
      </motion.div>

      <div className="flex items-center gap-4">
        <Card className="px-5 py-3">
          <p className="text-sm text-muted-foreground">Sua Marca</p>
          <p className="text-3xl font-bold font-display text-primary">{comparativeData.overallBrand}</p>
        </Card>
        <span className="text-muted-foreground font-bold">vs</span>
        <Card className="px-5 py-3">
          <p className="text-sm text-muted-foreground">{displayCompetitor}</p>
          <p className="text-3xl font-bold font-display">{comparativeData.overallCompetitor}</p>
        </Card>
        <Badge className={comparativeData.overallBrand > comparativeData.overallCompetitor ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-600 hover:bg-red-100"}>
          {comparativeData.overallBrand > comparativeData.overallCompetitor ? "Você lidera" : "Atrás"}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativeData.models} layout="vertical" barGap={4}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="brand" name={displayName} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                <Bar dataKey="competitor" name={displayCompetitor} fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
