import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { applySEO } from "@/lib/seo";

/**
 * Termos de Uso da Ivero — documento jurídico vinculante.
 *
 * Editorial choices:
 *  - Estrutura espelha a PoliticaPrivacidadePage (sumário + seções)
 *    para que o Hub /legal apresente padrão visual consistente.
 *  - Cobre: aceitação, conta, planos, uso permitido/proibido, propriedade
 *    intelectual, isenções, rescisão, foro — pilares mínimos para um SaaS B2B.
 *  - Texto em PT-BR claro; foro em São Paulo (placeholder — fundador deve
 *    confirmar antes de publicar).
 */
const SECTIONS = [
  { id: "aceitacao", title: "1. Aceitação dos termos" },
  { id: "servico", title: "2. Descrição do serviço" },
  { id: "conta", title: "3. Cadastro e conta" },
  { id: "planos", title: "4. Planos, pagamentos e renovação" },
  { id: "uso-permitido", title: "5. Uso permitido" },
  { id: "uso-proibido", title: "6. Uso proibido" },
  { id: "propriedade", title: "7. Propriedade intelectual" },
  { id: "dados", title: "8. Dados do cliente e privacidade" },
  { id: "ia", title: "9. Conteúdo gerado por IA" },
  { id: "disponibilidade", title: "10. Disponibilidade e SLA" },
  { id: "isencao", title: "11. Limitação de responsabilidade" },
  { id: "rescisao", title: "12. Rescisão e cancelamento" },
  { id: "alteracoes", title: "13. Alterações nos termos" },
  { id: "lei", title: "14. Lei aplicável e foro" },
  { id: "contato", title: "15. Contato" },
];

