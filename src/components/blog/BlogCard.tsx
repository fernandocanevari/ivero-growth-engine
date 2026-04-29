import { Link } from "react-router-dom";
import { ArrowUpRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { BlogPost } from "@/content/blog/types";
import { readingMinutes } from "@/content/blog/types";

interface Props {
  post: BlogPost;
  featured?: boolean;
  index: number;
}

export function BlogCard({ post, featured, index }: Props) {
  const minutes = readingMinutes(post);
  const date = new Date(post.publishedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <Link
        to={`/blog/${post.slug}`}
        className={`group block rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all overflow-hidden ${
          featured ? "sm:col-span-2 lg:col-span-3" : ""
        }`}
      >
        <div
          className={`p-6 sm:p-8 ${
            featured ? "lg:flex lg:items-center lg:gap-10" : ""
          }`}
        >
          {featured && (
            <div className="hidden lg:block lg:w-1/2 aspect-[16/10] rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/10 shrink-0" />
          )}
          <div className={featured ? "lg:flex-1" : ""}>
            <div className="flex items-center gap-2 mb-3">
              {featured && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-foreground text-background">
                  Pilar
                </span>
              )}
              {post.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-semibold uppercase tracking-wider text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h2
              className={`font-display font-bold text-foreground leading-tight mb-3 group-hover:text-primary transition-colors ${
                featured ? "text-2xl sm:text-3xl lg:text-4xl" : "text-xl"
              }`}
            >
              {post.title}
            </h2>
            <p className="text-foreground/70 leading-relaxed mb-5 text-[0.95rem]">
              {post.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{date}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {minutes} min
                </span>
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
