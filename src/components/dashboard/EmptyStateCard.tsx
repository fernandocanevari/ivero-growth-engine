import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

interface EmptyStateCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  className?: string;
}

export function EmptyStateCard({ icon, title, description, actionLabel, actionPath, className }: EmptyStateCardProps) {
  const navigate = useNavigate();

  return (
    <Card className={`border-dashed ${className || ""}`}>
      <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
        <div className="text-muted-foreground mb-3">{icon}</div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">{description}</p>
        {actionLabel && actionPath && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => navigate(actionPath)}
          >
            {actionLabel} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
