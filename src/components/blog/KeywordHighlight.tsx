import { useMemo, type ReactNode } from "react";

/**
 * Highlights the FIRST occurrence of each keyword inside a text block.
 *
 * Why first-occurrence-only:
 *  - Avoids keyword stuffing (Google penalty) while still giving the term
 *    semantic weight via <mark> for both search engines and LLM extractors
 *    (Perplexity, ChatGPT search, Gemini).
 *
 * Behavior:
 *  - Sort longest-first so multi-word phrases ("Generative Engine
 *    Optimization") win over their substrings ("GEO").
 *  - Case-insensitive match preserves the author's casing in output.
 *  - Each keyword is consumed after its first hit (one highlight per kw).
 */
interface Props {
  text: string;
  keywords: string[];
}

export function KeywordHighlight({ text, keywords }: Props) {
  const nodes = useMemo<ReactNode[]>(() => {
    if (!keywords.length || !text) return [text];

    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    const used = new Set<string>();
    const segments: ReactNode[] = [];
    let cursor = 0; // start of next un-emitted slice
    let i = 0;
    let key = 0;

    while (i < text.length) {
      let matched: string | null = null;
      for (const kw of sorted) {
        if (used.has(kw)) continue;
        if (kw.length > text.length - i) continue;
        if (text.substr(i, kw.length).toLowerCase() === kw.toLowerCase()) {
          if (!matched || kw.length > matched.length) matched = kw;
        }
      }
      if (matched) {
        if (i > cursor) segments.push(<span key={key++}>{text.slice(cursor, i)}</span>);
        segments.push(
          <mark
            key={key++}
            className="bg-[linear-gradient(transparent_60%,hsl(var(--primary)/0.22)_60%)] text-foreground font-semibold px-0.5 rounded-sm"
          >
            {text.substr(i, matched.length)}
          </mark>,
        );
        used.add(matched);
        i += matched.length;
        cursor = i;
      } else {
        i += 1;
      }
    }
    if (cursor < text.length) segments.push(<span key={key++}>{text.slice(cursor)}</span>);
    return segments;
  }, [text, keywords]);

  return <>{nodes}</>;
}
