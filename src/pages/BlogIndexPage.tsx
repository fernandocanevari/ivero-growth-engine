import { useEffect } from "react";
import { motion } from "framer-motion";
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
          className="mb-14 text-center"
        >
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.05]">
            Inteligência editorial sobre <span className="text-gradient">GEO</span> e IAs
          </h1>
        </motion.header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
