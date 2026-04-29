import { useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { BlogPostHero } from "@/components/blog/BlogPostHero";
import { BlogContent } from "@/components/blog/BlogContent";
import { BlogFAQ } from "@/components/blog/BlogFAQ";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import {
  getPostBySlug,
  getRelatedPosts,
} from "@/content/blog";
import { readingMinutes } from "@/content/blog/types";
import { applySEO, articleJsonLd, faqJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : null;

  useEffect(() => {
    if (!post) return;
    track("blog_post_view", { slug: post.slug });
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/blog/${post.slug}`
        : `/blog/${post.slug}`;

    return applySEO({
      title: `${post.title} — Blog Ivero`,
      description: post.description,
      path: `/blog/${post.slug}`,
      ogType: "article",
      image: post.coverImage,
      keywords: post.keywords,
      jsonLd: [
        {
          id: "article-jsonld",
          data: articleJsonLd({
            title: post.title,
            description: post.description,
            url,
            image: post.coverImage,
            authorName: post.author.name,
            publishedAt: post.publishedAt,
            updatedAt: post.updatedAt,
            keywords: post.keywords,
          }),
        },
        {
          id: "faq-jsonld",
          data: faqJsonLd(post.faq),
        },
      ],
    });
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  const related = getRelatedPosts(post.related);

  return (
    <BlogLayout>
      <article className="container mx-auto px-4 sm:px-6 max-w-[720px]">
        <BlogPostHero
          title={post.title}
          description={post.description}
          tags={post.tags}
          authorName={post.author.name}
          publishedAt={post.publishedAt}
          readingMinutes={readingMinutes(post)}
        />

        {/* Executive summary — IAs love bullets at the top */}
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 mb-12"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Resumo executivo
          </p>
          <ul className="space-y-2">
            {post.summary.map((s, i) => (
              <li
                key={i}
                className="flex gap-3 text-[0.95rem] text-foreground/85 leading-relaxed"
              >
                <span className="text-primary font-bold mt-0.5 shrink-0">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </motion.aside>

        <BlogContent
          blocks={post.blocks}
          keywords={post.keywords}
          postSlug={post.slug}
        />

        <BlogFAQ items={post.faq} />

        <RelatedPosts posts={related} />
      </article>
    </BlogLayout>
  );
};

export default BlogPostPage;
