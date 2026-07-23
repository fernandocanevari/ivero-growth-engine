import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCheck,
  Plus,
  Trash2,
  Sparkles,
  Link2,
  Newspaper,
  Mic,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";
import {
  useActionPlans,
  useCreateActionPlan,
  useDeleteActionPlan,
  useSetActionStatus,
} from "@/hooks/useActionPlans";
import {
  ACTION_CATEGORY_LABELS,
  ACTION_PRIORITY_LABELS,
  ACTION_STATUS_LABELS,
  type ActionCategory,
  type ActionPriority,
  type ActionStatus,
} from "@/lib/action-plans";

const CATEGORY_OPTIONS = Object.entries(ACTION_CATEGORY_LABELS) as Array<
  [ActionCategory, string]
>;
const PRIORITY_OPTIONS = Object.entries(ACTION_PRIORITY_LABELS) as Array<
  [ActionPriority, string]
>;
const STATUS_OPTIONS = Object.entries(ACTION_STATUS_LABELS) as Array<
  [ActionStatus, string]
>;

type FilterKey = "todas" | "autoridade_externa";

interface AutoridadeExample {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  impacto_estimado: string;
  prioridade: ActionPriority;
}

const AUTORIDADE_EXAMPLES: AutoridadeExample[] = [
  {
    icon: Newspaper,
    titulo: "Publicar guest post em veículo do setor",
    descricao:
      "Escrever artigo autoral em um portal de referência do seu segmento com link para o site institucional.",
    impacto_estimado: "Aumenta autoridade de domínio e menções nas IAs em ~10%",
    prioridade: "alta",
  },
  {
    icon: Link2,
    titulo: "Conquistar backlink de site com alta autoridade",
    descricao:
      "Mapear parceiros, associações ou mídia especializada e negociar link editorial para o site principal.",
    impacto_estimado: "Ganho direto em citações do Google Modo IA e Gemini",
    prioridade: "alta",
  },
  {
    icon: Mic,
    titulo: "Participar como convidado em podcast do setor",
    descricao:
      "Aparecer como especialista em episódios relevantes, gerando transcrição indexável e menções em plataformas.",
    impacto_estimado: "Melhora sentimento e presença em resposta de ChatGPT",
    prioridade: "media",
  },
  {
    icon: Star,
    titulo: "Solicitar menção em release de imprensa",
    descricao:
      "Coordenar assessoria para incluir a marca em releases distribuídos a portais monitorados pelas IAs.",
    impacto_estimado: "Reforça confiança e sinais de reputação",
    prioridade: "media",
  },
];

function priorityBadgeClass(p: ActionPriority) {
  if (p === "alta") return "border-red-200 text-red-600";
  if (p === "media") return "border-amber-200 text-amber-600";
  return "border-border text-muted-foreground";
}

interface ActionFormState {
  titulo: string;
  categoria: ActionCategory;
  prioridade: ActionPriority;
  descricao: string;
  impacto_estimado: string;
}

const EMPTY_FORM: ActionFormState = {
  titulo: "",
  categoria: "clareza",
  prioridade: "media",
  descricao: "",
  impacto_estimado: "",
};

