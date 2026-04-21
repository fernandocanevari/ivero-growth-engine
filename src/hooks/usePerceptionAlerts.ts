import { useMemo } from "react";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import {
  buildPerceptionSnapshot,
  isEmptySnapshot,
  PILLAR_KEYS,
  type PerceptionSnapshot,
  type PerceptionTone,
  type PillarKey,
} from "@/lib/perception-tags";

export interface PerceptionAlert {
  id: string;
  pillar: PillarKey;
  fromTone: PerceptionTone;
  toTone: PerceptionTone;
  date: string;
  severity: "warning" | "danger" | "success" | "info";
  title: string;
  message: string;
}

const TONE_RANK: Record<PerceptionTone, number> = { green: 3, yellow: 2, red: 1 };

function snapshotForRecord(rec: {
  clarity_score: number;
  authority_score: number;
  conversion_score: number;
  positioning_score: number;
  experience_score: number;
  perception_snapshot?: unknown;
}): PerceptionSnapshot {
  if (!isEmptySnapshot(rec.perception_snapshot)) {
    return rec.perception_snapshot as PerceptionSnapshot;
  }
  return buildPerceptionSnapshot({
    clarity: rec.clarity_score,
    authority: rec.authority_score,
    conversion: rec.conversion_score,
    positioning: rec.positioning_score,
    experience: rec.experience_score,
  });
}

/**
 * Gera alertas SEMPRE que um pilar piora entre auditorias consecutivas
 * (verde→amarelo, verde→vermelho, amarelo→vermelho). Também emite "success"
 * quando há recuperação (vermelho→verde, amarelo→verde) — útil para o histórico.
 */
export function usePerceptionAlerts() {
  const { history, isLoading } = useAnalysisHistory();

  const alerts = useMemo<PerceptionAlert[]>(() => {
    if (history.length < 2) return [];
    const sorted = [...history].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const out: PerceptionAlert[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = snapshotForRecord(sorted[i - 1]);
      const curr = snapshotForRecord(sorted[i]);
      for (const pillar of PILLAR_KEYS) {
        const fromTone = prev.tags[pillar].tone;
        const toTone = curr.tags[pillar].tone;
        if (fromTone === toTone) continue;

        const dropped = TONE_RANK[toTone] < TONE_RANK[fromTone];
        const recovered = TONE_RANK[toTone] > TONE_RANK[fromTone];

        if (dropped) {
          out.push({
            id: `${sorted[i].id}-${pillar}`,
            pillar,
            fromTone,
            toTone,
            date: sorted[i].created_at,
            severity: toTone === "red" ? "danger" : "warning",
            title:
              toTone === "red"
                ? `${pillar} caiu para crítico`
                : `${pillar} caiu para atenção`,
            message:
              toTone === "red"
                ? `O pilar ${pillar} passou de ${labelOf(fromTone)} para vermelho. Sinal crítico — IAs tendem a deixar de recomendar.`
                : `O pilar ${pillar} passou de ${labelOf(fromTone)} para amarelo. Atenção: a percepção está enfraquecendo.`,
          });
        } else if (recovered) {
          out.push({
            id: `${sorted[i].id}-${pillar}`,
            pillar,
            fromTone,
            toTone,
            date: sorted[i].created_at,
            severity: "success",
            title: `${pillar} melhorou`,
            message: `O pilar ${pillar} subiu de ${labelOf(fromTone)} para ${labelOf(toTone)}. A percepção das IAs está se fortalecendo.`,
          });
        }
      }
    }
    // mais recentes primeiro
    return out.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [history]);

  const unreadCount = alerts.filter((a) => a.severity !== "success").length;

  return { alerts, unreadCount, isLoading };
}

function labelOf(tone: PerceptionTone): string {
  return tone === "green" ? "verde" : tone === "yellow" ? "amarelo" : "vermelho";
}
