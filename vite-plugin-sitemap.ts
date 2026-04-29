import type { Plugin, ViteDevServer } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Vite plugin that auto-generates `public/sitemap.xml` from the blog registry.
 *
 * We parse the post .ts files with simple regex (no dynamic import) to avoid
 * Node ESM trying to resolve TS/`@/` aliases at build time. Each post file
 * is plain data — `slug`, `publishedAt`, optional `updatedAt` — so regex is
 * safe and stable.
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

/** Extract the ordered list of post-file basenames from `index.ts`. */
async function readRegistryOrder(blogDir: string): Promise<string[]> {
  const indexPath = path.join(blogDir, "index.ts");
  const src = await fs.readFile(indexPath, "utf-8");
  // Match `import { post as <alias> } from "./<filename>";`
  const importRe = /from\s+["']\.\/([\w-]+)["']/g;
  const aliasToFile = new Map<string, string>();
  // We also need alias order from the POSTS array
  const aliasImportRe = /import\s+\{\s*post\s+as\s+(\w+)\s*\}\s+from\s+["']\.\/([\w-]+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = aliasImportRe.exec(src))) {
    aliasToFile.set(m[1], m[2]);
  }
  // Suppress unused-var lint for importRe (kept for documentation)
  void importRe;

  const postsArrMatch = src.match(/export\s+const\s+POSTS\s*:\s*BlogPost\[\]\s*=\s*\[([\s\S]*?)\]/);
  if (!postsArrMatch) return [];
  const arrBody = postsArrMatch[1];
  const aliasOrderRe = /(\w+)\s*,/g;
  const order: string[] = [];
  while ((m = aliasOrderRe.exec(arrBody))) {
    const file = aliasToFile.get(m[1]);
    if (file) order.push(file);
  }
  // Also catch a trailing alias without a comma
  const tail = arrBody.trim().replace(/,$/, "").split(",").pop()?.trim();
  if (tail && aliasToFile.has(tail) && !order.includes(aliasToFile.get(tail)!)) {
    order.push(aliasToFile.get(tail)!);
  }
  return order;
}

/** Parse slug/publishedAt/updatedAt out of a single post .ts file. */
async function readPostMeta(filePath: string): Promise<BlogPostMeta | null> {
  const src = await fs.readFile(filePath, "utf-8");
  const slug = src.match(/slug:\s*["']([^"']+)["']/)?.[1];
  const publishedAt = src.match(/publishedAt:\s*["']([^"']+)["']/)?.[1];
  const updatedAt = src.match(/updatedAt:\s*["']([^"']+)["']/)?.[1];
  if (!slug || !publishedAt) return null;
  return { slug, publishedAt, updatedAt };
}

async function loadPosts(blogDir: string): Promise<BlogPostMeta[]> {
  const order = await readRegistryOrder(blogDir);
  const out: BlogPostMeta[] = [];
  for (const file of order) {
    const meta = await readPostMeta(path.join(blogDir, `${file}.ts`));
    if (meta) out.push(meta);
  }
  return out;
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
    const priority = i === 0 ? "0.9" : "0.8";
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
      const blogDir = path.resolve(projectRoot, "src/content/blog");
      const posts = await loadPosts(blogDir);
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
        `\x1b[33m[sitemap]\x1b[0m skipped (${reason}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    name: "ivero-sitemap",
    configResolved(config) {
      projectRoot = config.root;
    },
    async buildStart() {
      await generate("buildStart");
    },
    configureServer(server: ViteDevServer) {
      const blogDir = path.resolve(projectRoot, "src/content/blog");
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
