/**
 * Blog registry — single source of truth for which posts exist.
 *
 * To publish a new post:
 *  1. Create `src/content/blog/<slug>.ts` exporting `const post: BlogPost`.
 *  2. Import + register it here.
 *  3. Optionally add it to a related[] of an existing post.
 */
import type { BlogPost } from "./types";
import { post as geoVsAeoVsAio } from "./geo-vs-aeo-vs-aio";
import { post as comoMarcaApareceEmIas } from "./como-marca-aparece-em-ias";
import { post as aiInfluenceScore } from "./ai-influence-score";
import { post as checklistGeo12Acoes } from "./checklist-geo-12-acoes";
import { post as monitorarIasVsGoogle } from "./monitorar-ias-vs-google";

export const POSTS: BlogPost[] = [
  geoVsAeoVsAio, // pilar
  comoMarcaApareceEmIas,
  aiInfluenceScore,
  checklistGeo12Acoes,
  monitorarIasVsGoogle,
];

export const POST_BY_SLUG: Record<string, BlogPost> = Object.fromEntries(
  POSTS.map((p) => [p.slug, p]),
);

export function getPostBySlug(slug: string): BlogPost | null {
  return POST_BY_SLUG[slug] ?? null;
}

export function getRelatedPosts(slugs: string[]): BlogPost[] {
  return slugs.map((s) => POST_BY_SLUG[s]).filter((p): p is BlogPost => Boolean(p));
}

/** Posts ordered by publishedAt desc, with the pilar pinned first. */
export function getOrderedPosts(): BlogPost[] {
  const pilar = POSTS[0];
  const rest = POSTS.slice(1).sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
  return [pilar, ...rest];
}
