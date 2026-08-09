# Portfolio & Insights (Phase 15)

## Scope

Phase 15 introduces unified portfolio and insight surfaces across Markets, Pay, and Points/Tasks while enforcing top-priority placement for balance and claim controls.

## Placement policy (non-negotiable)

1. **Markets (`/`, `/overview`)**
   - Unified Balance card must render inside the first content zone of the section.
   - Portfolio & insights card is co-located in the same top-priority zone.
   - Secondary KPI cards/tables render only after this top-priority zone.

2. **Pay (`/`, `/overview`)**
   - Unified Balance card must render before all secondary finance analytics/tables.
   - Portfolio & insights card is co-located in the same top-priority zone.

3. **Points/Tasks (`/points`, `/tasks`)**
   - Points balance card renders at the start of the section in the top-priority zone.
   - Daily claim surface renders in the same top-priority zone.
   - `/tasks` must always show an explicit claim state:
     - enabled CTA only when API status says claim invocation is available
     - disabled CTA with explicit reason for cooldown/already-claimed/unavailable states.

## Data model used by insights

### Markets + Pay portfolio layer

- Source: `marketsClient.listPositions({ accountId })` via existing unified-balance loader path.
- Aggregation: shared deterministic helpers in `@ryvra/api-client` (`aggregateUnifiedBalance`, `mapPositionsToUnifiedBalanceRows`).
- Derived insight fields:
  - total portfolio notional label
  - allocation slices by asset symbol
  - compact KPI indicators (coverage/pressure/exposure for Markets; invoice/payout/reconciliation signals for Pay)

### Points/Tasks insight layer

- Sources:
  - `pointsTasksClient.getPointsOverview({ accountId, userId?, workspaceId?, window })`
  - `pointsTasksClient.getTasksOverview({ accountId, userId?, workspaceId?, window })`
  - existing summary/list/status endpoints remain unchanged.
- Derived insight fields:
  - points trend buckets
  - task allocation mix (completed/at-risk/remaining)
  - productivity KPIs (completion rate, completed tasks, at-risk count)
  - top-line points-denominated portfolio value (`PTS`) when available

## Time-window behavior + fallbacks

- Supported insight windows in Phase 15 UI controls: `24h`, `7d`, `30d`.
- Markets/Pay:
  - historical windows are not currently exposed by existing overview endpoints.
  - controls are visible but non-interactive, with explicit fallback messaging.
- Points/Tasks:
  - selected window is passed to existing overview endpoints.
  - if returned `windowStart/windowEnd` coverage is shorter than requested, UI renders explicit fallback copy (no fabricated values).
  - if either points or tasks overview endpoint fails, module keeps partial data and surfaces transparent partial-unavailable messaging.

## Loading/empty/error consistency

Insight modules use shared state semantics:

- `loading`: status text with polite live region
- `empty`: explicit no-data text
- `error`: alert-style message
- `success`: metric/trend content

No synthetic numbers are shown in empty/error states.

## Security/parity/runtime constraints

- No new backend contracts were added.
- All reads stay behind `@ryvra/api-client` parity/auth/scope guardrails.
- Daily claim enablement remains bound to backend `invokeEndpointAvailable` and scoped status checks.

## Limitations and deferred enhancements

- Markets/Pay historical trend windows remain unavailable until canonical historical endpoints are published.
- Points/Tasks insight trends remain summary-level and do not yet include downloadable statements.
- Deferred (future phase candidates):
  - exportable portfolio statements (CSV/PDF)
  - richer drill-down charts with explicit reduced-motion variants
  - cross-app historical normalization once all services expose canonical history windows.
