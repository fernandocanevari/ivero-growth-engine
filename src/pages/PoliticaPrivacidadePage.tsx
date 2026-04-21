import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

/**
 * LGPD-compliant Privacy Policy page for Ivero.
 *
 * Why this exists:
 *  - Required by LGPD (Lei 13.709/2018) art. 9º — transparency to data subjects.
 *  - Linked from the cookie consent banner ("Saiba mais") — must exist before publish.
 *
 * Editorial choices:
 *  - Plain Portuguese, no legalese-only vocabulary, but covering all LGPD pillars:
 *    finalidade, base legal, dados coletados, compartilhamento, direitos do titular,
 *    retenção, segurança, transferência internacional, contato do encarregado.
 *  - PostHog explicitly disclosed (EU Cloud, Frankfurt) — matches our analytics setup.
 *  - Hosted within the public landing layout (Navbar + Footer) so it remains on-brand.
 *
 * Note: contact email "privacidade@ivero.com.br" is a placeholder; the founder
 * should confirm or replace it before publishing the production site.
 */
const SECTIONS: { id: string; title: string }[] = [
  { id: "introducao", title: "1. Introdução" },
  { id: "dados", title: "2. Dados que coletamos" },
  { id: "finalidades", title: "3. Para que usamos seus dados" },
  { id: "base-legal", title: "4. Bases legais (LGPD)" },
  { id: "cookies", title: "5. Cookies e analytics" },
  { id: "compartilhamento", title: "6. Compartilhamento com terceiros" },
  { id: "transferencia", title: "7. Transferência internacional" },
  { id: "retencao", title: "8. Retenção de dados" },
  { id: "seguranca", title: "9. Segurança da informação" },
  { id: "direitos", title: "10. Seus direitos como titular" },
  { id: "menores", title: "11. Crianças e adolescentes" },
  { id: "alteracoes", title: "12. Alterações desta política" },
  { id: "contato", title: "13. Contato e encarregado (DPO)" },
];

