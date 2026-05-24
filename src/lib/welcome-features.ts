import { Stethoscope, Gauge, Radar, Zap, PencilLine, TrendingUp, type LucideIcon } from "lucide-react";

export type WelcomeFeature = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Background tone class for the icon square (Tailwind). */
  iconBg: string;
  /** Icon color class. */
  iconColor: string;
};

export const WELCOME_FEATURES: WelcomeFeature[] = [
  {
    id: "diagnostico",
    title: "Diagnóstico IA",
    description:
      "Analise em profundidade como sua marca é percebida e citada pelos grandes modelos de linguagem.",
    icon: Stethoscope,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    id: "score",
    title: "Score GEO",
    description:
      "Veja sua pontuação proprietária de presença algorítmica e compare com benchmarks do seu setor.",
    icon: Gauge,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    id: "monitoramento",
    title: "Monitoramento Multi-IA",
    description:
      "Acompanhe em tempo real como ChatGPT, Gemini, Claude e Perplexity falam sobre sua marca.",
    icon: Radar,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
  },
  {
    id: "acoes",
    title: "Planos de Ação",
    description:
      "Receba recomendações práticas e priorizadas para melhorar sua visibilidade nas IAs.",
    icon: Zap,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    id: "conteudo",
    title: "Gerador de Conteúdo",
    description:
      "Crie conteúdos otimizados para serem citados e recomendados pelos modelos de IA.",
    icon: PencilLine,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    id: "evolucao",
    title: "Evolução Estratégica",
    description:
      "Acompanhe a evolução do seu Score GEO ao longo do tempo e meça o impacto das ações.",
    icon: TrendingUp,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
];
