import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  AlertTriangle,
  ExternalLink,
  Loader2,
  PauseCircle,
  PlayCircle,
  Pencil,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Frequency = "daily" | "weekly" | "biweekly";

interface MonitoringRow {
  id: string;
  user_id: string;
  monitored_url: string;
  frequency: Frequency;
  email_alerts: boolean;
  alert_email: string;
  paused: boolean;
  last_check_at: string | null;
  next_check_at: string;
  alerts_sent: number;
  pending_alert: boolean;
  pending_alert_summary: string | null;
}

interface CheckRow {
  id: string;
  checked_at: string;
  status: "unchanged" | "changed" | "file_removed" | "error";
  changes: Record<string, unknown>;
}

interface MonitoramentoTabProps {
  initialUrl: string;
  onUrlChange: (url: string) => void;
  onGoToGerador: (url: string) => void;
}

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Diariamente",
  weekly: "Semanalmente",
  biweekly: "Quinzenalmente",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function MonitoramentoTab({
  initialUrl,
  onUrlChange,
  onGoToGerador,
}: MonitoramentoTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [monitoring, setMonitoring] = useState<MonitoringRow | null>(null);
  const [history, setHistory] = useState<CheckRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Form state (used for create + edit + settings)
  const [formUrl, setFormUrl] = useState(initialUrl);
  const [formFrequency, setFormFrequency] = useState<Frequency>("weekly");
  const [formEmailAlerts, setFormEmailAlerts] = useState(true);
  const [formEmail, setFormEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("llms_monitoring")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const row = (rows?.[0] as MonitoringRow | undefined) ?? null;
    setMonitoring(row);

    if (row) {
      setFormUrl(row.monitored_url);
      setFormFrequency(row.frequency);
      setFormEmailAlerts(row.email_alerts);
      setFormEmail(row.alert_email);

      const { data: checks } = await supabase
        .from("llms_monitoring_checks")
        .select("id,checked_at,status,changes")
        .eq("monitoring_id", row.id)
        .order("checked_at", { ascending: false })
        .limit(20);
      setHistory((checks as CheckRow[]) ?? []);
    } else {
      setFormEmail(user.email ?? "");
      setFormUrl(initialUrl || "");
    }
    setLoading(false);
  }, [initialUrl]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!monitoring && initialUrl) setFormUrl(initialUrl);
  }, [initialUrl, monitoring]);

  const handleActivate = async () => {
    if (!formUrl.trim()) {
      toast.error("Informe a URL a ser monitorada.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    const payload = {
      user_id: user.id,
      monitored_url: formUrl.trim(),
      frequency: formFrequency,
      email_alerts: formEmailAlerts,
      alert_email: formEmail.trim(),
      paused: false,
      next_check_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("llms_monitoring").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível ativar o monitoramento.", { description: error.message });
      return;
    }
    onUrlChange(formUrl.trim());
    toast.success("Monitoramento ativado.");
    await load();
  };

  const handleSaveEdit = async () => {
    if (!monitoring) return;
    setSaving(true);
    const { error } = await supabase
      .from("llms_monitoring")
      .update({
        monitored_url: formUrl.trim(),
        frequency: formFrequency,
        email_alerts: formEmailAlerts,
        alert_email: formEmail.trim(),
      })
      .eq("id", monitoring.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.", { description: error.message });
      return;
    }
    onUrlChange(formUrl.trim());
    toast.success("Configurações atualizadas.");
    setEditing(false);
    setSettingsOpen(false);
    await load();
  };

  const handleTogglePause = async () => {
    if (!monitoring) return;
    const { error } = await supabase
      .from("llms_monitoring")
      .update({ paused: !monitoring.paused })
      .eq("id", monitoring.id);
    if (error) {
      toast.error("Erro ao alterar o status.", { description: error.message });
      return;
    }
    toast.success(monitoring.paused ? "Monitoramento retomado." : "Monitoramento pausado.");
    await load();
  };

  const handleRunCheckNow = async () => {
    if (!monitoring) return;
    setRunningCheck(true);
    const { error } = await supabase.functions.invoke("monitor-llms-txt", {
      body: { monitoring_id: monitoring.id },
    });
    setRunningCheck(false);
    if (error) {
      toast.error("Falha ao executar verificação.", { description: error.message });
      return;
    }
    toast.success("Verificação concluída.");
    await load();
  };

  const handleRegenerate = async () => {
    if (!monitoring) return;
    await supabase
      .from("llms_monitoring")
      .update({ pending_alert: false, pending_alert_summary: null })
      .eq("id", monitoring.id);
    onGoToGerador(monitoring.monitored_url);
  };

  const stats = useMemo(() => {
    if (!monitoring) return null;
    return {
      last: formatDateTime(monitoring.last_check_at),
      next: formatDateTime(monitoring.next_check_at),
      alerts: monitoring.alerts_sent,
    };
  }, [monitoring]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ---------- SETUP STATE ----------
  if (!monitoring) {
    return (
      <Card className="border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Radar className="h-6 w-6 text-primary" strokeWidth={1.8} />
          </div>
          <div>
            <CardTitle className="text-lg font-medium">
              Ativar monitoramento do LLMs.txt
            </CardTitle>
            <p className="mt-1.5 text-sm text-muted-foreground">
              A Ivero verificará periodicamente se o conteúdo do seu site mudou e
              alertará quando seu llms.txt precisar ser atualizado.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormFields
            url={formUrl}
            onUrlChange={(v) => {
              setFormUrl(v);
              onUrlChange(v);
            }}
            frequency={formFrequency}
            onFrequencyChange={setFormFrequency}
            emailAlerts={formEmailAlerts}
            onEmailAlertsChange={setFormEmailAlerts}
            email={formEmail}
            onEmailChange={setFormEmail}
          />
          <Button
            onClick={handleActivate}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ativando...
              </>
            ) : (
              "Ativar monitoramento"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ---------- ACTIVE STATE ----------
  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {monitoring.pending_alert && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
            strokeWidth={1.8}
          />
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-900">
              {monitoring.pending_alert_summary ??
                "Alterações detectadas no seu site — seu llms.txt pode estar desatualizado."}
            </p>
            <Button
              size="sm"
              onClick={handleRegenerate}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Regenerar agora →
            </Button>
          </div>
        </motion.div>
      )}

      {/* Status row */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            {!monitoring.paused && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                monitoring.paused ? "bg-muted-foreground" : "bg-emerald-500"
              }`}
            />
          </span>
          <span className="text-sm font-medium text-foreground">
            {monitoring.paused ? "Monitoramento pausado" : "Monitoramento ativo"}
          </span>
          <a
            href={monitoring.monitored_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {monitoring.monitored_url}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunCheckNow}
            disabled={runningCheck}
          >
            {runningCheck ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Verificar agora
          </Button>
          <Button variant="ghost" size="sm" onClick={handleTogglePause}>
            {monitoring.paused ? (
              <>
                <PlayCircle className="mr-1.5 h-4 w-4" />
                Retomar
              </>
            ) : (
              <>
                <PauseCircle className="mr-1.5 h-4 w-4" />
                Pausar
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(true);
              setSettingsOpen(true);
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatMini label="Última verificação" value={stats!.last} />
        <StatMini label="Próxima verificação" value={stats!.next} />
        <StatMini label="Alertas enviados" value={String(stats!.alerts)} />
      </div>

      {/* History table */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Histórico de verificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma verificação realizada ainda. A primeira verificação ocorrerá em até 24h.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alterações detectadas</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{formatDateTime(c.checked_at)}</TableCell>
                    <TableCell>
                      <StatusDot status={c.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {describeChanges(c)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(c.status === "changed" || c.status === "file_removed") && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={handleRegenerate}
                        >
                          Regenerar →
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alert settings collapsible */}
      <Collapsible
        open={settingsOpen}
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) setEditing(false);
        }}
      >
        <Card className="border-border/60">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-t-lg px-6 py-4 text-left transition-colors hover:bg-muted/40"
            >
              <span className="text-base font-medium text-foreground">
                Configurações de alerta
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  settingsOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              <FormFields
                url={formUrl}
                onUrlChange={setFormUrl}
                frequency={formFrequency}
                onFrequencyChange={setFormFrequency}
                emailAlerts={formEmailAlerts}
                onEmailAlertsChange={setFormEmailAlerts}
                email={formEmail}
                onEmailChange={setFormEmail}
                disabled={!editing}
              />
              <div className="flex justify-end gap-2">
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(false);
                        void load();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Salvar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusDot({ status }: { status: CheckRow["status"] }) {
  const config: Record<CheckRow["status"], { color: string; label: string }> = {
    unchanged: { color: "bg-emerald-500", label: "Sem alterações" },
    changed: { color: "bg-amber-500", label: "Alterações detectadas" },
    file_removed: { color: "bg-red-500", label: "Arquivo removido" },
    error: { color: "bg-muted-foreground", label: "Erro na verificação" },
  };
  const c = config[status];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-foreground">
      <span className={`h-2 w-2 rounded-full ${c.color}`} />
      {c.label}
    </span>
  );
}

function describeChanges(c: CheckRow): string {
  if (c.status === "unchanged") return "—";
  const parts: string[] = [];
  if ((c.changes as any)?.site_changed) parts.push("Conteúdo do site");
  if ((c.changes as any)?.llms_changed) parts.push("Arquivo llms.txt");
  if ((c.changes as any)?.llms_removed) parts.push("llms.txt removido");
  if ((c.changes as any)?.fetch_failed) parts.push("Falha de acesso");
  return parts.length ? parts.join(" · ") : "Detalhes indisponíveis";
}

interface FormFieldsProps {
  url: string;
  onUrlChange: (v: string) => void;
  frequency: Frequency;
  onFrequencyChange: (v: Frequency) => void;
  emailAlerts: boolean;
  onEmailAlertsChange: (v: boolean) => void;
  email: string;
  onEmailChange: (v: string) => void;
  disabled?: boolean;
}

function FormFields({
  url,
  onUrlChange,
  frequency,
  onFrequencyChange,
  emailAlerts,
  onEmailAlertsChange,
  email,
  onEmailChange,
  disabled,
}: FormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="mon-url">URL monitorada</Label>
        <Input
          id="mon-url"
          type="url"
          placeholder="https://seusite.com.br"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={disabled}
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Frequência de verificação</Label>
        <Select
          value={frequency}
          onValueChange={(v) => onFrequencyChange(v as Frequency)}
          disabled={disabled}
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
              <SelectItem key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Alertas por e-mail</p>
          <p className="text-xs text-muted-foreground">
            Receba um e-mail quando alterações forem detectadas.
          </p>
        </div>
        <Switch
          checked={emailAlerts}
          onCheckedChange={onEmailAlertsChange}
          disabled={disabled}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="mon-email">E-mail para alertas</Label>
        <Input
          id="mon-email"
          type="email"
          placeholder="voce@empresa.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={disabled || !emailAlerts}
          className="h-11"
        />
      </div>
    </div>
  );
}
