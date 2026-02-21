import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

const reports = [
  { id: 1, name: "Relatório Semanal — Semana 7", date: "17/02/2026", type: "Semanal" },
  { id: 2, name: "Relatório Semanal — Semana 6", date: "10/02/2026", type: "Semanal" },
  { id: 3, name: "Relatório Mensal — Janeiro 2026", date: "01/02/2026", type: "Mensal" },
  { id: 4, name: "Relatório Semanal — Semana 5", date: "03/02/2026", type: "Semanal" },
];

export default function RelatoriosPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Exporte relatórios em PDF ou CSV.</p>
      </motion.div>

      <div className="space-y-3">
        {reports.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.date} · {r.type}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" /> PDF</Button>
                <Button size="sm" variant="outline"><Download className="h-3 w-3 mr-1" /> CSV</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
