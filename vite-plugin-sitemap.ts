import type { Plugin, ViteDevServer } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Vite plugin that auto-generates `public/sitemap.xml` from the blog registry.
 *
 * Why a Vite plugin (and not a `prebuild` npm script):
 *  - We can't edit package.json in this project
 *  - Runs automatically on `vite` and `vite build`
 *  - Watches blog files in dev and regenerates on save
 *
 * Strategy: dynamically import the registry as ESM so we always read the
 * canonical source of truth. If the import fails (syntax error in a post),
 * we keep the existing sitemap intact and log a warning.
 */

const SITE_URL = "https://ivero.com.br";

const STATIC_URLS: Array<{ loc: string; changefreq: string; priority: string }> = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/blog", changefreq: "weekly", priority: "0.9" },
  { loc: "/legal", changefreq: "yearly", priority: "0.4" },
  { loc: "/termos-de-uso", changefreq: "yearly", priority: "0.3" },
  { loc: "/politica-de-privacidade", changefreq: "yearly", priority: "0.3" },
  { loc: "/politica-de-cookies", changefreq: "yearly", priority: "0.3" },
];

interface BlogPostMeta {
  slug: string;
  publishedAt: string;
  updatedAt?: string;
}

async function loadPosts(projectRoot: string): Promise<BlogPostMeta[]> {
  // We use a cache-busting query so dev re-imports pick up edits.
  const registryPath = path.resolve(projectRoot, "src/content/blog/index.ts");
  const url = `${pathToFileURL(registryPath).href}?t=${Date.now()}`;
  const mod = (await import(/* @vite-ignore */ url)) as { POSTS?: BlogPostMeta[] };
  const posts = mod.POSTS ?? [];
  return posts;
}

function buildSitemap(posts: BlogPostMeta[]): string {
  const urls: string[] = [];

  for (const s of STATIC_URLS) {
    urls.push(
      `  <url>\n    <loc>${SITE_URL}${s.loc}</loc>\n    <changefreq>${s.changefreq}</changefreq>\n    <priority>${s.priority}</priority>\n  </url>`,
    );
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const lastmod = (post.updatedAt ?? post.publishedAt).slice(0, 10);
    const priority = i === 0 ? "0.9" : "0.8"; // first post (pillar) gets higher priority
    urls.push(
      `  <url>\n    <loc>${SITE_URL}/blog/${post.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

export function sitemapPlugin(): Plugin {
  let projectRoot = process.cwd();

  async function generate(reason: string) {
    try {
      const posts = await loadPosts(projectRoot);
      const xml = buildSitemap(posts);
      const outPath = path.resolve(projectRoot, "public/sitemap.xml");
      const existing = await fs.readFile(outPath, "utf-8").catch(() => "");
      if (existing !== xml) {
        await fs.writeFile(outPath, xml, "utf-8");
        // eslint-disable-next-line no-console
        console.log(
          `\x1b[36m[sitemap]\x1b[0m regenerated public/sitemap.xml (${posts.length} posts) — ${reason}`,
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `\x1b[33m[sitemap]\x1b[0m skipped regeneration (${reason}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    name: "ivero-sitemap",
    apply: () => true,
    configResolved(config) {
      projectRoot = config.root;
    },
    async buildStart() {
      await generate("buildStart");
    },
    configureServer(server: ViteDevServer) {
      const blogDir = path.resolve(projectRoot, "src/content/blog");
      server.watcher.add(blogDir);
      server.watcher.on("change", (file) => {
        if (file.startsWith(blogDir) && file.endsWith(".ts")) {
          void generate(`change: ${path.basename(file)}`);
        }
      });
      server.watcher.on("add", (file) => {
        if (file.startsWith(blogDir) && file.endsWith(".ts")) {
          void generate(`add: ${path.basename(file)}`);
        }
      });
    },
  };
}
