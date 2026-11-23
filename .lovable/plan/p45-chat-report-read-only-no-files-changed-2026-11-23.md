# P45-chat report (read-only, no files changed)

## Section A: Assinatura page stale after paying in another tab (finding 61)

### A1. How the data is loaded (TRACED FROM CODE)
- Global `new QueryClient()` with no options (`src/App.tsx:66`). Neither the subscription row nor the invoice list uses react-query, so staleTime, gcTime, refetchOnWindowFocus and refetchInterval do not apply.
- `useSubscriptionStatus` (`src/hooks/useSubscriptionStatus.ts`): plain `useState` and `useEffect`. It reads `assinaturas` directly with the anon client (92-103) and, for agencies, `agency_brands` (113-131). It fetches on mount and when `userId`/`authResolved` change (144-146), and when the brand selector changes (149-154). It exposes `refresh` (278). There is no shared cache: **each component that calls the hook keeps its own copy** and fetches it itself.
- `useBillingInvoices` (`src/hooks/useBillingInvoices.ts:74-110`): separate state. It calls `manage-subscription/list_invoices` once on mount and exposes `reload`.
- Refresh triggers on AssinaturaPage today:
  - one refresh on return from checkout, only when `?from=asaas` or `tipo=upgrade` is in the URL (183-199);
  - focus/visibilitychange listener (205-216), which only does anything while a **cancellation fee** is pending (`penaltyBlocksReactivation`);
  - a 20 s `setInterval` (279-287), which only does anything while `effectiveStatus === "pendente"`;
  - manual calls after actions (222, 225-228, 240-241).
- No Supabase realtime anywhere: `supabase_realtime` appears in no migration, and no `.channel(` call reads `assinaturas`.
- **Root cause of finding 61 (TRACED FROM CODE):** after the upgrade invoice opens in another tab, the row is `ativo` with `upgrade_pendente_*` set. None of the three triggers fires in that state (not `pendente`, no fee pending, no `from=asaas` because the invoice opens with `window.open`, line 425). So the page never reloads by itself.

### A2. Which fields drive each element
| Element | Fields | Source |
|---|---|---|
| (a) amber "Upgrade em andamento" | `effectiveStatus === "ativo"`, `upgrade_pendente_plano/diferenca/invoice_url/em` (92-100, 408-433) | subscription hook |
| (b) "Você escolheu o plano X" | `showChosenPlanNotice(status, plano, plano_pretendido, hasUpgradePending)` (102-105), start day from `next.dueDate` (127-128) | hook **plus** invoices |
| (c) "Próxima cobrança" / "Agendada para" | `next` from list_invoices (673-691), loading guard `invoicesLoading \|\| statusLoading` (652) | invoices (gated by hook loading) |
| (d) "Plano atual" name and price | `plano`, `ciclo_contratado` -> `PLANOS[plano]` (124-135, 508-511) | hook |
| (e) sidebar locks | `isPaid`, `isTrial`, `plano` from **its own** hook instance (`DashboardSidebar.tsx:112,191`) | separate hook instance |

The hook and the invoice list can each go stale on their own. The sidebar's and DashboardLayout's hook instances are independent of the page's, so refreshing the page does **not** refresh them. This matches cliente71 ("Agendada para 24/11" comes from list_invoices).

### A3. Other places that use the same data (TRACED FROM CODE)
These all call `useSubscriptionStatus`, each with its own state: `DashboardLayout.tsx:30` (gating and TrialBanner props), `DashboardSidebar.tsx:112`, `FeatureGate.tsx:21` (returns null only while `isLoading`), `UpgradeModal`, `OverdueNotice`, `VitrinePage`, `VisibilidadeIAPage`, `MarcasPage`, `ConfiguracoesPage`, `RecommendedToolCard`, `useGenerationQuota`.
- `ProtectedRoute` does not use the hook. It uses `access-cache` (`fetchAccess`/`getCachedAccess`), and `useBillingInvoices` clears that cache after each load (`useBillingInvoices.ts:90`).
- BemVindoPage runs its own query (BemVindoPage.tsx ~180).
- If the data reloaded while the user is on the page, a background reload keeps the old values until new ones arrive (`hasLoadedRef`, hook lines 77-83 and 106-107). So each part would simply switch to the new values. Locks in the sidebar change only when its own instance reloads.

