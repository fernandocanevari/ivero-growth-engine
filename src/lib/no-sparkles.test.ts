/** P67 — guard: no sparkle decoration (lucide Sparkles, "✦", "✨") in customer-visible source. */
import { describe, it, expect } from "vitest";

const files = import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

// WelcomePage has no route, so it is left as is (decided by the product owner).
const ALLOWED_FILES = new Set(["/src/pages/WelcomePage.tsx"]);
// PilaresPage keeps the ICON_MAP key "Sparkles" because older saved diagnostics store that icon name.
const ALLOWED_SNIPPETS: Record<string, string[]> = {
  "/src/pages/dashboard/PilaresPage.tsx": [
    '// "Sparkles" kept as a key: older saved diagnostics store that icon name.',
    "Sparkles: Compass,",
  ],
};

describe("P67 no sparkles", () => {
  it("no source file uses Sparkles, ✦ or ✨", () => {
    const offenders = Object.entries(files)
      .filter(([path]) => !/\.test\./.test(path) && !ALLOWED_FILES.has(path))
      .filter(([path, src]) => {
        let s = src;
        for (const snip of ALLOWED_SNIPPETS[path] ?? []) s = s.split(snip).join("");
        return /\bSparkles\b|✦|✨/.test(s);
      })
      .map(([path]) => path);
    expect(offenders, `Sparkle decorations found in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("the four pillar-icon sources use Compass and PilaresPage keeps the legacy key", () => {
    for (const f of ["/src/lib/diagnostic-engine.ts", "/src/pages/PreviewPage.tsx", "/src/pages/dashboard/PilaresPage.tsx", "/src/pages/dashboard/DiagnosticoPage.tsx"]) {
      expect(files[f], f).toContain("Compass");
    }
    const pilares = files["/src/pages/dashboard/PilaresPage.tsx"];
    const iconMap = pilares.slice(pilares.indexOf("const ICON_MAP"), pilares.indexOf("const DEFAULT_PILLAR_ICON"));
    expect(iconMap).toContain("Sparkles: Compass,");
    expect(iconMap).toMatch(/\bCompass,\n/);
  });
});
