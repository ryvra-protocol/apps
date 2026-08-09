# Unified Balance + Daily Claim (Phase 12B)

## Scope

Phase 12B delivers:

- shared Unified Balance card UX in `markets-web` and `pay-web`
- points balance surfaces on `/points` and `/tasks` in `points-tasks-web`
- daily-claim read/status UX on `/points`

Phase 15 placement policy update (superseding baseline placement assumptions):

- Unified Balance in Markets (`/`, `/overview`) and Pay (`/`, `/overview`) is now top-priority and must render before secondary analytics tables/cards.
- Points balance and Daily Claim are top-priority on both `/points` and `/tasks`.
- `/tasks` must display Daily Claim with explicit disabled-state reasons when claim execution is unavailable.

Out of scope for this phase baseline:

- pay write-intent wiring for daily claim (`POST /pay/intents`)
- pay transition write execution (`/pay/intents/{id}/transitions`)
- new idempotent write-request generation for points daily claim

These write paths were deferred in 12B and are now implemented in **Phase 12.5B** (`docs/architecture/claim-execution-phase-12-5b.md`).

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
- Phase 15 requires this balance to appear in the page's first summary zone on both `/points` and `/tasks`.

### Daily claim (12B baseline + 12.5B extension)

- `/points` loads daily claim status with `pointsTasksClient.getDailyClaimStatus(...)`.
- Current status route is provisional and read-only (`GET /points-tasks/eligibility`).
- Phase 12.5B adds claim execution via pay intents/transitions behind `/api/claims/daily`.
- UI supports:
  - `available`
  - `already_claimed`
  - `cooldown`
  - guarded `unavailable` fallback when endpoint/protocol data is missing
- CTA is always explicit:
  - enabled only if backend marks invoke endpoint available
  - disabled with concrete reason otherwise
- claim submit path is idempotent + retry-safe and surfaces request/correlation IDs on failures
- cooldown/already-claimed states render next-eligible timestamp when provided.
- Phase 15 extends placement to `/tasks` top section (active CTA or explicit disabled state with reason).

## Security/parity posture

- No direct `fetch` bypasses were added; all reads flow through `@ryvra/api-client`.
- Existing auth/header/scope guardrails remain enforced.
- Pay write execution path is documented separately in Phase 12.5B and preserves canonical parity/security guards.
