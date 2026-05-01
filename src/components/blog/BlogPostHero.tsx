import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { tagVariant } from "@/lib/blog-tag-style";

interface Props {
  title: string;
  description: string;
  tags: string[];
  authorName: string;
  publishedAt: string;
  readingMinutes: number;
}

export function BlogPostHero({
  title,
  description,
  tags,
  authorName,
  publishedAt,
  readingMinutes,
}: Props) {
  const date = new Date(publishedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="mb-12">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para o blog
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-bold uppercase tracking-wider text-primary px-2.5 py-1 rounded-md bg-primary/10"
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-foreground tracking-tight leading-[1.15] mb-5">
          {title}
        </h1>
        <p className="text-lg text-foreground/70 leading-relaxed mb-7">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground border-t border-border pt-5">
          <span className="font-semibold text-foreground">{authorName}</span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {date}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {readingMinutes} min de leitura
          </span>
        </div>
      </motion.div>
    </header>
  );
}
