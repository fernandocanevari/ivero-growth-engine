import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, Scale, ShieldCheck, Cookie, FileText } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { applySEO } from "@/lib/seo";

/**
 * /legal — central legal hub.
 *
 * Why a hub:
 *  - One canonical entry point listed in the Footer ("Legal").
 *  - Each card explains *what* the document covers so users find the right
 *    one in one click instead of scanning long titles.
 *  - Consistent visual language with the individual legal pages
 *    (PoliticaPrivacidadePage, PoliticaCookiesPage, TermosDeUsoPage).
 */
const DOCS = [
  {
    href: "/termos-de-uso",
    icon: FileText,
    title: "Termos de Uso",
    description:
      "Regras de acesso, planos, limites, propriedade intelectual, isenções e foro.",
    badge: "Contrato",
  },
  {
    href: "/politica-de-privacidade",
    icon: ShieldCheck,
    title: "Política de Privacidade",
    description:
      "Como coletamos, usamos, protegemos e compartilhamos seus dados — em conformidade com a LGPD.",
    badge: "LGPD",
  },
  {
    href: "/politica-de-cookies",
    icon: Cookie,
    title: "Política de Cookies",
    description:
      "Quais cookies utilizamos, finalidade, duração e como revogar o consentimento.",
    badge: "LGPD",
  },
];

const LegalPage = () => {
  useEffect(() => {
    return applySEO({
      title: "Legal — Ivero",
      description:
        "Documentos legais da Ivero: Termos de Uso, Política de Privacidade e Política de Cookies, em conformidade com a LGPD.",
      path: "/legal",
      ogType: "website",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o início
          </Link>

          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Scale className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Documentos legais
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
              Legal
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
              Transparência é parte do produto. Aqui ficam reunidos todos os documentos que
              regem o uso da Ivero e o tratamento dos seus dados.
            </p>
          </motion.header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOCS.map((doc, i) => {
              const Icon = doc.icon;
              return (
                <motion.div
                  key={doc.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                >
                  <Link
                    to={doc.href}
                    className="group block h-full rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
                      {doc.badge}
                    </span>
                    <h2 className="font-display text-lg font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
                      {doc.title}
                    </h2>
                    <p className="text-sm text-foreground/70 leading-relaxed">
                      {doc.description}
                    </p>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Contact strip */}
          <div className="mt-12 rounded-2xl border border-border bg-card/50 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-display font-bold text-foreground mb-1">
                Dúvidas sobre algum documento?
              </p>
              <p className="text-sm text-muted-foreground">
                Nosso encarregado de proteção de dados (DPO) responde em até 15 dias úteis.
              </p>
            </div>
            <a
              href="mailto:juridico@ivero.com.br"
              className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              juridico@ivero.com.br
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
