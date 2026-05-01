import jsPDF from "jspdf";
import type { CommercialProposal, PillarKey } from "./commercial-proposal";

const PILLAR_LABELS: Record<PillarKey, string> = {
  clareza: "Clareza",
  autoridade: "Autoridade",
  posicionamento: "Posicionamento",
  conversao: "Conversao",
  relevancia: "Relevancia",
};

interface DiagnosticData {
  url: string;
  brandName: string;
  overall: number;
  pillars: Record<PillarKey, { score: number; justificativa: string }>;
}

// Paleta (RGB) alinhada ao tema Ivero
const COLOR_BG: [number, number, number] = [13, 10, 25]; // ivero-dark
const COLOR_SURFACE: [number, number, number] = [22, 18, 38];
const COLOR_PURPLE: [number, number, number] = [155, 90, 230];
const COLOR_PINK: [number, number, number] = [220, 80, 200];
const COLOR_TEXT: [number, number, number] = [245, 240, 255];
const COLOR_MUTED: [number, number, number] = [170, 165, 195];

function statusColor(label: string): [number, number, number] {
  switch (label) {
    case "Referencia":
    case "Referência":
      return [52, 211, 153];
    case "Solido":
    case "Sólido":
      return [56, 189, 248];
    case "Insuficiente":
      return [251, 191, 36];
    default:
      return [244, 114, 114];
  }
}

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generateProposalPDF(
  diagnostic: DiagnosticData,
  proposal: CommercialProposal,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const fillBg = () => {
    doc.setFillColor(...COLOR_BG);
    doc.rect(0, 0, pageW, pageH, "F");
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      fillBg();
      y = margin;
    }
  };

  const text = (
    str: string,
    opts: {
      size?: number;
      color?: [number, number, number];
      bold?: boolean;
      maxW?: number;
      lineGap?: number;
    } = {},
  ) => {
    const size = opts.size ?? 11;
    const color = opts.color ?? COLOR_TEXT;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(stripAccents(str), opts.maxW ?? contentW);
    const lineH = size * 1.35 + (opts.lineGap ?? 0);
    lines.forEach((ln: string) => {
      ensureSpace(lineH);
      doc.text(ln, margin, y);
      y += lineH;
    });
  };

  fillBg();

  // ===== HEADER =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLOR_PURPLE);
  doc.text("IVERO", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_MUTED);
  doc.text("Proposta Estrategica de Visibilidade em IA", pageW - margin, y, {
    align: "right",
  });
  y += 28;
  doc.setDrawColor(...COLOR_PURPLE);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  // ===== HERO BRAND + SCORE =====
  text("DIAGNOSTICO ESTRATEGICO", { size: 9, color: COLOR_PURPLE, bold: true });
  y += 4;
  text(diagnostic.brandName, { size: 26, bold: true });
  text(diagnostic.url, { size: 10, color: COLOR_MUTED });
  y += 12;

  // Score box
  ensureSpace(110);
  doc.setFillColor(...COLOR_SURFACE);
  doc.roundedRect(margin, y, contentW, 90, 10, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.setTextColor(...COLOR_PURPLE);
  doc.text(`${diagnostic.overall}`, margin + 24, y + 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLOR_MUTED);
  doc.text("Score de visibilidade em IA", margin + 24, y + 76);

  // Status badge
  const badge = stripAccents(proposal.statusLabel);
  const badgeColor = statusColor(proposal.statusLabel);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const badgeW = doc.getTextWidth(badge) + 24;
  const badgeX = pageW - margin - badgeW - 16;
  const badgeY = y + 28;
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(badgeX, badgeY, badgeW, 24, 12, 12, "F");
  doc.setTextColor(13, 10, 25);
  doc.text(badge, badgeX + badgeW / 2, badgeY + 16, { align: "center" });
  y += 110;

  // Diagnose paragraph
  text(proposal.diagnosis, { size: 11, color: COLOR_TEXT });
  y += 12;

  // ===== PILARES =====
  ensureSpace(40);
  text("OS 5 PILARES", { size: 9, color: COLOR_PURPLE, bold: true });
  y += 4;
  text("Performance por dimensao", { size: 18, bold: true });
  y += 6;

  (Object.keys(PILLAR_LABELS) as PillarKey[]).forEach((key) => {
    const score = diagnostic.pillars[key]?.score ?? 0;
    const justif = diagnostic.pillars[key]?.justificativa ?? "";
    ensureSpace(70);
    doc.setFillColor(...COLOR_SURFACE);
    doc.roundedRect(margin, y, contentW, 60, 8, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_TEXT);
    doc.text(PILLAR_LABELS[key], margin + 16, y + 20);

    doc.setFontSize(16);
    doc.setTextColor(...COLOR_PURPLE);
    doc.text(`${score}`, pageW - margin - 16, y + 20, { align: "right" });

    // barra
    const barX = margin + 16;
    const barY = y + 30;
    const barW = contentW - 32;
    doc.setFillColor(40, 32, 60);
    doc.roundedRect(barX, barY, barW, 5, 2.5, 2.5, "F");
    doc.setFillColor(...COLOR_PURPLE);
    doc.roundedRect(barX, barY, (barW * score) / 100, 5, 2.5, 2.5, "F");

    if (justif) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_MUTED);
      const lines = doc.splitTextToSize(stripAccents(justif), contentW - 32);
      doc.text(lines.slice(0, 1), margin + 16, y + 50);
    }
    y += 70;
  });

  // ===== O QUE VAMOS RESOLVER =====
  if (proposal.weakPoints.length > 0) {
    y += 10;
    ensureSpace(40);
    text("SUA PROPOSTA PERSONALIZADA", {
      size: 9,
      color: COLOR_PURPLE,
      bold: true,
    });
    y += 4;
    text("O que vamos resolver primeiro", { size: 18, bold: true });
    y += 8;

    proposal.weakPoints.forEach((wp, i) => {
      ensureSpace(70);
      doc.setFillColor(...COLOR_SURFACE);
      doc.roundedRect(margin, y, contentW, 64, 8, 8, "F");
      // numero
      doc.setFillColor(...COLOR_PURPLE);
      doc.roundedRect(margin + 12, y + 14, 28, 28, 6, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(`${i + 1}`, margin + 26, y + 33, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(...COLOR_TEXT);
      doc.text(
        `${stripAccents(wp.label)}  (score: ${wp.score})`,
        margin + 52,
        y + 22,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_MUTED);
      const lines = doc.splitTextToSize(
        stripAccents(wp.action),
        contentW - 70,
      );
      doc.text(lines.slice(0, 2), margin + 52, y + 38);
      y += 74;
    });
  }

  // ===== PLANO RECOMENDADO =====
  doc.addPage();
  fillBg();
  y = margin;

  text("PLANO RECOMENDADO PARA VOCE", {
    size: 9,
    color: COLOR_PURPLE,
    bold: true,
  });
  y += 4;
  text(proposal.recommendedPlan.name, { size: 28, bold: true });
  text(proposal.recommendedPlan.tagline, { size: 11, color: COLOR_MUTED });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLOR_PINK);
  doc.text(stripAccents(proposal.recommendedPlan.annualPrice), margin, y + 8);
  if (proposal.recommendedPlan.annualPrice !== "Custom") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_MUTED);
    const priceW = doc.getTextWidth(
      stripAccents(proposal.recommendedPlan.annualPrice),
    );
    doc.text("/mes no anual", margin + priceW + 8, y + 8);
  }
  y += 28;

  proposal.recommendedPlan.highlights.forEach((h) => {
    ensureSpace(20);
    doc.setFillColor(...COLOR_PURPLE);
    doc.circle(margin + 4, y - 3, 2.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_TEXT);
    const lines = doc.splitTextToSize(stripAccents(h), contentW - 20);
    lines.forEach((ln: string, idx: number) => {
      ensureSpace(16);
      doc.text(ln, margin + 16, y + idx * 14);
    });
    y += lines.length * 14 + 6;
  });

  y += 10;
  ensureSpace(50);
  doc.setDrawColor(...COLOR_PURPLE);
  doc.setLineWidth(2);
  doc.line(margin, y, margin, y + 40);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_MUTED);
  const narrLines = doc.splitTextToSize(
    stripAccents(proposal.comparativeNarrative),
    contentW - 20,
  );
  narrLines.forEach((ln: string, idx: number) => {
    doc.text(ln, margin + 12, y + 12 + idx * 13);
  });
  y += narrLines.length * 13 + 30;

  // ===== PROXIMOS PASSOS =====
  ensureSpace(40);
  text("COMO FUNCIONA A PARTIR DAQUI", {
    size: 9,
    color: COLOR_PURPLE,
    bold: true,
  });
  y += 4;
  text("Proximos passos", { size: 18, bold: true });
  y += 6;

  proposal.nextSteps.forEach((step, i) => {
    ensureSpace(50);
    doc.setFillColor(...COLOR_SURFACE);
    doc.roundedRect(margin, y, contentW, 44, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...COLOR_PURPLE);
    doc.text(`0${i + 1}`, margin + 14, y + 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_TEXT);
    const lines = doc.splitTextToSize(stripAccents(step), contentW - 60);
    lines.slice(0, 2).forEach((ln: string, idx: number) => {
      doc.text(ln, margin + 48, y + 20 + idx * 13);
    });
    y += 54;
  });

  // ===== FOOTER em todas as paginas =====
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);
    doc.text("ivero.com.br  |  Proposta confidencial", margin, pageH - 20);
    doc.text(`${i} / ${total}`, pageW - margin, pageH - 20, {
      align: "right",
    });
  }

  const safeBrand = stripAccents(diagnostic.brandName)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  doc.save(`proposta-ivero-${safeBrand || "marca"}.pdf`);
}
