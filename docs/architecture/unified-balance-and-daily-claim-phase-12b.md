# Unified Balance + Daily Claim (Phase 12B)

## Scope

Phase 12B delivers:

- shared Unified Balance card UX in `markets-web` and `pay-web`
- points balance surfaces on `/points` and `/tasks` in `points-tasks-web`
- daily-claim read/status UX on `/points`

Out of scope for this phase:

- pay write-intent wiring for daily claim (`POST /pay/intents`)
- pay transition write execution (`/pay/intents/{id}/transitions`)
- new idempotent write-request generation for points daily claim

These write paths are deferred to **Phase 12.5B**.

## Unified balance data flow (Markets + Pay)

### Markets

1. Page runtime resolves account scope (`RYVRA_MARKETS_ACCOUNT_ID` or mock fallback).
2. `marketsClient.getMarketsOverview({ accountId })` loads existing overview KPIs.
3. `marketsClient.listPositions({ accountId, limit })` loads per-asset/per-chain positions.
4. Shared `@ryvra/api-client` helpers aggregate and format rows for the shared UI card.

### Pay

1. Pay runtime builds both `payClient` and `marketsClient`.
2. Pay overview routes load pay KPIs from `payClient.getPayOverview()`.
3. Unified balance card loads from `marketsClient.listPositions({ accountId })` using the same account-scope resolution as Markets.
4. Missing/mismatched account scope is surfaced as explicit card error/warning state.

## Aggregation logic and assumptions

Implemented in `packages/api-client/src/unified-balance.ts`:

- source rows are normalized from positions into `{ symbol, canonicalId, chainId, quantity, notionalValue, quoteAsset }`
- duplicate `(canonicalId, chainId)` rows at the same precedence are merged deterministically
- lower-priority duplicate rows are ignored when a higher-priority source already exists
- rows are sorted by notional value desc, then symbol/chain for deterministic output
- totals use normalized near-zero handling to avoid floating-point noise
- shared formatting helpers enforce consistent number/unit output across both apps

## Points balance + daily claim state model

### Points balance

- `/points` uses `getPointSummary` and now surfaces **Points balance** from account-scoped summary data.
- `/tasks` now also calls `getPointSummary` (same account/user/workspace scope) for a page-level **Points balance** card.
- Shared request builder (`buildPointsSummaryRequest`) keeps scope handling aligned and avoids per-page drift.

### Daily claim (read/invoke-safe in Phase 12B)

- `/points` loads daily claim status with `pointsTasksClient.getDailyClaimStatus(...)`.
- Current status route is provisional and read-only (`GET /points-tasks/eligibility`).
- UI supports:
  - `available`
  - `already_claimed`
  - `cooldown`
  - guarded `unavailable` fallback when endpoint/protocol data is missing
- CTA is always explicit:
  - enabled only if backend marks invoke endpoint available
  - disabled with concrete reason otherwise
- cooldown/already-claimed states render next-eligible timestamp when provided.

## Security/parity posture

- No direct `fetch` bypasses were added; all reads flow through `@ryvra/api-client`.
- Existing auth/header/scope guardrails remain enforced.
- No new pay write execution path was added in this phase.
