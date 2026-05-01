import { Link } from "react-router-dom";
import { ArrowRight, Info, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import type { Block } from "@/content/blog/types";
import { KeywordHighlight } from "./KeywordHighlight";
import { track } from "@/lib/analytics";

interface Props {
  blocks: Block[];
  keywords: string[];
  postSlug: string;
}

const CALLOUT_STYLES = {
  info: { icon: Info, border: "border-primary/30", bg: "bg-primary/5", iconColor: "text-primary" },
  warning: { icon: AlertTriangle, border: "border-amber-500/40", bg: "bg-amber-500/5", iconColor: "text-amber-600" },
  success: { icon: CheckCircle2, border: "border-emerald-500/40", bg: "bg-emerald-500/5", iconColor: "text-emerald-600" },
} as const;

export function BlogContent({ blocks, keywords, postSlug }: Props) {
  return (
    <div className="space-y-7">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p
                key={idx}
                className="text-[1.0625rem] leading-[1.75] text-foreground/85 font-body"
              >
                <KeywordHighlight text={block.text} keywords={keywords} />
              </p>
            );

          case "heading": {
            const Tag = block.level === 2 ? "h2" : "h3";
            const id = block.id ?? slugify(block.text);
            const cls =
              block.level === 2
                ? "font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-12 mb-2 scroll-mt-28"
                : "font-display text-xl font-bold text-foreground mt-8 mb-1 scroll-mt-28";
            return (
              <Tag key={idx} id={id} className={cls}>
                {block.text}
              </Tag>
            );
          }

          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            const cls = block.ordered
              ? "list-decimal pl-6 space-y-2 text-[1.0625rem] leading-[1.7] text-foreground/85"
              : "list-disc pl-6 space-y-2 text-[1.0625rem] leading-[1.7] text-foreground/85";
            return (
              <ListTag key={idx} className={cls}>
                {block.items.map((it, i) => (
                  <li key={i}>
                    <KeywordHighlight text={it} keywords={keywords} />
                  </li>
                ))}
              </ListTag>
            );
          }

          case "quote":
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-primary pl-5 py-1 my-2 italic text-foreground/80 text-lg"
              >
                <p>"{block.text}"</p>
                {block.cite && (
                  <cite className="block not-italic text-sm text-muted-foreground mt-2">
                    — {block.cite}
                  </cite>
                )}
              </blockquote>
            );

          case "callout": {
            const variant = block.variant ?? "info";
            const { icon: Icon, border, bg, iconColor } = CALLOUT_STYLES[variant];
            return (
              <div
                key={idx}
                className={`rounded-xl border ${border} ${bg} p-5 flex gap-3 not-prose`}
              >
                <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
                <div>
                  {block.title && (
                    <p className="font-semibold text-foreground mb-1">{block.title}</p>
                  )}
                  <p className="text-[0.95rem] leading-relaxed text-foreground/80">
                    <KeywordHighlight text={block.text} keywords={keywords} />
                  </p>
                </div>
              </div>
            );
          }

          case "cta":
            return (
              <div
                key={idx}
                className="group relative my-10 overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/20 via-accent/10 to-card p-7 sm:p-9 shadow-xl shadow-primary/10 not-prose"
              >
                {/* Animated glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/25 blur-3xl group-hover:bg-primary/40 transition-colors duration-700"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-accent/20 blur-3xl"
                />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                    <Sparkles className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl sm:text-2xl font-display font-bold text-foreground leading-tight mb-4">
                      {block.text}
                    </p>
                    <Link
                      to={block.href}
                      onClick={() => track("blog_cta_click", { slug: postSlug, href: block.href })}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground px-6 py-3.5 text-sm font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 hover:-translate-y-0.5 transition-all"
                    >
                      {block.label}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
