import { useMemo } from "react";
import { icons, Plus, Clock, Gauge, Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useActionPlans } from "@/hooks/useActionPlans";
import {
  AUTHORITY_SUBCATEGORY_COLORS,
  AUTHORITY_SUBCATEGORY_LABELS,
  AUTHORITY_SUBCATEGORY_ORDER,
  useAdoptCatalogAction,
  useAuthorityCatalog,
  type AuthorityCatalogItem,
  type AuthoritySubcategory,
} from "@/hooks/useAuthorityCatalog";

const DIFFICULTY_LABELS: Record<string, string> = {
  baixa: "Fácil",
  media: "Médio",
  alta: "Avançado",
};

function CatalogIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && (icons as Record<string, React.ComponentType<{ className?: string }>>)[name]) || null;
  if (!Icon) return null;
  return <Icon className={className} />;
}

export function AutoridadeExternaAccordion() {
  const { data: catalog = [], isLoading } = useAuthorityCatalog();
  const { data: adopted = [] } = useActionPlans({ categoria: "autoridade_externa" });
  const adopt = useAdoptCatalogAction();

  const grouped = useMemo(() => {
    const map = new Map<AuthoritySubcategory, AuthorityCatalogItem[]>();
    for (const sub of AUTHORITY_SUBCATEGORY_ORDER) map.set(sub, []);
    for (const item of catalog) {
      const list = map.get(item.subcategoria);
      if (list) list.push(item);
    }
    return map;
  }, [catalog]);

  const adoptedIds = useMemo(
    () => new Set(adopted.map((a) => a.catalog_id).filter(Boolean) as string[]),
    [adopted],
  );

  if (isLoading || catalog.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Biblioteca de ações de Autoridade Externa
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha uma categoria e adicione ao seu plano as ações que fazem sentido agora.
          </p>
        </div>

        <Accordion type="multiple" className="w-full">
          {AUTHORITY_SUBCATEGORY_ORDER.map((sub) => {
            const items = grouped.get(sub) ?? [];
            if (items.length === 0) return null;
            const adoptedCount = items.filter((i) => adoptedIds.has(i.id)).length;
            return (
              <AccordionItem key={sub} value={sub}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                    <div
                      className={cn(
                        "rounded-md p-2 shrink-0",
                        AUTHORITY_SUBCATEGORY_COLORS[sub],
                      )}
                    >
                      <CatalogIcon name={items[0].icon} className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-foreground text-left truncate">
                      {AUTHORITY_SUBCATEGORY_LABELS[sub]}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
                      {adoptedCount}/{items.length} adotadas
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-1">
                    {items.map((item) => {
                      const isAdopted = adoptedIds.has(item.id);
                      return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3",
                          isAdopted
                            ? "border-emerald-200 bg-emerald-50/60"
                            : "border-border bg-card",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {item.titulo}
                          </p>
                          {item.descricao && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.descricao}
                            </p>
                          )}
                          {item.impacto_estimado && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Impacto: {item.impacto_estimado}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Gauge className="h-3 w-3" />
                              {DIFFICULTY_LABELS[item.dificuldade] ?? item.dificuldade}
                            </span>
                            {item.tempo_estimado && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.tempo_estimado}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          disabled={isAdopted || adopt.isPending}
                          onClick={() => adopt.mutate(item)}
                        >
                          {isAdopted ? (
                            <>
                              <Check className="h-3.5 w-3.5 mr-1" /> Já adicionado
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                            </>
                          )}
                        </Button>
                      </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
