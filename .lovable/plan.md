## Feature: Abrangência Geográfica da Marca

Captura da abrangência (nacional vs regional) em **Configurações** e **Diagnóstico**, sem tocar no onboarding atual. Dados ficam em `brand_settings` e são consumidos por um utilitário `getGeoContext()` para uso futuro no motor de diagnóstico.

---

### 1. Migration — `brand_settings`

Adicionar colunas:

- `coverage_type text not null default 'national'` com CHECK `in ('national','regional')`
- `coverage_city text` (nullable)
- `coverage_state text` (nullable, sigla UF 2 chars)
- `coverage_region text` (nullable — ex: "Grande SP", "Vale do Paraíba")

Trigger `validate_brand_coverage` em BEFORE INSERT/UPDATE:
- Se `coverage_type = 'regional'`, exigir `coverage_city` e `coverage_state` não-vazios.
- Se `coverage_type = 'national'`, limpar (set null) os campos regionais para evitar dados órfãos.

Sem alteração em RLS, policies ou GRANTs (já existem).

---

### 2. Tipo `BrandCoverage`

Novo arquivo `src/lib/brand-coverage.ts`:

```ts
export type CoverageType = 'national' | 'regional';
export interface BrandCoverage {
  coverage_type: CoverageType;
  coverage_city?: string | null;
  coverage_state?: string | null;
  coverage_region?: string | null;
}
export function getGeoContext(c: BrandCoverage): string { /* prompt-ready string */ }
```

`getGeoContext()` retorna uma string pronta para injeção em prompts:
- nacional → `"Marca com atuação nacional no Brasil."`
- regional → `"Marca com atuação regional: {cidade}/{UF}{, região X se houver}."`

Exportado via barrel se aplicável; sem refatorar imports existentes.

---

### 3. Hook `useBrandSettings`

Acrescentar os 4 campos à interface `BrandSettings` (apenas extensão, sem renomear nada).

---

### 4. UI — Configurações (`ConfiguracoesPage.tsx`)

Novo card **"Abrangência Geográfica"** (logo após "Dados da Marca", antes de "Concorrentes"):

- `RadioGroup`: "Nacional" / "Regional"
- Se "Regional" → mostrar 3 inputs: Cidade (obrigatório), Estado/UF (obrigatório, select com 27 UFs), Região/Sub-região (opcional)
- Validação client-side antes do `handleSave` quando regional
- Persistido no mesmo `handleSave` existente (apenas adicionar os 4 campos ao payload)

---

### 5. UI — Diagnóstico

Adicionar a **mesma seção editável** em `src/pages/dashboard/DiagnosticoPage.tsx` (ou no componente de edição de marca usado lá), carregando/salvando via `useBrandSettings` / `useUpdateBrandSettings`. Mesmo componente reutilizado entre as duas telas:

- Criar `src/components/dashboard/BrandCoverageSection.tsx` (componente novo, isolado)
- Importado nas duas páginas, sem mexer em outros componentes

---

### 6. Não-objetivos

- Não alterar onboarding (`OnboardingWizard`, `client_onboarding`).
- Não consumir `getGeoContext()` no motor ainda — só deixar pronto.
- Não renomear, refatorar ou reorganizar arquivos existentes.
- Sem mudanças em `simulate-ai` ou outras edge functions nesta entrega.

---

### Arquivos tocados

**Novos:**
- `src/lib/brand-coverage.ts`
- `src/components/dashboard/BrandCoverageSection.tsx`

**Editados (aditivos apenas):**
- `src/hooks/useBrandSettings.ts` (estende interface)
- `src/pages/dashboard/ConfiguracoesPage.tsx` (insere card)
- `src/pages/dashboard/DiagnosticoPage.tsx` (insere seção)

**Migration:** colunas + CHECK + trigger em `brand_settings`.