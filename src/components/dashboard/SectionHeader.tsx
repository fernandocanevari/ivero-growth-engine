import { cn } from "@/lib/utils";

export type SectionHeaderTone = "primary" | "accent" | "emerald";

const TONE_CLASSES: Record<SectionHeaderTone, { dot: string; ring: string }> = {
  primary: { dot: "bg-primary", ring: "ring-primary/15" },
  accent: { dot: "bg-accent", ring: "ring-accent/15" },
  emerald: { dot: "bg-emerald-500", ring: "ring-emerald-500/15" },
};

interface SectionHeaderProps {
  children: React.ReactNode;
  tone?: SectionHeaderTone;
  className?: string;
}

/**
 * Título padronizado de seção do dashboard:
 * - tipografia bold em font-display, cor foreground (alto contraste vs. cards)
 * - bolinha colorida com halo (ring) para ancoragem visual
 * - divisor sutil abaixo (border-b)
 */
export function SectionHeader({ children, tone = "primary", className }: SectionHeaderProps) {
  const t = TONE_CLASSES[tone];
  return (
    <h2
      className={cn(
        "text-base sm:text-lg font-bold font-display text-foreground mb-4 flex items-center gap-2.5 pb-2 border-b border-border",
        className,
      )}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full ring-4", t.dot, t.ring)} />
      {children}
    </h2>
  );
}
