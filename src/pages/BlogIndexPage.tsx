import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { BlogCard } from "@/components/blog/BlogCard";
import { getOrderedPosts } from "@/content/blog";
import { applySEO } from "@/lib/seo";
import { track } from "@/lib/analytics";

const BlogIndexPage = () => {
  const posts = getOrderedPosts();
  const [pilar, ...rest] = posts;

  useEffect(() => {
    track("blog_index_view");
    return applySEO({
      title: "Blog Ivero — GEO, AI Influence e o futuro da visibilidade de marca",
      description:
        "Insights executivos sobre Generative Engine Optimization, monitoramento de IAs e estratégia de marca na era pós-Google. Atualizado pela equipe Ivero.",
      path: "/blog",
      ogType: "website",
      keywords: [
        "GEO",
        "Generative Engine Optimization",
        "AI Influence Score",
        "blog Ivero",
        "AEO",
        "AIO",
      ],
    });
  }, []);

  return (
    <BlogLayout>
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Blog Ivero
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.05] mb-4">
            Inteligência editorial sobre <span className="text-gradient">GEO</span> e IAs
          </h1>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto leading-relaxed">
            Análises e roteiros táticos para marcas que querem ser citadas — não apenas indexadas — pelas IAs generativas.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <BlogCard post={pilar} featured index={0} />
          {rest.map((post, i) => (
            <BlogCard key={post.slug} post={post} index={i + 1} />
          ))}
        </div>
      </div>
    </BlogLayout>
  );
};

export default BlogIndexPage;
