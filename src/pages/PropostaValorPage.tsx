import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Brain,
  Target,
  Zap,
  Eye,
  Award,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const PILLARS = [
  { icon: Eye, name: "Clareza", desc: "Sua proposta é entendida em <5s?" },
  { icon: Award, name: "Autoridade", desc: "Você tem provas que as IAs reconheçam?" },
  { icon: Target, name: "Posicionamento", desc: "Seu nicho está cristalino para a IA?" },
  { icon: Zap, name: "Conversão", desc: "O próximo passo é óbvio em qualquer ponto?" },
  { icon: Brain, name: "Relevância", desc: "Você cobre as perguntas reais do seu setor?" },
];

const PROBLEMAS = [
  {
    titulo: "O Google morreu para a decisão B2B",
    desc: "Executivos não 'pesquisam' mais. Eles perguntam direto ao ChatGPT — e tomam decisão na primeira resposta.",
  },
  {
    titulo: "ChatGPT virou o novo SDR",
    desc: "Quando alguém pergunta 'qual a melhor empresa de X?', a IA dá um nome. Se não é o seu, você nem sabia da venda.",
  },
  {
    titulo: "Sua marca está fora dessa conversa",
    desc: "Cada recomendação que a IA dá para o concorrente é uma reunião que você nunca terá. E isso acontece a cada segundo.",
  },
];

