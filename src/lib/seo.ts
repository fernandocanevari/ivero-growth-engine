/**
 * SEO helpers — set page title, meta description, OpenGraph/Twitter
 * tags, and inject JSON-LD structured data into <head> at render.
 *
 * Why no react-helmet-async: keeps the dependency surface small and
 * matches the existing pattern (PoliticaPrivacidadePage uses raw DOM).
 *
 * Each setter returns a cleanup function so callers can revert on unmount.
 */

type MetaPair = { name?: string; property?: string; content: string };

function upsertMeta(pair: MetaPair): () => void {
  const selector = pair.name
    ? `meta[name="${pair.name}"]`
    : `meta[property="${pair.property}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const wasMissing = !el;
  const prev = el?.getAttribute("content") ?? null;
  if (!el) {
    el = document.createElement("meta");
    if (pair.name) el.setAttribute("name", pair.name);
    if (pair.property) el.setAttribute("property", pair.property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", pair.content);
  return () => {
    if (!el) return;
    if (wasMissing) {
      el.remove();
    } else if (prev !== null) {
      el.setAttribute("content", prev);
    }
  };
}

function upsertCanonical(href: string): () => void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const wasMissing = !el;
  const prev = el?.getAttribute("href") ?? null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return () => {
    if (!el) return;
    if (wasMissing) el.remove();
    else if (prev !== null) el.setAttribute("href", prev);
  };
}

function injectJsonLd(id: string, data: unknown): () => void {
  // Remove pre-existing script with same id (in case of re-render)
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = id;
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
  return () => {
    script.remove();
  };
}

export interface PageSEO {
  title: string;
  description: string;
  /** Absolute or root-relative path used to build canonical + OG url. */
  path: string;
  /** Optional cover image (absolute URL preferred for OG). */
  image?: string;
  /** "article" or "website" — defaults to "website". */
  ogType?: "article" | "website";
  keywords?: string[];
  /** Optional JSON-LD payload(s) to inject. */
  jsonLd?: { id: string; data: unknown }[];
}

/**
 * Apply SEO to the current page. Returns cleanup that reverts changes.
 * Call from a useEffect with [] deps.
 */
export function applySEO(seo: PageSEO): () => void {
  const cleanups: Array<() => void> = [];

  const prevTitle = document.title;
  document.title = seo.title;
  cleanups.push(() => {
    document.title = prevTitle;
  });

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://ivero.com.br";
  const url = seo.path.startsWith("http") ? seo.path : `${origin}${seo.path}`;

  cleanups.push(upsertMeta({ name: "description", content: seo.description }));
  if (seo.keywords?.length) {
    cleanups.push(upsertMeta({ name: "keywords", content: seo.keywords.join(", ") }));
  }
  cleanups.push(upsertCanonical(url));

  // OpenGraph
  cleanups.push(upsertMeta({ property: "og:title", content: seo.title }));
  cleanups.push(upsertMeta({ property: "og:description", content: seo.description }));
  cleanups.push(upsertMeta({ property: "og:type", content: seo.ogType ?? "website" }));
  cleanups.push(upsertMeta({ property: "og:url", content: url }));
  if (seo.image) {
    cleanups.push(upsertMeta({ property: "og:image", content: seo.image }));
  }

  // Twitter
  cleanups.push(upsertMeta({ name: "twitter:card", content: seo.image ? "summary_large_image" : "summary" }));
  cleanups.push(upsertMeta({ name: "twitter:title", content: seo.title }));
  cleanups.push(upsertMeta({ name: "twitter:description", content: seo.description }));
  if (seo.image) {
    cleanups.push(upsertMeta({ name: "twitter:image", content: seo.image }));
  }

  // JSON-LD
  seo.jsonLd?.forEach((item) => {
    cleanups.push(injectJsonLd(item.id, item.data));
  });

  return () => {
    // Run in reverse so DOM mutations unwind cleanly.
    cleanups.reverse().forEach((fn) => fn());
  };
}

/** Build Article JSON-LD for a blog post. */
export function articleJsonLd(args: {
  title: string;
  description: string;
  url: string;
  image?: string;
  authorName: string;
  publishedAt: string;
  updatedAt?: string;
  keywords: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: args.title,
    description: args.description,
    image: args.image ? [args.image] : undefined,
    author: { "@type": "Person", name: args.authorName },
    publisher: {
      "@type": "Organization",
      name: "Ivero",
      logo: {
        "@type": "ImageObject",
        url: typeof window !== "undefined"
          ? `${window.location.origin}/favicon.ico`
          : "https://ivero.com.br/favicon.ico",
      },
    },
    datePublished: args.publishedAt,
    dateModified: args.updatedAt ?? args.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": args.url },
    keywords: args.keywords.join(", "),
  };
}

/** Build FAQPage JSON-LD from a FAQ list. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}
