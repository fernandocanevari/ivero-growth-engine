import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { identifyLead, track } from "@/lib/analytics";

// Same strict schema used in the PreviewPage lead gate — keeps lead quality consistent
const heroLeadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(100, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .max(255, "E-mail muito longo")
    .refine((v) => /\.[a-z]{2,}$/i.test(v), "E-mail incompleto (ex: nome@empresa.com)"),
  site: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(20).optional(),
});

const HeroSection = () => {
  const [siteUrl, setSiteUrl] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSite, setFormSite] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const glowPurpleY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const glowPinkY   = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const streakY     = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const handleHeroFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = heroLeadSchema.safeParse({
      name: formName,
      email: formEmail,
      site: formSite,
      phone: formPhone,
    });
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados inválidos";
      toast({ title: "Verifique seus dados", description: firstError, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { name, email, site, phone } = parsed.data;
    try {
      await supabase
        .from("leads")
        .upsert(
          { email, name, site: site || "", phone: phone || "", source: "hero_form" } as any,
          { onConflict: "email" }
        );
    } catch (_) { /* silently continue — user still gets the diagnostic */ }

    // Funnel step 1: hero form submitted. Identify by email so we can stitch
    // the journey through preview gate → signup later.
    identifyLead(email, { name, source: "hero_form" });
    track("hero_form_submitted", {
      email,
      name,
      site: site || "",
      has_phone: !!phone,
      source: "hero_form",
    });

    const params = new URLSearchParams();
    if (site) params.set("url", site);
    params.set("name", name);
    params.set("email", email);
    if (phone) params.set("phone", phone);
    navigate(`/preview?${params.toString()}`);
  };

  return (
    <section id="diagnostico" ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden bg-surface-0 scroll-mt-20">
      {/* Subtle layered background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-0 via-surface-2 to-surface-0" />
      
      {/* Parallax: glow roxo (suavizado para fundo claro) */}
      <motion.div
        style={{ y: glowPurpleY }}
        className="absolute bottom-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-ivero-purple opacity-[0.06] blur-[120px] pointer-events-none"
      />
      
      {/* Parallax: glow pink */}
      <motion.div
        style={{ y: glowPinkY }}
        className="absolute bottom-[-100px] right-[-50px] w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] rounded-full bg-accent opacity-[0.05] blur-[100px] pointer-events-none"
      />
      
      {/* Parallax: light streak */}
      <motion.div
        style={{ y: streakY }}
        className="absolute bottom-0 right-[10%] w-[2px] h-[60%] bg-gradient-to-t from-ivero-purple-light/30 to-transparent pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-28 pb-16 sm:py-32 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start">
          {/* Left - Text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-5 sm:mb-6">
              <span className="text-foreground">Se a IA não cita sua marca, </span>
              <span className="text-gradient">você não existe</span>
              <span className="text-foreground"> para o seu cliente.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 sm:mb-10 leading-relaxed">
              A Ivero revela se sua marca é citada ou ignorada pelas principais IAs — e transforma esse dado em vantagem competitiva.
            </p>

            <div className="flex flex-col gap-3 w-full">
              {/* Input pill — empilhado no mobile */}
              <div className="relative group">
                {/* Animated glow behind */}
                <div className="absolute -inset-1 rounded-full sm:rounded-full rounded-2xl bg-gradient-to-r from-ivero-purple-light via-accent to-ivero-purple-light opacity-25 blur-md group-hover:opacity-40 group-focus-within:opacity-50 transition-opacity duration-500 animate-pulse" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:h-14 sm:rounded-full rounded-2xl bg-white border border-ivero-purple/25 overflow-hidden shadow-[0_4px_16px_hsl(265,60%,55%/0.12)] focus-within:shadow-[0_6px_24px_hsl(265,60%,55%/0.18)] transition-shadow duration-300">
                  <input
                    type="url"
                    placeholder="Digite o site da sua marca"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm sm:text-base outline-none border-none px-4 pt-4 pb-2 sm:px-5 sm:py-0"
                  />
                  <Button
                    variant="hero"
                    size="lg"
                    className="text-sm px-5 sm:px-6 h-12 sm:h-14 w-full sm:w-auto rounded-none rounded-b-2xl sm:rounded-none mx-0 shrink-0"
                    onClick={() => navigate(`/preview${siteUrl ? `?url=${encodeURIComponent(siteUrl)}` : ""}`)}
                  >
                    Ver agora se minha marca aparece nas IAs
                    <ArrowRight className="ml-1.5 w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-foreground text-sm sm:text-base font-medium ml-1 sm:ml-5">
                Veja análise instantânea da sua presença nas respostas da IA 🚀
              </p>
            </div>
          </motion.div>

          {/* Right - Signup Form (desktop only) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="hidden lg:flex justify-center -mt-2"
          >
            <div className="w-full max-w-md bg-white border border-ivero-purple/20 rounded-2xl p-8 shadow-[0_8px_30px_hsl(265,60%,55%/0.10)]">
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Descubra se sua marca já aparece nas respostas da IA.
              </h3>
              <p className="text-muted-foreground text-sm mb-6">Preencha os dados abaixo e comece agora.</p>

              <form className="flex flex-col gap-4" onSubmit={handleHeroFormSubmit}>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Nome"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-12 rounded-lg bg-surface-1 border border-ivero-purple/20 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <input
                  type="email"
                  required
                  maxLength={255}
                  placeholder="E-mail corporativo"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-12 rounded-lg bg-surface-1 border border-ivero-purple/20 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <input
                  type="text"
                  maxLength={255}
                  placeholder="Site da empresa"
                  value={formSite}
                  onChange={(e) => setFormSite(e.target.value)}
                  className="h-12 rounded-lg bg-surface-1 border border-ivero-purple/20 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <input
                  type="tel"
                  maxLength={20}
                  placeholder="Celular"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="h-12 rounded-lg bg-surface-1 border border-ivero-purple/20 px-4 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-ivero-purple/50 transition-colors"
                />
                <Button variant="hero" size="lg" className="w-full h-12 text-base mt-2" type="submit" disabled={submitting}>
                  {submitting ? "Processando..." : "Começar agora"}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
