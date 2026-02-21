import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { comparativeData, brandName, competitorName } from "@/lib/mock-data";

export default function ComparativoPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Análise Comparativa</h1>
        <p className="text-muted-foreground mt-1">{brandName} vs {competitorName} — visibilidade por modelo de IA.</p>
      </motion.div>

      <div className="flex items-center gap-4">
        <Card className="px-5 py-3">
          <p className="text-sm text-muted-foreground">Sua Marca</p>
          <p className="text-3xl font-bold font-display text-primary">{comparativeData.overallBrand}</p>
        </Card>
        <span className="text-muted-foreground font-bold">vs</span>
        <Card className="px-5 py-3">
          <p className="text-sm text-muted-foreground">{competitorName}</p>
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
                <Bar dataKey="brand" name={brandName} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                <Bar dataKey="competitor" name={competitorName} fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
