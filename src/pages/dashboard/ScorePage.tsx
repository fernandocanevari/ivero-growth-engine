import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { geoScore } from "@/lib/mock-data";

export default function ScorePage() {
  const diff = geoScore.current - geoScore.previous;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Score de Visibilidade GEO</h1>
        <p className="text-muted-foreground mt-1">Sua pontuação geral de presença nas IAs generativas.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${geoScore.current * 2.64} ${264 - geoScore.current * 2.64}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold font-display">{geoScore.current}</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
            <Badge className={diff > 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mt-3" : "bg-red-100 text-red-600 hover:bg-red-100 mt-3"}>
              {diff > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {diff > 0 ? "+" : ""}{diff} vs mês anterior
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-3">Evolução do Score</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={geoScore.history}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="url(#scoreGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-4">Score por Modelo</p>
          <div className="space-y-4">
            {geoScore.byModel.map((m) => (
              <div key={m.model} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium text-foreground">{m.model}</span>
                <div className="flex-1">
                  <Progress value={m.score} className="h-2.5" />
                </div>
                <span className="text-sm font-bold w-8 text-right">{m.score}</span>
                <span className={`text-xs ${m.trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
                  {m.trend === "up" ? "↑" : "↓"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
