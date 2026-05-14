import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

interface EmptyStatePageProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  message: string;
  hasBrand: boolean;
  /** Texto explicativo exibido abaixo da message (substitui o texto padrão de "coletando dados"). */
  description?: string;
  /** CTA opcional exibido quando a marca já está configurada. */
  cta?: { label: string; to: string; icon?: ReactNode };
}

export function EmptyStatePage({ icon, title, subtitle, message, hasBrand, description, cta }: EmptyStatePageProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="text-muted-foreground mb-4">{icon}</div>
            <p className="text-base font-medium text-foreground">{message}</p>
            {description ? (
              <p className="text-sm text-muted-foreground mt-2 max-w-md">{description}</p>
            ) : (
              !(hasBrand && cta) && (
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  {hasBrand
                    ? "Seus dados estão sendo coletados. Assim que estiverem prontos, as informações aparecerão aqui automaticamente."
                    : "Configure sua marca nas configurações para começar a coletar dados."}
                </p>
              )
            )}
            {!hasBrand && (
              <Button className="mt-4" onClick={() => navigate("/dashboard/configuracoes")}>
                <Settings className="h-4 w-4 mr-2" /> Configurar marca
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
            {hasBrand && cta && (
              <Button className="mt-5" onClick={() => navigate(cta.to)}>
                {cta.icon}
                {cta.label}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