const PoliticaPrivacidadePage = () => {
  // Basic SEO: title + description for an institutional page.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Política de Privacidade — Ivero";

    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? null;
    if (meta) {
      meta.setAttribute(
        "content",
        "Política de Privacidade da Ivero em conformidade com a LGPD: como coletamos, usamos e protegemos seus dados.",
      );
    }

    return () => {
      document.title = prevTitle;
      if (meta && prevDesc !== null) meta.setAttribute("content", prevDesc);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o início
          </Link>

          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Conformidade LGPD
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
              Política de Privacidade
            </h1>
            <p className="text-base text-muted-foreground">
              Última atualização: 21 de abril de 2026 · Versão 1.0
            </p>
          </header>

          {/* TOC */}
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

          {/* Content */}
          <article className="prose prose-neutral max-w-none space-y-12 text-foreground/90 leading-relaxed">
            <section id="introducao">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                1. Introdução
              </h2>
              <p>
                A <strong>Ivero</strong> ("nós", "nossa", "plataforma") respeita sua privacidade
                e está comprometida com a proteção dos seus dados pessoais. Esta política descreve,
                de forma transparente, quais informações coletamos, por que coletamos, como usamos,
                com quem compartilhamos e quais são os seus direitos como titular dos dados, em
                conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 —
                LGPD)</strong>.
              </p>
              <p className="mt-3">
                Ao utilizar a Ivero, você concorda com as práticas descritas nesta política. Caso
                não concorde, recomendamos que não utilize nossos serviços.
              </p>
            </section>

            <section id="dados">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                2. Dados que coletamos
              </h2>
              <p>Coletamos apenas os dados necessários para operar e melhorar a Ivero:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  <strong>Dados de cadastro:</strong> nome, e-mail corporativo, telefone, site
                  da empresa e setor de atuação.
                </li>
                <li>
                  <strong>Dados de uso da plataforma:</strong> análises geradas, marcas
                  monitoradas, concorrentes informados, histórico de pontuação e relatórios.
                </li>
                <li>
                  <strong>Dados técnicos:</strong> endereço IP (anonimizado), tipo de
                  dispositivo, navegador, sistema operacional e idioma.
                </li>
                <li>
                  <strong>Dados de navegação (analytics):</strong> páginas visitadas, cliques em
                  CTAs, tempo de permanência e origem do tráfego (UTM). Coletados via PostHog
                  apenas após seu consentimento explícito no banner de cookies.
                </li>
              </ul>
              <p className="mt-3">
                <strong>Não coletamos:</strong> dados sensíveis (origem racial, opinião política,
                religião, saúde, vida sexual, biometria) nem dados de menores de 18 anos.
              </p>
            </section>

            <section id="finalidades">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                3. Para que usamos seus dados
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Entregar o serviço contratado (análise de influência da sua marca em IAs).</li>
                <li>Autenticar seu acesso e proteger sua conta.</li>
                <li>Enviar comunicações operacionais (confirmações, alertas, faturas).</li>
                <li>Melhorar a usabilidade e desenvolver novas funcionalidades.</li>
                <li>Cumprir obrigações legais, regulatórias e fiscais.</li>
                <li>
                  Enviar comunicações de marketing — apenas com seu consentimento prévio e com
                  opção de descadastro a qualquer momento.
                </li>
              </ul>
            </section>

            <section id="base-legal">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                4. Bases legais (LGPD art. 7º e 11)
              </h2>
              <p>O tratamento dos seus dados é amparado pelas seguintes bases legais:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  <strong>Execução de contrato</strong> — para entregar o serviço que você
                  contratou.
                </li>
                <li>
                  <strong>Consentimento</strong> — para cookies analíticos e marketing.
                </li>
                <li>
                  <strong>Legítimo interesse</strong> — para segurança, prevenção de fraude e
                  melhoria contínua do produto, sempre balanceado com seus direitos.
                </li>
                <li>
                  <strong>Obrigação legal</strong> — para guarda fiscal e atendimento a
                  autoridades competentes.
                </li>
              </ul>
            </section>

            <section id="cookies">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                5. Cookies e analytics
              </h2>
              <p>
                Usamos cookies <strong>essenciais</strong> (autenticação, preferências) que não
                requerem consentimento, e cookies <strong>analíticos</strong> via{" "}
                <a
                  href="https://posthog.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  PostHog
                </a>{" "}
                (instância EU Cloud, hospedada em Frankfurt — Alemanha) para entender como você
                interage com a plataforma.
              </p>
              <p className="mt-3">
                Os cookies analíticos só são ativados após seu consentimento explícito no banner
                exibido em sua primeira visita. Você pode revogar esse consentimento a qualquer
                momento limpando os cookies do seu navegador ou nos contatando via e-mail.
              </p>
              <p className="mt-3">
                <strong>Não compartilhamos</strong> dados de navegação com redes de publicidade
                ou corretores de dados.
              </p>
            </section>

            <section id="compartilhamento">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                6. Compartilhamento com terceiros
              </h2>
              <p>
                Compartilhamos dados apenas com prestadores de serviço essenciais, todos
                contratualmente vinculados a cláusulas de confidencialidade e LGPD:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>
                  <strong>Supabase</strong> — banco de dados, autenticação e armazenamento
                  (operador).
                </li>
                <li>
                  <strong>PostHog (EU Cloud)</strong> — analytics de uso (operador).
                </li>
                <li>
                  <strong>OpenAI, Google, Anthropic, Perplexity</strong> — modelos de IA usados
                  para análise (operadores; consultas anonimizadas, sem PII).
                </li>
                <li>
                  <strong>Provedores de pagamento</strong> — para processar assinaturas.
                </li>
              </ul>
              <p className="mt-3">
                Nunca vendemos seus dados. Compartilhamento com autoridades só ocorre mediante
                ordem judicial ou requisição legal válida.
              </p>
            </section>

            <section id="transferencia">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                7. Transferência internacional
              </h2>
              <p>
                Alguns dos nossos prestadores de serviço estão localizados fora do Brasil
                (principalmente União Europeia e Estados Unidos). Garantimos que essas
                transferências cumprem os requisitos do art. 33 da LGPD, por meio de cláusulas
                contratuais padrão e/ou países com nível adequado de proteção.
              </p>
            </section>

            <section id="retencao">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                8. Retenção de dados
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Dados de cadastro e uso:</strong> mantidos enquanto sua conta estiver
                  ativa.
                </li>
                <li>
                  <strong>Após cancelamento:</strong> excluídos em até 90 dias, exceto quando a
                  lei exigir retenção (ex.: dados fiscais — 5 anos).
                </li>
                <li>
                  <strong>Dados analíticos:</strong> agregados e anonimizados após 12 meses.
                </li>
                <li>
                  <strong>Backups:</strong> mantidos por até 30 dias para fins de recuperação.
                </li>
              </ul>
            </section>

            <section id="seguranca">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                9. Segurança da informação
              </h2>
              <p>Adotamos medidas técnicas e organizacionais apropriadas:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Criptografia em trânsito (TLS 1.2+) e em repouso (AES-256).</li>
                <li>Row-Level Security (RLS) no banco de dados — cada cliente acessa apenas seus dados.</li>
                <li>Autenticação segura via Supabase Auth, com hash de senhas.</li>
                <li>Controle de acesso baseado em papéis e princípio do menor privilégio.</li>
                <li>Monitoramento contínuo e logs de auditoria.</li>
              </ul>
              <p className="mt-3">
                Em caso de incidente de segurança que represente risco aos titulares, comunicaremos
                a ANPD e os titulares afetados nos prazos previstos na LGPD.
              </p>
            </section>

            <section id="direitos">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                10. Seus direitos como titular (LGPD art. 18)
              </h2>
              <p>Você pode exercer, a qualquer momento e gratuitamente, os direitos de:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li><strong>Confirmação</strong> da existência de tratamento.</li>
                <li><strong>Acesso</strong> aos seus dados.</li>
                <li><strong>Correção</strong> de dados incompletos, inexatos ou desatualizados.</li>
                <li><strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários.</li>
                <li><strong>Portabilidade</strong> a outro fornecedor.</li>
                <li><strong>Eliminação</strong> dos dados tratados com base em consentimento.</li>
                <li><strong>Informação</strong> sobre compartilhamento com terceiros.</li>
                <li><strong>Revogação do consentimento</strong> a qualquer momento.</li>
                <li><strong>Oposição</strong> a tratamento que viole a LGPD.</li>
              </ul>
              <p className="mt-3">
                Para exercer qualquer um desses direitos, escreva para{" "}
                <a
                  href="mailto:privacidade@ivero.com.br"
                  className="text-primary hover:underline font-medium"
                >
                  privacidade@ivero.com.br
                </a>
                . Responderemos em até 15 dias.
              </p>
            </section>

            <section id="menores">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                11. Crianças e adolescentes
              </h2>
              <p>
                A Ivero é uma ferramenta B2B destinada a profissionais e empresas. Não coletamos
                intencionalmente dados de menores de 18 anos. Caso identifiquemos coleta acidental,
                excluiremos imediatamente.
              </p>
            </section>

            <section id="alteracoes">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                12. Alterações desta política
              </h2>
              <p>
                Podemos atualizar esta política periodicamente. Mudanças relevantes serão
                comunicadas por e-mail ou aviso em destaque na plataforma com antecedência mínima
                de 15 dias. A versão e a data de atualização sempre estarão visíveis no topo deste
                documento.
              </p>
            </section>

            <section id="contato">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                13. Contato e encarregado (DPO)
              </h2>
              <p>
                Em conformidade com o art. 41 da LGPD, designamos um Encarregado pelo Tratamento
                de Dados Pessoais (DPO). Para dúvidas, solicitações ou reclamações sobre o
                tratamento dos seus dados:
              </p>
              <div className="mt-4 rounded-xl border border-border bg-card/50 p-5 not-prose">
                <p className="text-sm">
                  <strong className="text-foreground">Encarregado de Dados (DPO):</strong>
                  <br />
                  <span className="text-muted-foreground">A definir</span>
                </p>
                <p className="text-sm mt-3">
                  <strong className="text-foreground">E-mail:</strong>{" "}
                  <a
                    href="mailto:privacidade@ivero.com.br"
                    className="text-primary hover:underline"
                  >
                    privacidade@ivero.com.br
                  </a>
                </p>
                <p className="text-sm mt-3">
                  <strong className="text-foreground">Autoridade Nacional (ANPD):</strong>{" "}
                  caso entenda que seus direitos não foram atendidos, você pode registrar
                  reclamação em{" "}
                  <a
                    href="https://www.gov.br/anpd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    gov.br/anpd
                  </a>
                  .
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

export default PoliticaPrivacidadePage;
