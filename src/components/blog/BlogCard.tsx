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
      className={featured ? "sm:col-span-2" : ""}
    >
      <Link
        to={`/blog/${post.slug}`}
        className={`group relative block rounded-2xl border-2 border-foreground/10 bg-card shadow-sm hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full`}
      >
        {/* Glow decorativo no hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/15 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />

        <div
          className={`relative p-6 sm:p-8 h-full flex ${
            featured ? "flex-col lg:flex-row lg:items-center lg:gap-10" : "flex-col"
          }`}
        >
          {featured && (
            <div className="hidden lg:block lg:w-1/2 aspect-[16/10] rounded-xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/15 shrink-0" />
          )}
          <div className={`flex flex-col flex-1 ${featured ? "lg:flex-1" : ""}`}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {featured && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm">
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
            <p className="text-foreground/70 leading-relaxed mb-5 text-[0.95rem] flex-1">
              {post.description}
            </p>
            <div className="flex items-center justify-between mt-auto">
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
        </div>
      </Link>
    </motion.div>
  );
}
