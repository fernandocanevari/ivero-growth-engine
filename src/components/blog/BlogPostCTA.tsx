import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";

interface BlogPostCTAProps {
  postSlug: string;
}

/**
 * Strategic CTA at the end of every blog post.
 *
 * Per project memory: B2B executive tool, no free plans, no generic newsletter.
 * Instead of capturing emails into a list (= marketing), we conduct readers
 * to the existing lead-magnet flow (the free strategic diagnostic) which:
 *  - feeds the real sales funnel
 *  - reuses the lead-capture infrastructure already in place
 *  - keeps the executive tone consistent
 *
 * UTM params let us attribute conversions back to specific blog posts.
 */
export function BlogPostCTA({ postSlug }: BlogPostCTAProps) {
  const href = `/?utm_source=blog&utm_medium=post&utm_campaign=${encodeURIComponent(
    postSlug,
  )}#diagnostico`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="my-16"
      aria-labelledby="post-cta-title"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-8 sm:p-10">
        {/* Decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
        />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Próximo passo
          </div>

          <h2
            id="post-cta-title"
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3"
          >
            Veja como sua marca aparece nas IAs hoje.
          </h2>

          <p className="text-base text-foreground/75 leading-relaxed max-w-2xl mb-6">
            Diagnóstico estratégico gratuito da Ivero: 5 modelos de IA analisam
            sua presença em minutos e entregam um score executivo por pilar —
            clareza, autoridade, posicionamento, conversão e experiência.
          </p>

          <Link
            to={href}
            onClick={() => track("blog_cta_click", { slug: postSlug })}
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Rodar meu diagnóstico
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Link>

          <p className="mt-4 text-xs text-foreground/55">
            Sem cartão de crédito. Resultado em até 60 segundos.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
