/**
 * Geração de PDF a partir de qualquer container de relatório.
 *
 * Reaproveita a estratégia já validada na PreviewPage:
 *  - força layout/animations visíveis,
 *  - renderiza cada seção com html2canvas,
 *  - empacota em A4 fazendo slicing quando a seção é maior que a página.
 *
 * Usar `data-pdf-section` nos blocos de topo do relatório para um corte limpo.
 * Fallback: usa os filhos diretos do container.
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ExportReportOptions {
  filename: string;
}

export async function exportReportToPDF(
  rootEl: HTMLElement,
  { filename }: ExportReportOptions,
) {
  const el = rootEl;

  // 1. Scroll to top to avoid offset issues
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 100));

  // 2. Force all content visible
  const originalHeight = el.style.height;
  const originalOverflow = el.style.overflow;
  const originalPosition = el.style.position;
  el.style.height = "auto";
  el.style.overflow = "visible";
  el.style.position = "relative";

  // 3. Force animated elements (framer-motion) to be fully visible
  const allEls = el.querySelectorAll<HTMLElement>("*");
  const savedStyles: { el: HTMLElement; opacity: string; transform: string; visibility: string }[] = [];
  allEls.forEach((m) => {
    if (m.style.opacity !== "" || m.style.transform !== "" || m.style.visibility === "hidden") {
      savedStyles.push({ el: m, opacity: m.style.opacity, transform: m.style.transform, visibility: m.style.visibility });
      m.style.opacity = "1";
      m.style.transform = "none";
      m.style.visibility = "visible";
    }
  });

  // 4. Wait for layout recalc
  await new Promise((r) => setTimeout(r, 500));

  try {
    // 5. Find sections
    const contentArea = (el.querySelector(".space-y-8") as HTMLElement) || el;
    let sections = Array.from(contentArea.querySelectorAll<HTMLElement>("[data-pdf-section]"));
    if (sections.length === 0) {
      sections = Array.from(contentArea.children) as HTMLElement[];
    }
    sections = sections.filter((s) => s.offsetHeight > 0 && s.offsetWidth > 0);

    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const MARGIN_MM = 10;
    const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
    const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;
    const SECTION_GAP_MM = 3;

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let currentY = MARGIN_MM;

    for (const section of sections) {
      const canvas = await html2canvas(section, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 800,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
      });
      if (canvas.width === 0 || canvas.height === 0) continue;

      const scaleFactor = CONTENT_WIDTH_MM / (canvas.width / 2);
      const sectionHeightMM = (canvas.height / 2) * scaleFactor;
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const remainingSpace = A4_HEIGHT_MM - MARGIN_MM - currentY;

      if (sectionHeightMM <= remainingSpace) {
        pdf.addImage(imgData, "JPEG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, sectionHeightMM);
        currentY += sectionHeightMM + SECTION_GAP_MM;
      } else if (sectionHeightMM <= CONTENT_HEIGHT_MM) {
        pdf.addPage();
        currentY = MARGIN_MM;
        pdf.addImage(imgData, "JPEG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, sectionHeightMM);
        currentY += sectionHeightMM + SECTION_GAP_MM;
      } else {
        if (currentY > MARGIN_MM + 1) {
          pdf.addPage();
          currentY = MARGIN_MM;
        }
        const totalSlices = Math.ceil(sectionHeightMM / CONTENT_HEIGHT_MM);
        for (let s = 0; s < totalSlices; s++) {
          if (s > 0) pdf.addPage();
          const yOffset = MARGIN_MM - s * CONTENT_HEIGHT_MM;
          pdf.addImage(imgData, "JPEG", MARGIN_MM, yOffset, CONTENT_WIDTH_MM, sectionHeightMM);
        }
        const lastSliceUsed = sectionHeightMM % CONTENT_HEIGHT_MM;
        currentY = MARGIN_MM + (lastSliceUsed > 0 ? lastSliceUsed : CONTENT_HEIGHT_MM) + SECTION_GAP_MM;
      }
    }

    pdf.save(filename);
  } finally {
    // Restore styles
    el.style.height = originalHeight;
    el.style.overflow = originalOverflow;
    el.style.position = originalPosition;
    savedStyles.forEach(({ el: m, opacity, transform, visibility }) => {
      m.style.opacity = opacity;
      m.style.transform = transform;
      m.style.visibility = visibility;
    });
  }
}

/** Sanitiza um trecho de URL/string para usar como sufixo de nome de arquivo. */
export function safeFileSlug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^https?:\/\//i, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "marca"
  );
}
