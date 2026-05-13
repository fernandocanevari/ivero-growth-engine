import { motion } from "framer-motion";
import { ArrowRight, Lightbulb, Target, Zap, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

/* ── Timeline data ── */
const milestones = [
  {
    year: "2024",
    title: "A revelação",
    description:
      "Percebemos que executivos já não perguntavam apenas ao Google sobre fornecedores. ChatGPT, Gemini e Claude haviam se tornado o primeiro contato de decisores — e a maioria das marcas nem sabia que estava sendo julgada por algoritmos, não por humanos.",
    icon: Lightbulb,
    highlight: "O problema",
  },
  {
    year: "2025",
    title: "A missão",
    description:
      "Nasceu a Ivero: uma plataforma de inteligência para medir, auditar e melhorar como empresas aparecem nas respostas de IA. Não se tratava de SEO tradicional — era um novo campo, o GEO (Generative Engine Optimization).",
    icon: Target,
    highlight: "A solução",
  },
  {
    year: "2025",
    title: "Multi-modelo",
    description:
      "Desenvolvemos nossa infraestrutura para consultar simultaneamente OpenAI, Gemini, GPT-5 e Gemini Search. Cada modelo &quot;pensa&quot; diferente — entender todos é a única forma de mapear a verdadeira percepção da marca.",
    icon: Zap,
    highlight: "Tecnologia",
  },
  {
    year: "2026",
    title: "Plataforma completa",
    description:
      "De diagnóstico inicial a estratégia de conteúdo, passando por monitoramento contínuo, alertas de mudança de percepção e relatórios executivos. A Ivero se tornou o sistema operacional de influência em IA para B2B.",
    icon: TrendingUp,
    highlight: "Evolução",
  },
];

const values = [
  {
    title: "Transparência algorítmica",
    text: "Mostramos exatamente como cada IA &quot;vê&quot; a marca, sem caixa-preta. O executivo merece entender o que está por trás do veredito.",
  },
  {
    title: "Ação sobre dados",
    text: "Diagnóstico sem plano de ação é curiosidade. Cada insight na Ivero vem acompanhado de recomendação executiva clara e priorizada.",
  },
  {
    title: "Futuro antecipado",
    text: "IA evolui sem avisar. Monitoramos mudanças de comportamento dos modelos e alertamos o cliente antes que a concorrência reaja.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              Nossa trajetória
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              A Ivero nasceu da observação de
              <span className="text-gradient"> um comportamento silencioso</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Em 2024, executivos já consultavam IAs antes de contratar. Mas ninguém media
              o que essas IAs diziam sobre cada marca. Resolvemos mudar isso.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

            <div className="space-y-16">
              {milestones.map((m, i) => {
                const Icon = m.icon;
                const isLeft = i % 2 === 0;
                return (
                  <motion.div
                    key={m.title}
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                    className={`relative flex items-start gap-6 ${
                      isLeft ? "sm:flex-row" : "sm:flex-row-reverse"
                    }`}
                  >
                    {/* Icon node */}
                    <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 z-10">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>

                    {/* Card */}
                    <div
                      className={`ml-14 sm:ml-0 sm:w-[calc(50%-40px)] ${
                        isLeft ? "sm:pr-8 sm:text-right" : "sm:pl-8 sm:text-left"
                      }`}
                    >
                      <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                        {m.highlight}
                      </div>
                      <span className="block text-sm text-muted-foreground font-medium mb-1">
                        {m.year}
                      </span>
                      <h3 className="font-display text-xl font-bold mb-2">{m.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-14">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              O que nos guia
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              Princípios que não negociamos
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/20 transition-colors"
              >
                <h3 className="font-display text-lg font-bold mb-3">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team vibe ── */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Feito por quem entende de IA e de marca
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
              A Ivero é construída por uma equipe híbrida: engenheiros de machine learning,
              estrategistas de marca e copywriters que entendem como linguagem molda percepção.
              Não acreditamos em dashboards genéricos — acreditamos em inteligência que gera ação.
            </p>
            <p className="text-sm text-muted-foreground italic">
              &quot;Feito com o coração.&quot; — Ivero
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-b from-transparent to-muted/50">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Quer fazer parte dessa história?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Descubra como sua marca aparece nas IAs hoje e comece a construir
              visibilidade que perdura.
            </p>
            <Button variant="hero" size="lg" className="px-8 gap-2" asChild>
              <a href="/preview">
                Ver como apareço nas IAs
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
