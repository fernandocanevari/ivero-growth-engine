import { Link } from "react-router-dom";
import { ArrowUpRight, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { BlogPost } from "@/content/blog/types";
import { readingMinutes } from "@/content/blog/types";

interface Props {
  post: BlogPost;
  featured?: boolean;
  index: number;
}

// Deterministic gradient per slug — gives each card a unique visual signature
// while staying inside the brand palette (primary/accent + dark surface).
const GRADIENTS = [
  "from-primary/60 via-primary/30 to-accent/40",
  "from-accent/55 via-primary/35 to-primary/15",
  "from-primary/50 via-accent/45 to-primary/20",
  "from-accent/40 via-primary/25 to-primary/55",
  "from-primary/45 via-primary/15 to-accent/55",
];
function gradientFor(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function BlogCard({ post, featured, index }: Props) {
  const minutes = readingMinutes(post);
  const date = new Date(post.publishedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const gradient = gradientFor(post.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className={featured ? "sm:col-span-2" : ""}
    >
      <Link
        to={`/blog/${post.slug}`}
        className="group relative block rounded-2xl border-2 border-foreground/10 bg-card shadow-sm hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/15 hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full"
      >
        {/* Visual header — gradient cover with title overlay for hierarchy */}
        <div
          className={`relative ${featured ? "h-52 sm:h-64" : "h-40"} overflow-hidden bg-gradient-to-br ${gradient}`}
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.35),transparent_60%)]" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/30 to-transparent" />

          {featured && (
            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-foreground text-background shadow-md">
              <Sparkles className="w-3 h-3" />
              Pilar
            </span>
          )}
          <div className="absolute bottom-4 left-5 right-5 flex items-center gap-2 flex-wrap">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="relative p-6 sm:p-7 flex flex-col">
          <h2
            className={`font-display font-bold text-foreground leading-tight mb-3 group-hover:text-primary transition-colors ${
              featured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"
            }`}
          >
            {post.title}
          </h2>
          <p className="text-foreground/70 leading-relaxed mb-5 text-[0.95rem] line-clamp-3">
            {post.description}
          </p>
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-foreground/5">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{date}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {minutes} min
              </span>
            </div>
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/30 transition-all"
            >
              <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
