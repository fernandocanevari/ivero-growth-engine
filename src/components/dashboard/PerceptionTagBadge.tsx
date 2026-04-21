import { cn } from "@/lib/utils";
import type { PerceptionTone } from "@/lib/perception-tags";

interface PerceptionTagBadgeProps {
  tone: PerceptionTone;
  label: string;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

const toneStyles: Record<PerceptionTone, string> = {
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
};

const toneDot: Record<PerceptionTone, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function PerceptionTagBadge({
  tone,
  label,
  className,
  onClick,
  interactive,
}: PerceptionTagBadgeProps) {
  const isInteractive = interactive ?? !!onClick;
  const Comp: "button" | "span" = isInteractive ? "button" : "span";
  return (
    <Comp
      type={isInteractive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
        toneStyles[tone],
        isInteractive && "hover:shadow-sm hover:scale-[1.03] cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/40",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />
      {label}
    </Comp>
  );
}
