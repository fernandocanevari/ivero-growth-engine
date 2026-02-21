import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { actionsData } from "@/lib/mock-data";
import { useState } from "react";

export default function AcoesPage() {
  const [actions, setActions] = useState(actionsData);
  const completed = actions.filter((a) => a.completed).length;
  const total = actions.length;

  const toggle = (id: number) => {
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Planos de Ação</h1>
        <p className="text-muted-foreground mt-1">Tarefas priorizadas para melhorar sua presença nas IAs.</p>
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Progresso Geral</p>
            <span className="text-sm font-medium">{completed}/{total}</span>
          </div>
          <Progress value={(completed / total) * 100} className="h-2.5" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {actions.map((action) => (
          <Card key={action.id} className={action.completed ? "opacity-60" : ""}>
            <CardContent className="p-4 flex items-start gap-3">
              <Checkbox checked={action.completed} onCheckedChange={() => toggle(action.id)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${action.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{action.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.impact}</p>
              </div>
              <Badge variant="outline" className={
                action.priority === "high" ? "border-red-200 text-red-600 text-[10px]" :
                action.priority === "medium" ? "border-amber-200 text-amber-600 text-[10px]" :
                "border-border text-muted-foreground text-[10px]"
              }>
                {action.priority === "high" ? "Alta" : action.priority === "medium" ? "Média" : "Baixa"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
