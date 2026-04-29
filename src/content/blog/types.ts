/**
 * Blog content types — static, file-based blog (no CMS).
 *
 * Each post is a typed object exported from its own file under
 * `src/content/blog/`. The `BlogContent` renderer walks the `blocks`
 * array and renders each block by its `type` discriminator.
 *
 * Why discriminated union: keeps content authoring strict (no stray
 * HTML strings), and lets us inject GEO-friendly transforms (keyword
 * highlighting, FAQ schema) consistently across every post.
 */

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string; id?: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "callout"; variant?: "info" | "warning" | "success"; title?: string; text: string }
  | { type: "cta"; text: string; href: string; label: string };

export interface FAQItem {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  /** Used in <meta name="description"> and OG/Twitter cards. Keep < 160 chars. */
  description: string;
  /** Keywords highlighted on first occurrence inside paragraph blocks. Order matters: longer phrases first. */
  keywords: string[];
  publishedAt: string; // ISO date
  updatedAt?: string;
  author: { name: string; role?: string };
  /** Optional cover image URL (asset import or absolute URL). */
  coverImage?: string;
  /** Short tags for filtering / display. */
  tags: string[];
  /** Executive summary — 3-4 bullets shown at the top. IAs love this format for extraction. */
  summary: string[];
  blocks: Block[];
  faq: FAQItem[];
  /** Slugs of related posts for the cluster footer. */
  related: string[];
}

/** Word count helper used to compute reading time at render. */
export function countWords(post: BlogPost): number {
  let total = 0;
  const add = (s: string) => {
    total += s.trim().split(/\s+/).filter(Boolean).length;
  };
  add(post.title);
  add(post.description);
  post.summary.forEach(add);
  post.blocks.forEach((b) => {
    switch (b.type) {
      case "paragraph":
      case "heading":
      case "callout":
        add("text" in b ? b.text : "");
        break;
      case "list":
        b.items.forEach(add);
        break;
      case "quote":
        add(b.text);
        break;
      default:
        break;
    }
  });
  post.faq.forEach((f) => {
    add(f.q);
    add(f.a);
  });
  return total;
}

export function readingMinutes(post: BlogPost): number {
  const wpm = 220; // executive reader baseline
  return Math.max(1, Math.round(countWords(post) / wpm));
}
