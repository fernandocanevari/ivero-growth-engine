import type { Plugin, ViteDevServer } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";

import { buildLandingMarkdown } from "./src/lib/landing-md";

/**
 * Vite plugin que gera `public/landing.md` a partir de `src/content/landing.ts`
 * (mesma fonte que a landing renderiza) + `src/lib/pricing-rules.ts`.
 *
 * Mesmo padrão do vite-plugin-sitemap: roda em `buildStart` e observa mudanças
 * no dev server, de modo que o .md nunca divirja da página.
 */
export function landingMdPlugin(): Plugin {
  let projectRoot = process.cwd();

  async function generate(reason: string) {
    try {
      const md = buildLandingMarkdown();
      const outPath = path.resolve(projectRoot, "public/landing.md");
      const existing = await fs.readFile(outPath, "utf-8").catch(() => "");
      if (existing !== md) {
        await fs.writeFile(outPath, md, "utf-8");
        // eslint-disable-next-line no-console
        console.log(`\x1b[36m[landing.md]\x1b[0m regenerado public/landing.md — ${reason}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        `\x1b[33m[landing.md]\x1b[0m ignorado (${reason}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    name: "ivero-landing-md",
    configResolved(config) {
      projectRoot = config.root;
    },
    async buildStart() {
      await generate("buildStart");
    },
    configureServer(server: ViteDevServer) {
      const watched = [
        path.resolve(projectRoot, "src/content/landing.ts"),
        path.resolve(projectRoot, "src/lib/landing-md.ts"),
        path.resolve(projectRoot, "src/lib/pricing-rules.ts"),
      ];
      const onChange = (file: string) => {
        if (watched.includes(file)) void generate(`change: ${path.basename(file)}`);
      };
      server.watcher.on("change", onChange);
    },
  };
}