### A4. Can BemVindoPage's polling be reused? (TRACED FROM CODE)
- It polls with a `setTimeout` chain every `POLL_INTERVAL_MS` (3 s), checks `status === "ativo"`, and stops on success, on unmount (`cancelled`), or after `RESUME_MAX_ATTEMPTS = 20` (about 60 s) or `MAX_ATTEMPTS` (BemVindoPage.tsx:48-50, 129-254).
- It is built into the page's own query and states, so it is not a reusable hook. The pattern can be copied (stop condition plus time cap), but not imported.

### A5. Flash of the trial state (finding 56) (TRACED FROM CODE)
- A background reload does **not** flash: `setAssinaturaLoading(true)` runs only when `!hasLoadedRef.current` (hook line 83). The invoice list sets `isValidating`, not `isLoading`, on reloads (`useBillingInvoices.ts:84`).
- The flash happens on the **first load**. AssinaturaPageContent has no early return on `statusLoading`. While it loads, `assinatura === null`, so `status = "trial"` and `plano = null` (hook 179-183). The page then renders the "Teste grátis" badge (490-494) and "Plano —" (508). "Nenhum cartão cadastrado ainda" (798) is shown whenever `next` is null, including while `invoicesLoading` is true.
- **Controlling flags:** `isLoading` from the hook (= `roleLoading || !authResolved || assinaturaLoading`, line 158) and `isLoading` from the invoice list. Only the "Próxima cobrança" card checks them (652).
- `hasLoadedRef` is reset when `userId` changes (139-142). So a reload triggered after switching accounts goes back to first-load behavior and flashes. That is correct (another user's data must not stay on screen), but it means a reload can only stay flash-free while the account does not change.
- Any refresh that only calls `refresh()`/`reload()` keeps the flash where it is today and adds none.

### A6. Options
| Option | Files | Trigger | Database load | Flicker | Across accounts (P5) | Proof test |
|---|---|---|---|---|---|---|
| A. Reload when the tab becomes visible or focused (always, not only with a fee pending) | `AssinaturaPage.tsx` (widen the 205-216 listener to always call `refresh` + `reload`, throttled to e.g. once per 10 s) | return to the tab | 1 row select + 1 `list_invoices` (several Asaas GETs) per return | none (background reload) | safe: the hook reads the current `userId` | vitest: fire `visibilitychange` with an upgrade pending, the mock returns no pending upgrade, the amber card disappears and no "Teste grátis" appears |
| B. Poll every N s only while an upgrade is pending (stop when `upgrade_pendente_*` clears, or after e.g. 10 min) | `AssinaturaPage.tsx` (extend the 20 s interval condition) | timer | 1 select every N s while pending (only the row; `list_invoices` once at the end) | none | same as A | fake timers: pending, then cleared, card gone, polling stops, no extra calls after the limit |
| C. Realtime on the user's `assinaturas` row | migration `ALTER PUBLICATION supabase_realtime ADD TABLE public.assinaturas` (not present today); existing SELECT policy on `assinaturas` (2 policies, own row) must cover it; channel in the hook with a unique name and cleanup | webhook update | realtime connection per tab, no polling | none if it calls `refresh` | the channel must be rebuilt when `userId` changes | needs a real environment; unit tests can only mock the channel |
| D. A + B | `AssinaturaPage.tsx` only | return to the tab, plus a timer while pending | as A, plus B while pending | none | safe | both tests |

Also needed in A, B and D: the sidebar and layout keep their own stale copy. The smallest fix for that is to have the page's refresh also notify the other instances, through a small shared notification in the hook file (the same pattern as `subscribeBrandScope`). That adds `useSubscriptionStatus.ts` to the files touched.

**Recommendation: D (visible-tab reload plus polling while an upgrade is pending), with the shared notification.** The customer's path is to pay in the other tab and come back, so A covers cliente74 and cliente71 when they return. B covers someone who keeps both tabs side by side. There is no migration, no new permissions and no flash. C adds database setup and a permanent connection for a rare event.

## Section B: does the immediate change send the new value to Asaas? (finding 64)

Common path (TRACED FROM CODE, `manage-subscription/index.ts`):
- With no Asaas link, the request never reaches `applyImmediately`. After `resolveSubId()` fails (453), there are two outcomes:
  - with paid-checkout evidence, it refuses and changes nothing (456-463);
  - otherwise it does a **local-only** update of `plano`, `ciclo_contratado` and `snapshotDesconto` (465-468). There is **no PUT**, and the `*_pretendido` fields are not cleared.
- `applyImmediately` (565-599):
  - sends `PUT /subscriptions/{subId}` with `value = planValue(plano, ciclo)` (429), `updatePendingPayments: true` and `description: "Ivero — Plano {Nome}"` (566-572);
  - if the PUT fails, it returns 502 and the database is untouched (574-581);
  - only after the PUT succeeds does it update `plano, ciclo_contratado, plano_pretendido=null, ciclo_pretendido=null, snapshotDesconto` (583-586);
  - it **does not change** `status` or `upgrade_pendente_*`. Those were already cleared by `replacePreviousPending` (518-543) when a previous request existed.

| Case | Reached at | PUT value | Row after | First recurring charge | Does Asaas differ from the database? |
|---|---|---|---|---|---|
| 1. Trial with card | 603-607 (before the proration check) | new plan price | new plano/ciclo, intended plan cleared, status still `trial` | new price (pending payments updated, ASSUMPTION) | no, unless the database update fails after the PUT |
| 2. Plan reduction | 660 (delta < 0, `needsCharge` false) | lower price | lower plan | lower price | no, same caveat |
| 3. Cycle-only change | 660 | `planValue(plano, novo ciclo)` | new ciclo | new price | no. Note: an annual row is forced to stay annual (424-428), so only monthly to annual is possible. That path does **not** set `compromisso_inicio`/`compromisso_meses` (not in the update, line 585). Whether the 12-month commitment starts is not traced from this path. |
| 4. Difference below R$ 5 | 637/660 | higher price | higher plan | higher price (the small difference is waived) | no, same caveat |

**Cases where the two can differ (TRACED FROM CODE):**
- (i) PUT succeeds, then the database update fails (587 returns 500): Asaas has the new value and the database the old plan. There is no rollback. On a reduction, the customer pays less while the database keeps the higher plan. On an upgrade, the customer pays more while keeping the lower plan.
- (ii) Local-only path (465-468): the plan changes with no Asaas subscription. This is intended (the charge is created later at checkout), but `plano_pretendido` can stay set.
- (iii) Line 557 only logs a warning when the Asaas value differs from the database. It never fixes it.

**MONTHLY assumption (ASSUMPTION unless noted):**
- 560: `cycle` defaults to `"MONTHLY"`.
- 619-628: `CYCLE_DAYS`, defaulting to 30.
- `create-checkout` creates the subscription with `cycle: "MONTHLY"`. TRACED FROM CODE in an earlier report; that file was not re-read this turn.
- The PUT does not send `cycle`, so the Asaas cycle is never changed. An "anual" row is still billed every month at the promotional price, which is the intended model.
- If a subscription were not MONTHLY (made by hand in the Asaas panel), the proration would use the right number of days from `CYCLE_DAYS`. But `planValue` is a monthly price, so the PUT would set a monthly price on a longer cycle and undercharge. Nothing in the repo proves that such subscriptions exist.

**Can a trial with a card happen through the UI? (TRACED FROM CODE)**
- `create-checkout` grants a trial with a card checkout and writes `status: "trial"` (496, 545). After the checkout webhook binds the subscription, the row is `trial` with an `asaas_subscription_id`.
- `UpgradeModal.tsx:294` sends to `change_plan` only when `effectiveStatus === "trial" && hasAsaasSubscription` (otherwise to checkout). So it is reachable: a trial user who has entered a card and picks another plan in the modal, from Assinatura or any upgrade entry.
- Worth a real Sandbox test. Missing evidence: a row with `status='trial'` and `asaas_subscription_id` not null (SQL), plus the Asaas `nextDueDate`/value after the PUT.

## Asaas / browser behavior this relies on
| Behavior | Status |
|---|---|
| `window.open` invoice tab, then returning to the app tab fires `visibilitychange`/`focus` | ASSUMPTION (standard browser behavior, not tested here) |
| Webhook updates the row within seconds of payment | VERIFIED BY REAL RESPONSE (user's 22/11 evidence: paid 14:02, row updated before 14:09) |
| `PUT /subscriptions/{id}` with `updatePendingPayments: true` updates the value of existing PENDING charges | ASSUMPTION (Asaas docs; no real response in repo) |
| PUT without `cycle` keeps the existing cycle and `nextDueDate` | ASSUMPTION |
| All Ivero subscriptions in Asaas are MONTHLY | ASSUMPTION (true for subscriptions created by create-checkout; panel-made ones unknown) |
| Supabase realtime would deliver `assinaturas` updates under the row's SELECT policy | ASSUMPTION (not configured today) |

## Missing real evidence
- Network/console capture of the stale tab, to confirm no reload fired: it would show no `assinaturas` select after 14:02.
- SQL listing `assinaturas` rows with `status='trial' and asaas_subscription_id is not null` (to see if case 1 exists in practice).
- One Sandbox PUT response for a plan reduction showing the updated PENDING charge value.
