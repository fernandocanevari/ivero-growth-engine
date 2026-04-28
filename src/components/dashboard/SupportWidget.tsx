import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Mail, LifeBuoy, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import {
  WHATSAPP_DISPLAY,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  getWhatsappUrl,
  getMailtoUrl,
} from "@/lib/support";
import { track } from "@/lib/analytics";

type Channel = "whatsapp" | "email" | "help_center";

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: settings } = useBrandSettings();
  const brandName = settings?.brand_name;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) track("support_widget_opened");
  };

  const handleChannel = (channel: Channel) => {
    track("support_channel_clicked", { channel });
    setOpen(false);
    if (channel === "help_center") {
      navigate("/dashboard/ajuda");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <motion.button
            type="button"
            aria-label="Abrir suporte"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-14 w-14 rounded-full bg-ivero-gradient text-primary-foreground shadow-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <X className="h-6 w-6" />
                </motion.span>
              ) : (
                <motion.span
                  key="chat"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <MessageCircle className="h-6 w-6" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="top"
          sideOffset={12}
          className="w-80 p-0 bg-background border border-border shadow-xl rounded-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border bg-secondary/40">
            <p className="text-sm font-semibold text-foreground">Precisa de ajuda?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Resposta em até 1 dia útil — {SUPPORT_HOURS}
            </p>
          </div>

          <div className="p-2 flex flex-col">
            <a
              href={getWhatsappUrl(brandName)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleChannel("whatsapp")}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <span className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground">WhatsApp</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {WHATSAPP_DISPLAY} — atendimento direto
                </span>
              </span>
            </a>

            <a
              href={getMailtoUrl(brandName)}
              onClick={() => handleChannel("email")}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <span className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground">Email</span>
                <span className="block text-xs text-muted-foreground truncate">{SUPPORT_EMAIL}</span>
              </span>
            </a>

            <button
              type="button"
              onClick={() => handleChannel("help_center")}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
            >
              <span className="h-9 w-9 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <LifeBuoy className="h-4 w-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-foreground">Central de Ajuda</span>
                <span className="block text-xs text-muted-foreground truncate">
                  Perguntas frequentes e tutoriais
                </span>
              </span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