function NewActionDialog({
  open,
  onOpenChange,
  initial,
  trigger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<ActionFormState>;
  trigger?: React.ReactNode;
}) {
  const [form, setForm] = useState<ActionFormState>({ ...EMPTY_FORM, ...initial });
  const create = useCreateActionPlan();

  const handleOpen = (v: boolean) => {
    if (v) setForm({ ...EMPTY_FORM, ...initial });
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    create.mutate(
      {
        titulo: form.titulo,
        categoria: form.categoria,
        prioridade: form.prioridade,
        descricao: form.descricao || null,
        impacto_estimado: form.impacto_estimado || null,
      },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova ação</DialogTitle>
            <DialogDescription>
              Registre uma tarefa concreta para melhorar sua presença nas IAs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="acao-titulo">Título *</Label>
              <Input
                id="acao-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Publicar case study com dados de resultado"
                maxLength={200}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, categoria: v as ActionCategory }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, prioridade: v as ActionPriority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acao-descricao">Descrição</Label>
              <Textarea
                id="acao-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhe o que precisa ser feito e por quê."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acao-impacto">Impacto estimado</Label>
              <Input
                id="acao-impacto"
                value={form.impacto_estimado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, impacto_estimado: e.target.value }))
                }
                placeholder="Ex: Aumentar menções no ChatGPT em ~15%"
                maxLength={200}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending || !form.titulo.trim()}>
              {create.isPending ? "Salvando..." : "Criar ação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AcoesPage() {
  const { data: settings, isLoading: loadingBrand } = useBrandSettings();
  const [filter, setFilter] = useState<FilterKey>("todas");
  const { data: actions = [], isLoading: loadingActions } = useActionPlans(
    filter === "autoridade_externa" ? { categoria: "autoridade_externa" } : {},
  );
  const setStatus = useSetActionStatus();
  const deleteAction = useDeleteActionPlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<Partial<ActionFormState> | undefined>(
    undefined,
  );

  const hasBrand = !!settings?.brand_name;

  const openDialog = (initial?: Partial<ActionFormState>) => {
    setPrefill(initial);
    setDialogOpen(true);
  };

  if (loadingBrand || loadingActions) return null;

  const completed = actions.filter((a) => a.status === "concluido").length;
  const total = actions.length;
  const isAutoridade = filter === "autoridade_externa";
  const showGlobalEmpty = filter === "todas" && actions.length === 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Planos de Ação</h1>
          <p className="text-muted-foreground mt-1">
            Recomendações priorizadas para você (ou sua equipe) executar e melhorar sua presença nas IAs.
          </p>
        </div>
        {hasBrand && total > 0 && (
          <NewActionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            initial={prefill}
            trigger={
              <Button
                onClick={() =>
                  openDialog(
                    isAutoridade ? { categoria: "autoridade_externa" } : undefined,
                  )
                }
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nova Ação
              </Button>
            }
          />
        )}
      </motion.div>

      {/* Filtro por categoria — sempre visível */}
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {([
          { key: "todas", label: "Todas" },
          { key: "autoridade_externa", label: "Autoridade Externa" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors",
              filter === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isAutoridade && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="p-4">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Autoridade Externa: </span>
              menções, backlinks e citações que sinalizam credibilidade pras IAs.
            </p>
          </CardContent>
        </Card>
      )}

      {showGlobalEmpty ? (
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="text-muted-foreground mb-4">
              <CheckCheck className="h-12 w-12" />
            </div>
            <p className="text-base font-medium text-foreground">
              Nenhuma ação cadastrada ainda
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              {hasBrand
                ? "Crie sua primeira ação manualmente ou rode um diagnóstico para receber sugestões automáticas."
                : "Configure sua marca antes de começar a criar ações."}
            </p>
            {hasBrand && (
              <Button className="mt-5" onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-1.5" /> Criar primeira ação
              </Button>
            )}
          </CardContent>
        </Card>

      ) : total === 0 && isAutoridade ? (

        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Comece com exemplos comprovados
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em qualquer exemplo abaixo para pré-preencher e ajustar
                antes de salvar.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {AUTORIDADE_EXAMPLES.map((ex) => {
                const Icon = ex.icon;
                return (
                  <button
                    key={ex.titulo}
                    type="button"
                    onClick={() =>
                      openDialog({
                        titulo: ex.titulo,
                        descricao: ex.descricao,
                        impacto_estimado: ex.impacto_estimado,
                        prioridade: ex.prioridade,
                        categoria: "autoridade_externa",
                      })
                    }
                    className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-primary/10 p-2 shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {ex.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {ex.descricao}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {isAutoridade ? "Progresso (Autoridade Externa)" : "Progresso Geral"}
                </p>
                <span className="text-sm font-medium">
                  {completed}/{total}
                </span>
              </div>
              <Progress
                value={total > 0 ? (completed / total) * 100 : 0}
                className="h-2.5"
              />
            </CardContent>
          </Card>

          <div className="space-y-2">
            {actions.map((action) => {
              const isDone = action.status === "concluido";
              return (
                <Card key={action.id} className={isDone ? "opacity-60" : ""}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <Select
                      value={action.status}
                      onValueChange={(v) =>
                        setStatus.mutate({ id: action.id, status: v as ActionStatus })
                      }
                      disabled={setStatus.isPending}
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isDone ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {action.titulo}
                      </p>
                      {action.descricao && (
                        <p className="text-xs text-muted-foreground mt-1">{action.descricao}</p>
                      )}
                      {action.impacto_estimado && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Impacto: {action.impacto_estimado}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {ACTION_CATEGORY_LABELS[action.categoria]}
                        </Badge>
                        {action.origem === "automatico" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/40 text-primary gap-1"
                          >
                            <Sparkles className="h-2.5 w-2.5" />
                            Sugerida
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${priorityBadgeClass(action.prioridade)}`}
                      >
                        {ACTION_PRIORITY_LABELS[action.prioridade]}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir esta ação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta operação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAction.mutate(action.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