const TermosDeUsoPage = () => {
  useEffect(() => {
    return applySEO({
      title: "Termos de Uso — Ivero",
      description:
        "Termos e condições de uso da plataforma Ivero: regras de acesso, planos, limitação de responsabilidade e foro aplicável.",
      path: "/termos-de-uso",
      ogType: "website",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <Link
            to="/legal"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Legal
          </Link>

          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Documento jurídico
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
              Termos de Uso
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
            <section id="aceitacao">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                1. Aceitação dos termos
              </h2>
              <p>
                Ao criar uma conta, acessar ou utilizar a plataforma <strong>Ivero</strong>{" "}
                ("Plataforma", "Serviço"), você ("Cliente", "Usuário") concorda integralmente
                com estes Termos de Uso e com a nossa{" "}
                <Link to="/politica-de-privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>{" "}
                e{" "}
                <Link to="/politica-de-cookies" className="text-primary hover:underline">
                  Política de Cookies
                </Link>
                . Se você não concorda com qualquer cláusula, não utilize a Plataforma.
              </p>
              <p className="mt-3">
                Estes Termos formam um contrato vinculante entre você (ou a empresa que você
                representa) e a Ivero.
              </p>
            </section>

            <section id="servico">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                2. Descrição do serviço
              </h2>
              <p>
                A Ivero é uma plataforma B2B de auditoria de influência de marca em modelos
                de Inteligência Artificial generativa. Coletamos, processamos e apresentamos
                dados sobre como sua marca é descrita pelos principais LLMs do mercado
                (OpenAI, Google Gemini, Anthropic Claude, Perplexity, GitHub Copilot), gerando
                relatórios e métricas como o AI Influence Score.
              </p>
            </section>

            <section id="conta">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                3. Cadastro e conta
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Você deve ter 18 anos ou mais e capacidade legal para contratar.</li>
                <li>
                  Os dados informados no cadastro devem ser verdadeiros, completos e
                  atualizados.
                </li>
                <li>
                  Você é responsável pela guarda das suas credenciais e por toda atividade
                  realizada na sua conta.
                </li>
                <li>
                  Notifique-nos imediatamente em caso de uso não autorizado ou suspeita de
                  comprometimento via{" "}
                  <a
                    href="mailto:suporte@ivero.com.br"
                    className="text-primary hover:underline"
                  >
                    suporte@ivero.com.br
                  </a>
                  .
                </li>
              </ul>
            </section>

            <section id="planos">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                4. Planos, pagamentos e renovação
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Os planos vigentes (Presença, Influência, Autoridade e Domínio) e seus
                  preços estão descritos na seção de Preços do site.
                </li>
                <li>
                  As assinaturas são cobradas de forma recorrente (mensal ou anual) e
                  renovadas automaticamente no fim de cada ciclo, salvo cancelamento prévio.
                </li>
                <li>
                  Reajustes anuais podem ocorrer com aviso de 30 dias por e-mail. Você pode
                  cancelar antes da renovação se não concordar.
                </li>
                <li>
                  Não oferecemos plano gratuito permanente. Diagnósticos pontuais via
                  /preview são gratuitos para fins de avaliação.
                </li>
                <li>
                  Reembolsos seguem o Código de Defesa do Consumidor (quando aplicável) — para
                  contratos B2B, regem as cláusulas específicas do plano contratado.
                </li>
              </ul>
            </section>

            <section id="uso-permitido">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                5. Uso permitido
              </h2>
              <p>Você pode utilizar a Plataforma para:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Auditar a presença da sua própria marca em IAs.</li>
                <li>
                  Comparar com concorrentes diretos com base em informações públicas das
                  respostas das IAs.
                </li>
                <li>
                  Gerar relatórios e exportações para uso interno ou apresentação a
                  stakeholders.
                </li>
                <li>
                  Usar os insights para orientar estratégia de conteúdo, marketing e
                  branding.
                </li>
              </ul>
            </section>

            <section id="uso-proibido">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                6. Uso proibido
              </h2>
              <p>É expressamente vedado:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Revender, sublicenciar ou redistribuir o acesso à Plataforma.</li>
                <li>
                  Realizar engenharia reversa, scraping massivo ou tentativas de extrair
                  modelos proprietários.
                </li>
                <li>
                  Usar a Plataforma para difamar, atacar ou prejudicar terceiros — análises
                  são para uso interno e estratégico.
                </li>
                <li>
                  Acessar contas de outros usuários sem autorização.
                </li>
                <li>
                  Carregar conteúdo ilícito, malware, ou que viole direitos de terceiros.
                </li>
                <li>
                  Automatizar requisições além dos limites do plano contratado.
                </li>
              </ul>
              <p className="mt-3">
                O descumprimento pode resultar em suspensão imediata sem reembolso.
              </p>
            </section>

            <section id="propriedade">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                7. Propriedade intelectual
              </h2>
              <p>
                Todo o software, marca, design, código, metodologia (incluindo o framework do
                AI Influence Score), documentação e materiais da Ivero são de propriedade
                exclusiva da empresa, protegidos pelas leis de propriedade intelectual.
              </p>
              <p className="mt-3">
                Você recebe uma licença <strong>limitada, não exclusiva, intransferível e
                revogável</strong> para usar a Plataforma durante a vigência da sua
                assinatura. Os relatórios gerados pertencem a você e podem ser usados
                livremente para fins internos.
              </p>
            </section>

            <section id="dados">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                8. Dados do cliente e privacidade
              </h2>
              <p>
                O tratamento de dados pessoais é regido pela nossa{" "}
                <Link to="/politica-de-privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
                , em conformidade com a LGPD. Os dados de auditoria gerados na sua conta são
                de sua propriedade — funcionamos como operador desses dados sob suas
                instruções.
              </p>
            </section>

            <section id="ia">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                9. Conteúdo gerado por IA
              </h2>
              <p>
                A Ivero consulta modelos de IA de terceiros e apresenta as respostas geradas
                como dados de análise. Esses conteúdos refletem o estado dos modelos no
                momento da consulta e podem conter imprecisões, alucinações ou viés inerentes
                à tecnologia.
              </p>
              <p className="mt-3">
                Você reconhece que: (i) o conteúdo gerado por IA não constitui
                aconselhamento profissional, jurídico ou financeiro; (ii) a Ivero não se
                responsabiliza pela exatidão das respostas dos LLMs de terceiros; (iii) a
                interpretação estratégica das análises é de sua responsabilidade.
              </p>
            </section>

            <section id="disponibilidade">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                10. Disponibilidade e SLA
              </h2>
              <p>
                Trabalhamos com meta de 99,5% de disponibilidade mensal, excluídas janelas de
                manutenção programada (comunicadas com 48h de antecedência) e indisponibilidades
                causadas por terceiros (provedores de IA, infraestrutura cloud, ataques DDoS).
              </p>
              <p className="mt-3">
                Indisponibilidades programadas e não programadas serão comunicadas via e-mail
                ou na própria Plataforma quando aplicável.
              </p>
            </section>

            <section id="isencao">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                11. Limitação de responsabilidade
              </h2>
              <p>
                Na máxima extensão permitida pela legislação aplicável, a responsabilidade
                total da Ivero em relação a qualquer reclamação decorrente do uso da
                Plataforma fica limitada ao valor pago pelo Cliente nos 12 meses anteriores
                ao evento.
              </p>
              <p className="mt-3">
                A Ivero não responde por: lucros cessantes, perda de oportunidade comercial,
                danos indiretos ou consequenciais, ou decisões de negócio tomadas com base
                exclusiva nos relatórios gerados pela Plataforma.
              </p>
            </section>

            <section id="rescisao">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                12. Rescisão e cancelamento
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Você pode cancelar sua assinatura a qualquer momento na seção
                  Assinatura do Dashboard.
                </li>
                <li>
                  O acesso permanece ativo até o fim do ciclo de cobrança já pago.
                </li>
                <li>
                  Após o cancelamento, seus dados são excluídos em até 90 dias, exceto
                  obrigação legal de retenção.
                </li>
                <li>
                  A Ivero pode rescindir contas que violem estes Termos com aviso prévio
                  quando viável, ou imediatamente em casos graves.
                </li>
              </ul>
            </section>

            <section id="alteracoes">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                13. Alterações nos termos
              </h2>
              <p>
                Podemos atualizar estes Termos periodicamente. Mudanças relevantes serão
                comunicadas por e-mail ou aviso em destaque na Plataforma com antecedência
                mínima de 30 dias. O uso continuado após a vigência da nova versão implica
                aceitação das alterações.
              </p>
            </section>

            <section id="lei">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                14. Lei aplicável e foro
              </h2>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica
                eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias
                decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais
                privilegiado que seja.
              </p>
            </section>

            <section id="contato">
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">
                15. Contato
              </h2>
              <div className="rounded-xl border border-border bg-card/50 p-5 not-prose">
                <p className="text-sm">
                  Dúvidas sobre estes Termos:
                </p>
                <p className="text-sm mt-1">
                  E-mail:{" "}
                  <a
                    href="mailto:juridico@ivero.com.br"
                    className="text-primary hover:underline font-medium"
                  >
                    juridico@ivero.com.br
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

export default TermosDeUsoPage;
