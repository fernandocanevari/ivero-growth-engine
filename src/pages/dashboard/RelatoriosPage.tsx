import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";

export default function RelatoriosPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const hasBrand = !!settings?.brand_name;
  const hasData = false;

  if (isLoading) return null;

  if (!hasData) {
    return (
      <EmptyStatePage
        icon={<FileText className="h-12 w-12" />}
        title="Relatórios"
        subtitle="Exporte relatórios em PDF ou CSV."
        message="Nenhum relatório disponível ainda"
        hasBrand={hasBrand}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-1">Exporte relatórios em PDF ou CSV.</p>
      </motion.div>
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Relatórios aparecerão aqui quando houver dados suficientes.
        </CardContent>
      </Card>
    </div>
  );
}
