import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Construction } from "lucide-react";
import { InfoTooltip } from "@/components/InfoTooltip";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import { DiagnosticoTab } from "@/components/dashboard/llmstxt/DiagnosticoTab";

type TabKey = "diagnostico" | "gerador" | "monitoramento";

const TABS: { key: TabKey; label: string }[] = [
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "gerador", label: "Gerador" },
  { key: "monitoramento", label: "Monitoramento" },
];

const PLACEHOLDERS: Record<Exclude<TabKey, "diagnostico">, { title: string; description: string }> = {
  gerador: {
    title: "Gerador em construção",
    description: "Em breve o Ivero gera automaticamente o arquivo em markdown, pronto para você revisar e baixar.",
  },
  monitoramento: {
    title: "Monitoramento em construção",
    description: "Em breve o Ivero verifica semanalmente se o conteúdo do seu site mudou e alerta quando o llms.txt precisa ser atualizado.",
  },
};

export default function LlmsTxtPage() {
  const [active, setActive] = useState<TabKey>("diagnostico");
  const [sharedUrl, setSharedUrl] = useState("");
  const [active, setActive] = useState<TabKey>("diagnostico");

  useEffect(() => {
    document.title = "LLMs.txt | Ivero";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Gere, diagnostique e monitore o arquivo llms.txt da sua marca para orientar como as IAs leem e citam seu site.";
    if (meta) meta.setAttribute("content", content);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium text-foreground tracking-tight">LLMs.txt</h1>
        <div className="flex items-center mt-1.5">
          <p className="text-sm text-muted-foreground">
            Gere, diagnostique e monitore o arquivo que diz às IAs como ler e entender sua marca.
          </p>
          <InfoTooltip text="O arquivo llms.txt instrui os grandes modelos de linguagem (ChatGPT, Claude, Gemini) sobre o conteúdo do seu site, aumentando sua probabilidade de ser citado corretamente." />
        </div>
      </div>

      {/* Underline Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6" role="tablist" aria-label="Seções de LLMs.txt">
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => setActive(tab.key)}
                className={`relative pb-3 pt-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.span
                    layoutId="llmstxt-tab-underline"
                    className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content with fade transition */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <EmptyStateCard
              icon={active === "diagnostico" ? <FileCode className="h-8 w-8" /> : <Construction className="h-8 w-8" />}
              title={PLACEHOLDERS[active].title}
              description={PLACEHOLDERS[active].description}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
