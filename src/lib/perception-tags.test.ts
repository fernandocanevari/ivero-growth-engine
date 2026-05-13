import { describe, it, expect } from "vitest";
import {
  scoreToTone,
  pillarToTags,
  computeVerdict,
  buildPerceptionSnapshot,
  isEmptySnapshot,
  PILLAR_KEYS,
} from "./perception-tags";

describe("scoreToTone", () => {
  it("mapeia faixas corretamente", () => {
    expect(scoreToTone(95)).toBe("green");
    expect(scoreToTone(81)).toBe("green");
    expect(scoreToTone(80)).toBe("yellow"); // borda: > 80 = green
    expect(scoreToTone(65)).toBe("yellow");
    expect(scoreToTone(50)).toBe("yellow"); // borda inclusiva
    expect(scoreToTone(49)).toBe("red");
    expect(scoreToTone(0)).toBe("red");
  });
});

describe("pillarToTags", () => {
  it("retorna labels do pilar com tom correto", () => {
    const r = pillarToTags("Clareza", 90);
    expect(r.tone).toBe("green");
    expect(r.labels.length).toBeGreaterThan(0);
  });
});

describe("computeVerdict", () => {
  const mkTags = (tones: ("green" | "yellow" | "red")[]) =>
    Object.fromEntries(
      PILLAR_KEYS.map((p, i) => [p, { tone: tones[i], labels: [] }]),
    ) as Parameters<typeof computeVerdict>[0];

  it("solid: 3+ greens e 0 reds", () => {
    expect(computeVerdict(mkTags(["green", "green", "green", "yellow", "yellow"]))).toBe("solid");
  });

  it("insufficient: 2+ reds", () => {
    expect(computeVerdict(mkTags(["red", "red", "yellow", "green", "green"]))).toBe("insufficient");
  });

  it("insufficient: 0 greens", () => {
    expect(computeVerdict(mkTags(["yellow", "yellow", "yellow", "yellow", "red"]))).toBe("insufficient");
  });

  it("partial: caso intermediário", () => {
    expect(computeVerdict(mkTags(["green", "green", "yellow", "yellow", "red"]))).toBe("partial");
  });
});

describe("buildPerceptionSnapshot", () => {
  it("constrói snapshot completo com 5 pilares", () => {
    const snap = buildPerceptionSnapshot({
      clarity: 90,
      authority: 70,
      conversion: 40,
      positioning: 85,
      experience: 60,
    });
    expect(Object.keys(snap.tags)).toHaveLength(5);
    expect(snap.tags.Clareza.tone).toBe("green");
    expect(snap.tags.Conversão.tone).toBe("red");
    expect(snap.verdict).toBeDefined();
    expect(snap.computed_at).toBeTruthy();
  });
});

describe("isEmptySnapshot", () => {
  it("trata null/undefined/{} como vazio", () => {
    expect(isEmptySnapshot(null)).toBe(true);
    expect(isEmptySnapshot(undefined)).toBe(true);
    expect(isEmptySnapshot({})).toBe(true);
    expect(isEmptySnapshot({ tags: {} })).toBe(true);
  });

  it("snapshot válido não é vazio", () => {
    const snap = buildPerceptionSnapshot({
      clarity: 80, authority: 80, conversion: 80, positioning: 80, experience: 80,
    });
    expect(isEmptySnapshot(snap)).toBe(false);
  });
});
