import { motion } from "framer-motion";
import type { WelcomeFeature } from "@/lib/welcome-features";
import { cn } from "@/lib/utils";

interface FeatureHighlightCardProps {
  feature: WelcomeFeature;
  index?: number;
  locked?: boolean;
}

export function FeatureHighlightCard({ feature, index = 0, locked = false }: FeatureHighlightCardProps) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: locked ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className={cn(
        "relative bg-white border border-border rounded-xl p-5 transition",
        locked
          ? "grayscale cursor-default"
          : "hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-foreground/20"
      )}
    >
      {locked && (
        <span className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          Disponível após diagnóstico
        </span>
      )}
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", feature.iconBg)}>
        <Icon className={cn("w-5 h-5", feature.iconColor)} strokeWidth={2} />
      </div>
      <h3 className="text-[15px] font-medium text-foreground mt-3">{feature.title}</h3>
      <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">{feature.description}</p>
    </motion.div>
  );
}
