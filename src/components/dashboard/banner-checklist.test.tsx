import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

let scope: { isAgency: boolean; brandId: string | null } | null = null;
let hasBrandRow = false;

vi.mock("@/lib/brand-scope", () => ({ getBrandScope: async () => scope }));
vi.mock("@/hooks/useDashboardOnboarding", () => ({ useDashboardOnboarding: () => ({ data: undefined, isLoading: true }) }));
vi.mock("@/hooks/useBrandSettings", () => ({ useBrandSettings: () => ({ data: null }) }));
vi.mock("@/hooks/useCompetitors", () => ({ useCompetitors: () => ({ data: [] }) }));
vi.mock("@/integrations/supabase/client", () => {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q;
  q.maybeSingle = async () => ({ data: hasBrandRow ? { id: "b1" } : null, error: null });
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      from: (t: string) => (t === "onboarding_responses"
        ? { ...q, maybeSingle: async () => ({ data: null, error: null }) }
        : q),
    },
  };
});

import { useBrandProfile } from "@/hooks/useBrandProfile";
import { OnboardingChecklistCard } from "./OnboardingChecklistCard";

const wrap = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  scope = null;
  hasBrandRow = false;
});

describe("Banner do Perfil da Marca", () => {
  it("ausente em agência sem marca ativa", async () => {
    scope = { isAgency: true, brandId: null };
    const { result } = renderHook(() => useBrandProfile(), { wrapper: wrap });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shouldRemind).toBe(false);
  });
  it("presente em individual sem perfil", async () => {
    scope = { isAgency: false, brandId: null };
    hasBrandRow = true;
    const { result } = renderHook(() => useBrandProfile(), { wrapper: wrap });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shouldRemind).toBe(true);
  });
});

describe("Card 'Por onde começar'", () => {
  it("não nasce nulo: reserva o espaço na primeira pintura", () => {
    const { container } = render(<MemoryRouter><OnboardingChecklistCard /></MemoryRouter>);
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByTestId("checklist-skeleton")).toBeTruthy();
  });
});
