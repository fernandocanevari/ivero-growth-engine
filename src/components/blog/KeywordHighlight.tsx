import { useMemo, type ReactNode } from "react";

/**
 * Highlights the FIRST occurrence of each keyword inside a text block.
 *
 * Why first-occurrence-only: avoids keyword stuffing (Google penalty)
 * while still giving the term semantic weight via <mark> for both
 * search engines and LLM extractors (Perplexity, ChatGPT search).
 *
 * Sort longest-first so "Generative Engine Optimization" wins over "GEO".
 * Case-insensitive match preserves the author's casing in the rendered output.
 */
interface Props {
  text: string;
  keywords: string[];
}

export function KeywordHighlight({ text, keywords }: Props) {
  const nodes = useMemo<ReactNode[]>(() => {
    if (!keywords.length) return [text];

    // Sort longest first so multi-word phrases match before their shorter substrings.
    const sorted = [...keywords].sort((a, b) => b.length - a.length);
    const used = new Set<string>();

    // Walk the string left-to-right. For each position, find the earliest matching
    // keyword that hasn't been used yet. This guarantees first-occurrence-only.
    const result: ReactNode[] = [];
    let i = 0;
    let key = 0;
    while (i < text.length) {
      let matchKw: string | null = null;
      let matchLen = 0;
      for (const kw of sorted) {
        if (used.has(kw)) continue;
        if (kw.length > text.length - i) continue;
        const slice = text.substr(i, kw.length);
        if (slice.toLowerCase() === kw.toLowerCase()) {
          if (kw.length > matchLen) {
            matchKw = kw;
            matchLen = kw.length;
          }
        }
      }
      if (matchKw) {
        // Find the end of the chunk before this match
        const before = text.slice(lastFlush(), i);
        if (before) result.push(<span key={key++}>{before}</span>);
        result.push(
          <mark
            key={key++}
            className="bg-[linear-gradient(transparent_60%,hsl(var(--primary)/0.22)_60%)] text-foreground font-semibold px-0.5 rounded-sm"
          >
            {text.substr(i, matchLen)}
          </mark>,
        );
        used.add(matchKw);
        i += matchLen;
        flushTo(i);
      } else {
        i += 1;
      }
    }
    const tail = text.slice(lastFlush());
    if (tail) result.push(<span key={key++}>{tail}</span>);
    return result;

    // Closure helpers (using variables in scope)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function lastFlush() {
      return flushPos;
    }
    function flushTo(pos: number) {
      flushPos = pos;
    }
    // mutable cursor for "where we last emitted up to"
    var flushPos = 0;
  }, [text, keywords]);

  return <>{nodes}</>;
}
