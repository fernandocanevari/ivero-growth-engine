import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_PREFIX = "ivero_brand_profile_reminder:";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CYCLES = 3;

interface ReminderState {
  dismissedAt: number;
  dismissCount: number;
}

function readState(userId: string): ReminderState {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return { dismissedAt: 0, dismissCount: 0 };
    return JSON.parse(raw) as ReminderState;
  } catch {
    return { dismissedAt: 0, dismissCount: 0 };
  }
}

interface Props {
  onOpenModal: () => void;
}

/**
 * Banner de lembrete do Perfil da Marca.
 * Aparece quando o usuário pediu "Responder depois" há >= 3 dias.
 * Pode ser fechado (snooze de 7 dias). Máximo 3 ciclos de lembrete.
 */
export default function BrandProfileReminderBanner({ onOpenModal }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const state = readState(user.id);
      if (state.dismissCount >= MAX_CYCLES) {
        setHidden(true);
        return;
      }
      if (state.dismissedAt > 0 && Date.now() - state.dismissedAt < SEVEN_DAYS_MS) {
        setHidden(true);
        return;
      }
      setHidden(false);
    });
  }, []);

  const handleDismiss = () => {
    if (userId) {
      const state = readState(userId);
      const next: ReminderState = {
        dismissedAt: Date.now(),
        dismissCount: state.dismissCount + 1,
      };
      localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(next));
    }
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <div
      className="flex items-start gap-3 rounded-lg bg-[#F0EFFE] border-l-[3px] border-[#6C5CE7] px-4 py-3 mb-4"
      role="status"
    >
      <Sparkles size={20} className="text-[#6C5CE7] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1A1A2E] leading-relaxed">
          Suas recomendações ainda não estão personalizadas. Complete o{" "}
          <strong className="font-medium">Perfil da Marca</strong> para receber insights
          adaptados à sua realidade.
        </p>
      </div>
      <button
        onClick={onOpenModal}
        className="text-sm font-medium text-white bg-[#6C5CE7] hover:bg-[#5b4ddb] px-3 py-1.5 rounded-md transition flex-shrink-0"
      >
        Completar agora →
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Fechar lembrete"
        className="text-muted-foreground hover:text-foreground transition flex-shrink-0 mt-0.5"
      >
        <X size={16} />
      </button>
    </div>
  );
}
