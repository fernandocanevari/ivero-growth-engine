/**
 * Coherent tag color variants for the blog.
 * All variants are derived from the brand palette (primary + accent + supporting hues)
 * to keep posts visually distinct without breaking the design system.
 *
 * Returned as Tailwind class fragments — no raw color values, so theme tokens win.
 */
export type TagVariant = {
  /** background+text classes for "pill" style (used over light surfaces, e.g. post hero) */
  pill: string;
  /** background+text classes for "overlay" style (used over the gradient cover in cards) */
  overlay: string;
  /** plain text color (used inline) */
  text: string;
};

const VARIANTS: TagVariant[] = [
  {
    pill: "bg-primary/10 text-primary",
    overlay: "bg-background/85 backdrop-blur-sm text-primary",
    text: "text-primary",
  },
  {
    pill: "bg-accent/15 text-accent",
    overlay: "bg-background/85 backdrop-blur-sm text-accent",
    text: "text-accent",
  },
  {
    pill: "bg-gradient-to-r from-primary/15 to-accent/15 text-primary",
    overlay: "bg-gradient-to-r from-background/90 to-background/75 backdrop-blur-sm text-primary",
    text: "text-primary",
  },
  {
    pill: "bg-foreground/10 text-foreground",
    overlay: "bg-foreground/85 backdrop-blur-sm text-background",
    text: "text-foreground",
  },
  {
    pill: "bg-accent/10 text-primary",
    overlay: "bg-background/85 backdrop-blur-sm text-foreground",
    text: "text-foreground/80",
  },
];

/** Deterministic variant per tag string — same tag always renders the same color. */
export function tagVariant(tag: string): TagVariant {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return VARIANTS[h % VARIANTS.length];
}
