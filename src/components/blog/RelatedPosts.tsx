import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { BlogPost } from "@/content/blog/types";
import { readingMinutes } from "@/content/blog/types";

interface Props {
  posts: BlogPost[];
}

export function RelatedPosts({ posts }: Props) {
  if (!posts.length) return null;
  return (
    <section className="mt-16 pt-12 border-t border-border">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        Continue lendo
      </p>
      <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-6">
        Conteúdos relacionados
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {posts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {post.tags[0] ?? "Artigo"}
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <p className="font-display font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
              {post.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {readingMinutes(post)} min de leitura
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
