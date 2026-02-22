import { motion } from "framer-motion";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Target } from "lucide-react";
import { dominanceData } from "@/lib/mock-data";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";

export default function DominanciaPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const hasBrand = !!settings?.brand_name;
  const hasCompetitor = !!settings?.main_competitor;
  const hasData = false;

  const displayName = settings?.brand_name || "Sua marca";
  const displayCompetitor = settings?.main_competitor || "Concorrente";

  if (isLoading) return null;

  if (!hasData) {
    return (
      <EmptyStatePage
        icon={<Target className="h-12 w-12" />}
        title="Dominância por Modelo"
        subtitle="Participação da sua marca nas respostas de cada IA."
        message={!hasCompetitor ? "Adicione um concorrente nas configurações para ver a dominância" : "Nenhum dado de dominância disponível ainda"}
        hasBrand={hasBrand}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center">Dominância por Modelo <InfoTooltip text="Revela a fatia de voz que sua marca ocupa nas respostas de cada IA frente aos concorrentes. Use para direcionar esforços onde você pode liderar a narrativa." /></h1>
        <p className="text-muted-foreground mt-1">Participação da sua marca nas respostas de cada IA.</p>
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dominanceData}>
                <XAxis dataKey="model" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="brandShare" name={displayName} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="competitorShare" name={displayCompetitor} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="othersShare" name="Outros" fill="hsl(var(--border))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {dominanceData.map((d) => (
          <Card key={d.model}>
            <CardContent className="p-5 text-center">
              <p className="text-sm text-muted-foreground">{d.model}</p>
              <p className="text-3xl font-bold font-display text-primary mt-1">{d.brandShare}%</p>
              <p className="text-xs text-muted-foreground mt-1">da sua marca</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
