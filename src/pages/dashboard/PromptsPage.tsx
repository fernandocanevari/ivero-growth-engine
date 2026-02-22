import { motion } from "framer-motion";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Map } from "lucide-react";
import { promptsData } from "@/lib/mock-data";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";

const oppColor = { high: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", low: "bg-secondary text-muted-foreground" };
const oppLabel = { high: "Alta", medium: "Média", low: "Baixa" };

export default function PromptsPage() {
  const { data: settings, isLoading } = useBrandSettings();
  const hasBrand = !!settings?.brand_name;
  const hasData = false;

  if (isLoading) return null;

  if (!hasData) {
    return (
      <EmptyStatePage
        icon={<Map className="h-12 w-12" />}
        title="Mapa de Prompts"
        subtitle="Prompts estratégicos e sua posição em cada modelo de IA."
        message="Nenhum dado de prompts disponível ainda"
        hasBrand={hasBrand}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground flex items-center">Mapa de Prompts <InfoTooltip text="Descubra como as IAs percebem sua marca, valide seu posicionamento e antecipe o impacto de campanhas. Cada prompt revela oportunidades reais de influenciar a narrativa a seu favor." /></h1>
        <p className="text-muted-foreground mt-1">Prompts estratégicos e sua posição em cada modelo de IA.</p>
      </motion.div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-center">Posição</TableHead>
                <TableHead>Oportunidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promptsData.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium text-foreground max-w-xs truncate">{p.prompt}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{p.model}</Badge></TableCell>
                  <TableCell className="text-center font-bold">{p.position}º</TableCell>
                  <TableCell><Badge className={`${oppColor[p.opportunity]} text-[10px] hover:bg-opacity-100`}>{oppLabel[p.opportunity]}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
