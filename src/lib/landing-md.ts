// Serializador Markdown da landing page.
//
// Puro e determinístico: mesma fonte de conteúdo → mesmo arquivo (nenhuma data
// ou valor de runtime), para que o teste de sincronia trave divergências.
// Consumido por vite-plugin-landing-md.ts, que grava public/landing.md.
//
// Imports relativos de propósito: este módulo também é carregado pelo Vite
// config (Node), onde o alias "@/" não está disponível.

import {
  AUDIENCE,
  CTA_SECTION,
  FAQ,
  FEATURES,
  FOOTER_COPY,
  HERO,
  LANDING_META,
  PRICING_COPY,
  PROBLEM,
  STEPS,
  plainHeadline,
} from "../content/landing";
import { PLANOS_ARRAY, formatBRL } from "./pricing-rules";

function heroSubheadline(): string {
  const s = HERO.subheadline;
  return [s.p1, s.pill1, s.p2, s.pill2, s.p3, s.pill3, s.p4].join(" ");
}

export function buildLandingMarkdown(): string {
  const L: string[] = [];

  L.push(`# ${LANDING_META.title}`);
  L.push("");
  L.push(`> ${LANDING_META.description}`);
  L.push("");
  L.push(`- URL canônica: ${LANDING_META.siteUrl}/`);
  L.push(`- Versão Markdown desta página: ${LANDING_META.siteUrl}/landing.md`);
  L.push(
    "- Esta é a versão em Markdown da página inicial da Ivero, publicada para leitura por agentes de IA. O conteúdo é gerado a partir da mesma fonte que a página em HTML.",
  );
  L.push("");

  // Hero
  L.push(`## ${plainHeadline(HERO.headline)}`);
  L.push("");
  L.push(heroSubheadline());
  L.push("");
  L.push(`Chamada para ação: **${HERO.ctaLabel}** (informe o site da sua empresa — ex.: ${HERO.inputPlaceholder}).`);
  L.push("");
  L.push(HERO.note);
  L.push("");

  // Problema
  L.push(`## ${plainHeadline(PROBLEM.headline)}`);
  L.push("");
  L.push(PROBLEM.subheadline);
  L.push("");
  for (const item of PROBLEM.items) {
    L.push(`- **${item.title}** — ${item.description}`);
  }
  L.push("");
  L.push(`Chamada para ação: **${PROBLEM.ctaLabel}**`);
  L.push("");

  // Passos
  L.push(`## ${plainHeadline(STEPS.headline)}`);
  L.push("");
  for (const step of STEPS.items) {
    L.push(`### Passo ${step.number} — ${step.title}`);
    L.push("");
    L.push(step.description);
    L.push("");
  }

  // Recursos
  L.push(`## ${plainHeadline(FEATURES.headline)}`);
  L.push("");
  for (const feature of FEATURES.items) {
    L.push(`- **${feature.title}** — ${feature.description}`);
  }
  L.push("");

  // CTA / dados de mercado
  L.push(`## ${plainHeadline(CTA_SECTION.headline)}`);
  L.push("");
  for (const stat of CTA_SECTION.stats) {
    L.push(`- **${stat.value}** ${stat.label}`);
  }
  L.push("");
  L.push(CTA_SECTION.paragraph);
  L.push("");
  L.push(`Chamada para ação: **${CTA_SECTION.ctaLabel}**`);
  L.push("");

  // Para quem
  L.push(`## ${plainHeadline(AUDIENCE.headline)}`);
  L.push("");
  for (const item of AUDIENCE.items) {
    L.push(`- **${item.strong1}**${item.middle}**${item.strong2}**`);
  }
  L.push("");

  // Planos
  L.push(`## ${plainHeadline(PRICING_COPY.headline)}`);
  L.push("");
  for (const plan of PLANOS_ARRAY) {
    L.push(`### ${plan.name} — ${plan.tagline}`);
    L.push("");
    L.push(
      `- Mensal: ${formatBRL(plan.monthlyPrice)}/mês · Anual: ${formatBRL(plan.annualPrice)}/mês (cobrança anual)`,
    );
    for (const metric of plan.metrics) {
      L.push(`- ${metric.label}: ${metric.value}`);
    }
    L.push("");
    if (plan.inheritsFrom) {
      L.push(`Tudo do plano ${plan.inheritsFrom} e mais:`);
    } else {
      L.push("Inclui:");
    }
    L.push("");
    for (const highlight of plan.highlights) {
      L.push(`- ${highlight}`);
    }
    L.push("");
    L.push(`Chamada para ação: **${PRICING_COPY.ctaByPlan[plan.key]}**`);
    L.push("");
  }

  L.push(
    `### ${PRICING_COPY.guarantee.titleBefore}${PRICING_COPY.guarantee.titleHighlight}`,
  );
  L.push("");
  for (const benefit of PRICING_COPY.guarantee.benefits) {
    L.push(`- ${benefit}`);
  }
  L.push("");
  L.push(PRICING_COPY.guarantee.footnoteParts.join(" • "));
  L.push("");

  // FAQ
  L.push(`## ${plainHeadline(FAQ.headline)}`);
  L.push("");
  for (const item of FAQ.items) {
    L.push(`### ${item.question}`);
    L.push("");
    L.push(item.answer);
    L.push("");
  }

  // Rodapé
  L.push("## Sobre a Ivero");
  L.push("");
  L.push(`${FOOTER_COPY.brand} — ${FOOTER_COPY.tagline}`);
  L.push("");
  L.push("### Links");
  L.push("");
  for (const column of FOOTER_COPY.columns) {
    const links = column.links
      .map((link) => `[${link.label}](${LANDING_META.siteUrl}${link.href})`)
      .join(" · ");
    L.push(`- **${column.title}:** ${links}`);
  }
  L.push("");
  L.push(FOOTER_COPY.copyright);
  L.push("");

  return `${L.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}
