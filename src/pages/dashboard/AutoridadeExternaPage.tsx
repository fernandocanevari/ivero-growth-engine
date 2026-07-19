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
import { ExternalLink, Plus, Trash2, Sparkles, Link2, Newspaper, Mic, Star } from "lucide-react";
import {
  useActionPlans,
  useCreateActionPlan,
  useDeleteActionPlan,
  useSetActionStatus,
} from "@/hooks/useActionPlans";
import {
  ACTION_PRIORITY_LABELS,
  ACTION_STATUS_LABELS,
  type ActionPriority,
  type ActionStatus,
} from "@/lib/action-plans";

const PRIORITY_OPTIONS = Object.entries(ACTION_PRIORITY_LABELS) as Array<
  [ActionPriority, string]
>;
const STATUS_OPTIONS = Object.entries(ACTION_STATUS_LABELS) as Array<
  [ActionStatus, string]
>;

interface Example {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  descricao: string;
  impacto_estimado: string;
  prioridade: ActionPriority;
}

const EXAMPLES: Example[] = [
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
    titulo: "Solicitar reviews em portais especializados",
    descricao:
      "Coordenar clientes-chave para publicar avaliações detalhadas em plataformas monitoradas pelas IAs.",
    impacto_estimado: "Reforça confiança e sinais de reputação",
    prioridade: "media",
  },
];

interface FormState {
  titulo: string;
  descricao: string;
  impacto_estimado: string;
  prioridade: ActionPriority;
}

const EMPTY_FORM: FormState = {
  titulo: "",
  descricao: "",
  impacto_estimado: "",
  prioridade: "media",
};

function priorityBadgeClass(p: ActionPriority) {
  if (p === "alta") return "border-red-200 text-red-600";
  if (p === "media") return "border-amber-200 text-amber-600";
  return "border-border text-muted-foreground";
}

function AutoridadeDialog({
  open,
  onOpenChange,
  initial,
  trigger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<FormState>;
  trigger?: React.ReactNode;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const create = useCreateActionPlan();

  // Reset form when dialog opens with a new prefill
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
        categoria: "autoridade_externa",
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
            <DialogTitle>Nova ação de Autoridade Externa</DialogTitle>
            <DialogDescription>
              Ações off-site que aumentam menções, backlinks e sinais de confiança
              que as IAs usam para recomendar sua marca.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ae-titulo">Título *</Label>
              <Input
                id="ae-titulo"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Publicar guest post em portal do setor"
                maxLength={200}
                required
              />
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

            <div className="space-y-2">
              <Label htmlFor="ae-descricao">Descrição</Label>
              <Textarea
                id="ae-descricao"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhe o que precisa ser feito e por quê."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ae-impacto">Impacto estimado</Label>
              <Input
                id="ae-impacto"
                value={form.impacto_estimado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, impacto_estimado: e.target.value }))
                }
                placeholder="Ex: Aumentar autoridade de domínio e citações em IAs"
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

export default function AutoridadeExternaPage() {
  const { data: actions = [], isLoading } = useActionPlans({
    categoria: "autoridade_externa",
  });
  const setStatus = useSetActionStatus();
  const deleteAction = useDeleteActionPlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<Partial<FormState> | undefined>(undefined);

  const openWithPrefill = (example?: Example) => {
    if (example) {
      setPrefill({
        titulo: example.titulo,
        descricao: example.descricao,
        impacto_estimado: example.impacto_estimado,
        prioridade: example.prioridade,
      });
    } else {
      setPrefill(undefined);
    }
    setDialogOpen(true);
  };

  if (isLoading) return null;

  const completed = actions.filter((a) => a.status === "concluido").length;
  const total = actions.length;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold font-display text-foreground">
              Autoridade Externa
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Ações off-site que constroem os sinais que as IAs valorizam para
            recomendar sua marca: backlinks editoriais, menções em veículos do
            setor, participações em podcasts e reviews qualificadas.
          </p>
        </div>
        <AutoridadeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initial={prefill}
          trigger={
            <Button onClick={() => openWithPrefill()}>
              <Plus className="h-4 w-4 mr-1.5" /> Nova ação
            </Button>
          }
        />
      </motion.div>

      {total === 0 ? (
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
              {EXAMPLES.map((ex) => {
                const Icon = ex.icon;
                return (
                  <button
                    key={ex.titulo}
                    type="button"
                    onClick={() => openWithPrefill(ex)}
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
                <p className="text-sm text-muted-foreground">Progresso</p>
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
                          isDone
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {action.titulo}
                      </p>
                      {action.descricao && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {action.descricao}
                        </p>
                      )}
                      {action.impacto_estimado && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Impacto: {action.impacto_estimado}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-primary/10 text-primary border-primary/20"
                        >
                          Autoridade Externa
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
