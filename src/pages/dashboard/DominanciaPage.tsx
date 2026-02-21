import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { dominanceData, brandName, competitorName } from "@/lib/mock-data";

export default function DominanciaPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Dominância por Modelo</h1>
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
                <Bar dataKey="brandShare" name={brandName} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="competitorShare" name={competitorName} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
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
