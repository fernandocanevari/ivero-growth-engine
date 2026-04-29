import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Cookie } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { applySEO } from "@/lib/seo";

/**
 * LGPD-compliant Cookie Policy page for Ivero.
 *
 * Required because the CookieConsentBanner now links here for the
 * official, legally-binding description of cookies the platform uses.
 * Mirrors the visual structure of PoliticaPrivacidadePage to stay on-brand.
 */
const SECTIONS = [
  { id: "o-que-sao", title: "1. O que são cookies" },
  { id: "tipos", title: "2. Tipos de cookies que usamos" },
  { id: "lista", title: "3. Lista de cookies da Ivero" },
  { id: "terceiros", title: "4. Cookies de terceiros" },
  { id: "gerenciar", title: "5. Como gerenciar e revogar" },
  { id: "direitos", title: "6. Seus direitos (LGPD)" },
  { id: "alteracoes", title: "7. Alterações desta política" },
  { id: "contato", title: "8. Contato" },
];

const PoliticaCookiesPage = () => {
  useEffect(() => {
    return applySEO({
      title: "Política de Cookies — Ivero",
      description:
        "Política de Cookies da Ivero em conformidade com a LGPD: quais cookies usamos, finalidade e como gerenciar seu consentimento.",
      path: "/politica-de-cookies",
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

          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Conformidade LGPD
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
              Política de Cookies
            </h1>
            <p className="text-base text-muted-foreground">
              Última atualização: 29 de abril de 2026 · Versão 1.0
            </p>
          </header>

          <nav
            aria-label="Sumário"
            className="mb-12 rounded-2xl border border-border bg-card/50 p-6"
          >
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Sumário
            </h2>
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-foreground/80 hover:text-primary transition-colors"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="prose prose-neutral max-w-none space-y-12 text-foreground/90 leading-relaxed">
            <section id="o-que-sao">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                1. O que são cookies
              </h2>
              <p>
                Cookies são pequenos arquivos de texto que um site armazena no seu navegador
                quando você o visita. Eles servem para lembrar preferências, manter você
                autenticado e medir como o site é utilizado. A Ivero utiliza cookies em
                conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>{" "}
                e exige seu consentimento explícito para qualquer cookie não essencial.
              </p>
            </section>

            <section id="tipos">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                2. Tipos de cookies que usamos
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Essenciais:</strong> indispensáveis para o funcionamento da plataforma
                  (autenticação, segurança, persistência da sessão). Não exigem consentimento.
                </li>
                <li>
                  <strong>Analíticos:</strong> nos ajudam a entender como você usa a Ivero para
                  melhorar o produto. Coletados via PostHog (instância EU Cloud, Frankfurt) e{" "}
                  <strong>só ativados após seu consentimento</strong> no banner exibido na primeira visita.
                </li>
                <li>
                  <strong>De preferência:</strong> lembram escolhas como idioma e estado da
                  interface para melhorar sua experiência.
                </li>
              </ul>
              <p className="mt-3">
                <strong>Não usamos cookies de publicidade nem de rastreamento entre sites.</strong>
              </p>
            </section>

            <section id="lista">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                3. Lista de cookies da Ivero
              </h2>
              <div className="overflow-x-auto not-prose">
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Nome</th>
                      <th className="text-left px-4 py-2 font-semibold">Categoria</th>
                      <th className="text-left px-4 py-2 font-semibold">Finalidade</th>
                      <th className="text-left px-4 py-2 font-semibold">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">sb-*-auth-token</td>
                      <td className="px-4 py-3">Essencial</td>
                      <td className="px-4 py-3">Autenticação Supabase</td>
                      <td className="px-4 py-3">Sessão</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">ivero_cookie_consent</td>
                      <td className="px-4 py-3">Essencial</td>
                      <td className="px-4 py-3">Lembra sua decisão sobre cookies</td>
                      <td className="px-4 py-3">12 meses</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">ph_*</td>
                      <td className="px-4 py-3">Analítico</td>
                      <td className="px-4 py-3">PostHog — métricas de uso</td>
                      <td className="px-4 py-3">12 meses</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="terceiros">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                4. Cookies de terceiros
              </h2>
              <p>
                Utilizamos somente prestadores essenciais e auditados, todos com cláusulas
                contratuais alinhadas à LGPD:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  <strong>PostHog (EU Cloud)</strong> — analytics agregado, hospedado em
                  Frankfurt. Política:{" "}
                  <a
                    href="https://posthog.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    posthog.com/privacy
                  </a>
                  .
                </li>
                <li>
                  <strong>Supabase</strong> — cookies essenciais de autenticação. Política:{" "}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    supabase.com/privacy
                  </a>
                  .
                </li>
              </ul>
            </section>

            <section id="gerenciar">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                5. Como gerenciar e revogar
              </h2>
              <p>Você tem três caminhos para controlar cookies a qualquer momento:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  <strong>Banner de consentimento:</strong> aceitar ou recusar cookies analíticos
                  na primeira visita.
                </li>
                <li>
                  <strong>Configurações do navegador:</strong> bloquear ou apagar cookies pelo
                  Chrome, Safari, Firefox ou Edge — instruções no site de cada navegador.
                </li>
                <li>
                  <strong>E-mail:</strong> escrever para{" "}
                  <a
                    href="mailto:privacidade@ivero.com.br"
                    className="text-primary hover:underline font-medium"
                  >
                    privacidade@ivero.com.br
                  </a>{" "}
                  pedindo revogação. Respondemos em até 15 dias úteis.
                </li>
              </ul>
              <p className="mt-3">
                Bloquear cookies essenciais pode quebrar funcionalidades como login e
                persistência de sessão.
              </p>
            </section>

            <section id="direitos">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                6. Seus direitos como titular (LGPD art. 18)
              </h2>
              <p>
                Você pode, a qualquer momento e gratuitamente, solicitar confirmação de
                tratamento, acesso, correção, anonimização, portabilidade, eliminação ou
                revogação do consentimento sobre dados coletados via cookies. Para detalhes
                completos, consulte nossa{" "}
                <Link to="/politica-de-privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </section>

            <section id="alteracoes">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                7. Alterações desta política
              </h2>
              <p>
                Atualizamos esta política sempre que adicionamos ou removemos cookies, ou que
                muda a finalidade de algum deles. Mudanças relevantes serão comunicadas com
                antecedência mínima de 15 dias. A versão e a data de atualização sempre estarão
                visíveis no topo deste documento.
              </p>
            </section>

            <section id="contato">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                8. Contato
              </h2>
              <div className="rounded-xl border border-border bg-card/50 p-5 not-prose">
                <p className="text-sm">
                  Encarregado pelo Tratamento de Dados (DPO) — Ivero
                </p>
                <p className="text-sm mt-1">
                  E-mail:{" "}
                  <a
                    href="mailto:privacidade@ivero.com.br"
                    className="text-primary hover:underline font-medium"
                  >
                    privacidade@ivero.com.br
                  </a>
                </p>
              </div>
            </section>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PoliticaCookiesPage;
