/**
 * Content export helpers — gera arquivos .md e .docx no client
 * a partir do conteúdo do Gerador GEO. Sem chamada a backend.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
} from "docx";
import { marked } from "marked";

interface ExportInput {
  topic: string;
  article_md: string;
  faq: { question: string; answer: string }[];
  summary_md: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 60) || "conteudo-ivero"
  );
}

export function exportAsMarkdown(input: ExportInput) {
  const faqMd = input.faq
    .map((q) => `### ${q.question}\n\n${q.answer}`)
    .join("\n\n");
  const md = `# ${input.topic}\n\n## Resumo Executivo\n\n${input.summary_md}\n\n## Artigo\n\n${input.article_md}\n\n## FAQ\n\n${faqMd}\n`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${safeFilename(input.topic)}.md`);
}

/**
 * Parser leve de markdown → tokens do docx.
 * Cobre: H1-H4, parágrafo, bullet, numbered, código inline (sem bloco).
 */
function mdToParagraphs(md: string): Paragraph[] {
  const tokens = marked.lexer(md);
  const out: Paragraph[] = [];

  const inlineRuns = (text: string): TextRun[] => {
    // marked.parseInline returns HTML; instead, do a tiny manual pass for **bold** and *italic*.
    // Keep it simple to avoid HTML→OOXML complexity.
    const runs: TextRun[] = [];
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIndex) {
        runs.push(new TextRun({ text: text.slice(lastIndex, m.index) }));
      }
      if (m[2]) runs.push(new TextRun({ text: m[2], bold: true }));
      else if (m[3]) runs.push(new TextRun({ text: m[3], italics: true }));
      else if (m[4]) runs.push(new TextRun({ text: m[4], font: "Courier New" }));
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) {
      runs.push(new TextRun({ text: text.slice(lastIndex) }));
    }
    return runs.length ? runs : [new TextRun({ text })];
  };

  for (const tok of tokens) {
    if (tok.type === "heading") {
      const level = Math.min(Math.max(tok.depth, 1), 4);
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
      };
      out.push(
        new Paragraph({
          heading: headingMap[level],
          children: inlineRuns(tok.text),
        }),
      );
    } else if (tok.type === "paragraph") {
      out.push(new Paragraph({ children: inlineRuns(tok.text) }));
    } else if (tok.type === "list") {
      for (const item of tok.items) {
        const text = (item as any).text ?? "";
        out.push(
          new Paragraph({
            numbering: tok.ordered
              ? { reference: "numbers", level: 0 }
              : { reference: "bullets", level: 0 },
            children: inlineRuns(text),
          }),
        );
      }
    } else if (tok.type === "space") {
      out.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    } else if (tok.type === "code") {
      out.push(
        new Paragraph({
          children: [new TextRun({ text: (tok as any).text, font: "Courier New" })],
        }),
      );
    } else if ((tok as any).text) {
      out.push(new Paragraph({ children: inlineRuns((tok as any).text) }));
    }
  }
  return out;
}

export async function exportAsDocx(input: ExportInput) {
  const articleParas = mdToParagraphs(input.article_md);
  const summaryParas = mdToParagraphs(input.summary_md);

  const faqParas: Paragraph[] = [];
  for (const item of input.faq) {
    faqParas.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: item.question })],
      }),
    );
    faqParas.push(
      new Paragraph({ children: [new TextRun({ text: item.answer })] }),
    );
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 36, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 200, after: 160 }, outlineLevel: 1 },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 160, after: 120 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: input.topic })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Resumo Executivo" })],
          }),
          ...summaryParas,
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Artigo" })],
          }),
          ...articleParas,
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "FAQ" })],
          }),
          ...faqParas,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${safeFilename(input.topic)}.docx`);
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
