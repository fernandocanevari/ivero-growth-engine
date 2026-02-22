import { forwardRef } from "react";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
  text: string;
}

export const InfoTooltip = forwardRef<HTMLButtonElement, InfoTooltipProps>(
  ({ text }, ref) => {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={ref}
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors ml-1.5 h-5 w-5 shrink-0"
              aria-label="Mais informações"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs font-normal leading-relaxed">
            {text}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

InfoTooltip.displayName = "InfoTooltip";
