import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useNavigate } from "react-router-dom";

const statusMap: Record<string, { label: string; class: string }> = {
  active: { label: "Ativa", class: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Concluída", class: "bg-secondary text-muted-foreground" },
  draft: { label: "Rascunho", class: "bg-amber-100 text-amber-700" },
};

export default function CampanhasPage() {
  const navigate = useNavigate();
  const { data: campaigns, isLoading } = useCampaigns();

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Campanhas</h1>
          <p className="text-muted-foreground mt-1">Gerencie campanhas de visibilidade em IA.</p>
        </div>
        <Button onClick={() => navigate("/dashboard/campanhas/nova")} className="bg-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> Nova Campanha
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns?.map((c) => {
            const s = statusMap[c.status] ?? statusMap.draft;
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <p className="text-base font-semibold text-foreground">{c.name}</p>
                    <Badge className={`${s.class} text-[10px] hover:bg-opacity-100`}>{s.label}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>{c.start_date} → {c.end_date}</span>
                  </div>
                  <div className="flex items-center gap-6 mt-3">
                    <div><p className="text-xl font-bold font-display">{c.mentions}</p><p className="text-xs text-muted-foreground">Menções</p></div>
                    <div><p className="text-xl font-bold font-display text-primary">{c.score}</p><p className="text-xs text-muted-foreground">Score</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
