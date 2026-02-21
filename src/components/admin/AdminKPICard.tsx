import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminKPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
  trend?: { value: number; label: string };
}

export function AdminKPICard({ icon: Icon, label, value, subtitle, accent, trend }: AdminKPICardProps) {
  return (
    <Card className="border-border">
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={cn("text-lg font-bold", accent || "text-foreground")}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          {trend && (
            <div className={cn("text-xs font-semibold", trend.value >= 0 ? "text-emerald-600" : "text-destructive")}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              <p className="text-[10px] text-muted-foreground font-normal">{trend.label}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
