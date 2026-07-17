import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CheckCheck, Plus, Trash2, Sparkles } from "lucide-react";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { EmptyStatePage } from "@/components/dashboard/EmptyStatePage";
import {
  useActionPlans,
  useCreateActionPlan,
  useDeleteActionPlan,
  useToggleActionStatus,
} from "@/hooks/useActionPlans";
import {
  ACTION_CATEGORY_LABELS,
  ACTION_PRIORITY_LABELS,
  type ActionCategory,
  type ActionPriority,
} from "@/lib/action-plans";

const CATEGORY_OPTIONS = Object.entries(ACTION_CATEGORY_LABELS) as Array<
  [ActionCategory, string]
>;
const PRIORITY_OPTIONS = Object.entries(ACTION_PRIORITY_LABELS) as Array<
  [ActionPriority, string]
>;

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
  trigger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const [form, setForm] = useState<ActionFormState>(EMPTY_FORM);
  const create = useCreateActionPlan();

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  const { data: actions = [], isLoading: loadingActions } = useActionPlans();
  const toggleStatus = useToggleActionStatus();
  const deleteAction = useDeleteActionPlan();
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasBrand = !!settings?.brand_name;

  if (loadingBrand || loadingActions) return null;

  if (actions.length === 0) {
    return (
      <>
        <EmptyStatePage
          icon={<CheckCheck className="h-12 w-12" />}
          title="Planos de Ação"
          subtitle="Tarefas priorizadas para melhorar sua presença nas IAs."
          message="Nenhuma ação cadastrada ainda"
          description={
            hasBrand
              ? "Crie sua primeira ação manualmente ou rode um diagnóstico para receber sugestões automáticas."
              : "Configure sua marca antes de começar a criar ações."
          }
          hasBrand={hasBrand}
          cta={
            hasBrand
              ? {
                  label: "Criar primeira ação",
                  to: "#",
                  icon: <Plus className="h-4 w-4 mr-1.5" />,
                }
              : undefined
          }
        />
        {hasBrand && (
          <>
            {/* CTA do EmptyStatePage é um link; sobrepomos um trigger real */}
            <div className="fixed bottom-8 right-8 z-40">
              <Button size="lg" onClick={() => setDialogOpen(true)} className="shadow-lg">
                <Plus className="h-4 w-4 mr-1.5" /> Nova ação
              </Button>
            </div>
            <NewActionDialog open={dialogOpen} onOpenChange={setDialogOpen} />
          </>
        )}
      </>
    );
  }

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
          <h1 className="text-2xl font-bold font-display text-foreground">Planos de Ação</h1>
          <p className="text-muted-foreground mt-1">
            Tarefas priorizadas para melhorar sua presença nas IAs.
          </p>
        </div>
        <NewActionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-1.5" /> Nova ação
            </Button>
          }
        />
      </motion.div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Progresso Geral</p>
            <span className="text-sm font-medium">
              {completed}/{total}
            </span>
          </div>
          <Progress value={total > 0 ? (completed / total) * 100 : 0} className="h-2.5" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        {actions.map((action) => {
          const isDone = action.status === "concluido";
          return (
            <Card key={action.id} className={isDone ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-start gap-3">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() =>
                    toggleStatus.mutate({ id: action.id, status: action.status })
                  }
                  className="mt-0.5"
                  disabled={toggleStatus.isPending}
                />
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
    </div>
  );
}
