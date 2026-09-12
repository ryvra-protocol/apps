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

### Daily claim (12B baseline + fingerprint scan upgrade)

- Community Hub now uses a fingerprint-style scan interaction for daily claim.
- Claim state and metrics are persisted server-side per account/user/workspace scope in the points-tasks web runtime.
- Daily limit is one successful fingerprint scan per account scope per claim day.
- Claim day policy defaults to UTC when no account timezone policy is configured.
- Daily award points are generated server-side with a uniform random distribution in `[0.5, 2.0]`.
- `/api/claims/daily` now supports:
  - `GET`: today claim status
  - `POST`: fingerprint scan claim submission with idempotent retry behavior
- UI supports:
  - ready to scan
  - scanning/processing
  - success (points awarded)
  - already claimed today
  - error/retry
- Successful submissions persist:
  - awarded points
  - scan timestamp
  - claim date key
  - updated aggregate metrics
- Phase 15 top-zone placement remains in `/points` and `/tasks`.

## Security/parity posture

- No direct `fetch` bypasses were added for core points/tasks reads.
- Existing auth/header/scope guardrails remain enforced.
- Fingerprint claim randomness is generated and validated server-side (not client-trusted).

## Community Hub top metrics definitions

Top-section cards include:

- **Total fingerprints**: total successful daily fingerprint claims in scope.
- **Total prints scanned**: total completed scans counted by the claim service.
- **Cumulative points awarded**: running sum of server-awarded daily claim points.
- **Average points per scan**: cumulative points awarded divided by total scans (0 when no scans exist).
- **Derived calculations**: count of calculation summaries shown in the top metrics section.
