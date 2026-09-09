import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UpgradeModal } from "@/components/dashboard/UpgradeModal";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { isFeatureAvailable, getRequiredTier, tierLabel } from "@/lib/access-control";
import DiagnosticoPage from "./DiagnosticoPage";
import AuditoriasPage from "./AuditoriasPage";
import PilaresPage from "./PilaresPage";

/**
 * Visibilidade IA — tela única que unifica os antigos menus
 * "Diagnóstico IA" (aba Score), "Evolução Estratégica" (aba Evolução) e
 * "Análise de Resultados" (aba Histórico).
 *
 * As 3 abas leem o MESMO cache (useAuditReports / useAnalysisHistory /
 * useBrandSettings), então trocar de aba não dispara nova busca.
 *
 * O gating de plano deixou de ser por rota e passou a ser por aba: a rota
 * inteira é liberada, e só o conteúdo da Evolução aparece borrado com cadeado
 * para quem está abaixo do tier exigido (mapa de tiers permanece intocado).
 */

const TAB_VALUES = ["score", "evolucao", "historico"] as const;
type TabValue = (typeof TAB_VALUES)[number];

/** Path virtual usado só para reaproveitar a regra de tier já existente. */
const EVOLUCAO_FEATURE_PATH = "/dashboard/pilares";

function EvolucaoLockedOverlay() {
  const [modalOpen, setModalOpen] = useState(false);
  const requiredTier = getRequiredTier(EVOLUCAO_FEATURE_PATH);
  const tierName = requiredTier ? tierLabel(requiredTier) : null;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none select-none blur-sm opacity-50"
      >
        <PilaresPage />
      </div>

      <div className="absolute inset-0 flex items-start justify-center pt-16">
        <Card className="max-w-md border-primary/30 shadow-lg">
          <CardContent className="p-6 text-center space-y-3">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold font-display text-foreground">
              Evolução Estratégica
            </h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe a evolução dos 5 pilares da sua marca ao longo do tempo, com radar
              comparativo e KPIs de progresso.
            </p>
            {tierName && (
              <p className="text-xs font-medium text-primary">
                Disponível no plano {tierName}
              </p>
            )}
            <Button onClick={() => setModalOpen(true)} className="w-full">
              {tierName ? `Fazer upgrade para ${tierName}` : "Ver planos"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {modalOpen && (
        <UpgradeModal open={modalOpen} onClose={() => setModalOpen(false)} intent="contratar" />
      )}
    </div>
  );
}

export default function VisibilidadeIAPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("aba");
  const activeTab: TabValue = (TAB_VALUES as readonly string[]).includes(raw ?? "")
    ? (raw as TabValue)
    : "score";

  const { isPaid, isAdmin, isTrial, plano } = useSubscriptionStatus();
  const evolucaoAvailable = isFeatureAvailable(
    EVOLUCAO_FEATURE_PATH,
    plano,
    isPaid,
    isAdmin,
    isTrial,
  );

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "score") next.delete("aba");
    else next.set("aba", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="score" className="mt-6">
          <DiagnosticoPage />
        </TabsContent>

        <TabsContent value="evolucao" className="mt-6">
          {evolucaoAvailable ? <PilaresPage /> : <EvolucaoLockedOverlay />}
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <AuditoriasPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