export default function PropostaValorPage() {
  const [siteUrl, setSiteUrl] = useState("");
  const navigate = useNavigate();
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const streakY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const submitDiagnostic = () => {
    const url = siteUrl.trim();
    navigate(`/propostacomercial${url ? `?url=${encodeURIComponent(url)}` : ""}`);
  };

  return (
    <div className="min-h-screen bg-ivero-dark text-primary-foreground font-sans overflow-x-hidden">
      <Helmet>
        <title>Proposta de Valor — Ivero | Auditoria de Influência em IA</title>
        <meta
          name="description"
          content="Sua marca está sendo recomendada pelas IAs ou está perdendo oportunidades a cada segundo? Descubra agora."
        />
      </Helmet>

      {/* Header enxuto */}
      <header className="sticky top-0 z-50 bg-ivero-dark/80 backdrop-blur-md border-b border-ivero-purple/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-display text-2xl font-bold text-gradient">
            Ivero
          </a>
          <a
            href="/"
            className="text-sm text-ivero-slate-light hover:text-primary-foreground transition-colors"
          >
            Voltar para o site
          </a>
        </div>
      </header>

      {/* HERO MANIFESTO */}
      <section
        ref={heroRef}
        className="relative min-h-[88vh] flex items-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(230,25%,6%)] via-ivero-dark to-[hsl(230,25%,6%)]" />
        <motion.div
          style={{ y: glowY }}
          className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-[hsl(265,70%,28%)] opacity-[0.10] blur-[120px] pointer-events-none"
        />
        <motion.div
          style={{ y: streakY }}
          className="absolute bottom-0 left-[15%] w-[2px] h-[60%] bg-gradient-to-t from-[hsl(330,85%,55%/0.4)] to-transparent pointer-events-none"
        />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 py-20 sm:py-28 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ivero-purple/10 border border-ivero-purple/30 text-sm text-ivero-slate-light mb-8"
          >
            <Sparkles className="w-4 h-4 text-ivero-purple" />
            Proposta de Valor Ivero
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6"
          >
            Sua marca não precisa ser{" "}
            <span className="text-ivero-slate-light line-through">encontrada</span>.
            <br />
            Precisa ser{" "}
            <span className="text-gradient">recomendada</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg sm:text-xl text-ivero-slate-light max-w-3xl mb-10 leading-relaxed"
          >
            Toda decisão B2B importante hoje começa com uma pergunta a uma IA.
            Se sua marca não aparece na resposta, você não perdeu o cliente —
            você nunca soube que ele existia.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-2xl"
          >
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl sm:rounded-full bg-gradient-to-r from-[hsl(265,70%,55%)] via-[hsl(300,70%,50%)] to-[hsl(265,70%,55%)] opacity-50 blur-lg group-focus-within:opacity-80 transition-opacity duration-500 animate-pulse" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitDiagnostic();
                }}
                className="relative flex flex-col sm:flex-row sm:items-center sm:h-14 sm:rounded-full rounded-2xl bg-ivero-dark-surface border border-ivero-purple/30 overflow-hidden shadow-[0_0_30px_hsl(265,60%,55%/0.3)]"
              >
                <input
                  type="text"
                  placeholder="Digite o site da sua marca"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="flex-1 bg-transparent text-primary-foreground placeholder:text-ivero-slate text-sm sm:text-base outline-none border-none px-5 pt-4 pb-2 sm:py-0"
                />
                <Button
                  variant="hero"
                  size="lg"
                  type="submit"
                  className="text-sm px-6 h-12 sm:h-14 w-full sm:w-auto rounded-none rounded-b-2xl sm:rounded-none shrink-0"
                >
                  Descubra sua visibilidade em IA
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </form>
            </div>
            <p className="text-primary-foreground/80 text-sm mt-4 ml-2">
              Diagnóstico em ~10s. Sem cadastro. Sem enrolação.
            </p>
          </motion.div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="py-20 sm:py-28 relative">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-sm font-semibold text-ivero-purple uppercase tracking-wider">
              O que ninguém te contou
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 mb-6">
              A regra do jogo mudou.
              <br />
              <span className="text-gradient">Você ainda joga o jogo antigo.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {PROBLEMAS.map((p, i) => (
              <motion.div
                key={p.titulo}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative p-8 rounded-2xl bg-gradient-to-br from-ivero-dark-surface to-ivero-dark border border-ivero-purple/20 hover:border-ivero-purple/40 transition-colors"
              >
                <div className="absolute -top-3 -left-3 w-12 h-12 rounded-xl bg-ivero-purple/20 border border-ivero-purple/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-ivero-purple" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3 mt-2">
                  {p.titulo}
                </h3>
                <p className="text-ivero-slate-light leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* A VIRADA */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-ivero-dark via-[hsl(265,40%,8%)] to-ivero-dark" />
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-sm font-semibold text-ivero-purple uppercase tracking-wider">
              A nossa tese
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 mb-8 leading-tight">
              SEO te coloca no Google.
              <br />
              <span className="text-gradient">
                A Ivero te coloca dentro da resposta da IA.
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-ivero-slate-light leading-relaxed max-w-3xl mx-auto">
              Não somos uma ferramenta de SEO repaginada. Somos um sistema de
              auditoria executiva que escuta o que ChatGPT, Gemini, Claude e
              Perplexity dizem da sua marca — e transforma isso em decisão
              estratégica antes que o concorrente perceba.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 5 PILARES */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="text-sm font-semibold text-ivero-purple uppercase tracking-wider">
              Os 5 pilares que decidem
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 mb-4">
              O que faz uma IA recomendar sua marca?
            </h2>
            <p className="text-ivero-slate-light max-w-2xl mx-auto">
              Auditamos os 5 sinais que determinam se você está dentro ou fora
              da resposta — e te entregamos exatamente onde agir.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="p-6 rounded-2xl bg-ivero-dark-surface border border-ivero-purple/20 hover:border-ivero-purple/50 hover:bg-ivero-dark-surface/80 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-ivero-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">
                    {p.name}
                  </h3>
                  <p className="text-sm text-ivero-slate-light leading-relaxed">
                    {p.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* POR QUE AGORA */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-ivero-dark via-[hsl(330,40%,8%)] to-ivero-dark" />
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-sm text-accent mb-6">
              <TrendingUp className="w-4 h-4" />
              Janela de oportunidade
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6 leading-tight">
              Os rankings de marca dentro das IAs
              <br />
              <span className="text-gradient">estão sendo escritos agora.</span>
            </h2>
            <p className="text-lg text-ivero-slate-light leading-relaxed mb-3">
              Cada citação que sua marca recebe (ou não recebe) hoje treina o
              modelo amanhã. As marcas que entrarem primeiro nesse jogo vão
              dominá-lo por anos. As que esperarem 12 meses vão pagar 10x mais
              caro para entrar.
            </p>
            <p className="text-primary-foreground font-semibold">
              A Ivero existe para te colocar na conversa antes que ela se feche.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl sm:text-5xl font-bold mb-5">
              Pronto para descobrir
              <br />
              <span className="text-gradient">onde sua marca está agora?</span>
            </h2>
            <p className="text-ivero-slate-light text-lg mb-10">
              Em menos de 10 segundos você vai ver o seu score nos 5 pilares e
              receber uma proposta comercial sob medida — sem precisar falar
              com ninguém.
            </p>

            <div className="relative group max-w-2xl mx-auto">
              <div className="absolute -inset-1 rounded-2xl sm:rounded-full bg-gradient-to-r from-[hsl(265,70%,55%)] via-[hsl(300,70%,50%)] to-[hsl(265,70%,55%)] opacity-50 blur-lg group-focus-within:opacity-80 transition-opacity duration-500 animate-pulse" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitDiagnostic();
                }}
                className="relative flex flex-col sm:flex-row sm:items-center sm:h-14 sm:rounded-full rounded-2xl bg-ivero-dark-surface border border-ivero-purple/30 overflow-hidden shadow-[0_0_30px_hsl(265,60%,55%/0.3)]"
              >
                <input
                  type="text"
                  placeholder="Digite o site da sua marca"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="flex-1 bg-transparent text-primary-foreground placeholder:text-ivero-slate text-sm sm:text-base outline-none border-none px-5 pt-4 pb-2 sm:py-0"
                />
                <Button
                  variant="hero"
                  size="lg"
                  type="submit"
                  className="text-sm px-6 h-12 sm:h-14 w-full sm:w-auto rounded-none rounded-b-2xl sm:rounded-none shrink-0"
                >
                  Quero meu diagnóstico
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer enxuto */}
      <footer className="border-t border-ivero-purple/10 py-8">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-xl font-bold text-gradient">
            Ivero
          </span>
          <span className="text-sm text-ivero-slate">
            © {new Date().getFullYear()} Ivero — Auditoria de Influência em IA
          </span>
        </div>
      </footer>
    </div>
  );
}
