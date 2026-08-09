# Phase 17: Reliability and Performance Hardening

## Scope

Phase 17 applies targeted reliability/performance hardening across:

- `apps/markets-web`
- `apps/pay-web`
- `apps/points-tasks-web`
- shared transport/runtime boundaries in `packages/api-client`

No endpoint contracts were changed.

## Baseline issues found (pre-edit audit)

### Performance baseline

1. **Redundant table work**
   - Multiple table clients cloned row arrays every render (`[...items]`) with no functional gain.
   - Pay table clients also re-sorted already server-sorted payloads.
2. **Heavy client modules loaded eagerly**
   - Claim modules for `/pay/payouts` and `/points` were bundled eagerly despite being non-critical interaction surfaces.
3. **Loading-state inconsistency**
   - Pay had route-level loading skeleton coverage; Markets and Points/Tasks were missing several route-level loading files.
4. **Potentially large pay page sizes**
   - Pay page-size parsing had no upper bound, allowing oversized list payloads and larger render work.

### Reliability baseline

1. **Transport reliability policy was implicit**
   - HTTP transport lacked unified timeout + retry behavior across apps.
2. **Duplicate GET request risk**
   - No in-flight dedupe/caching guard for repeated identical reads during rapid navigation/filter churn.
3. **Post-write stale-state risk**
   - Payout claim success path did not force deterministic page revalidation after write completion.
4. **Retry/offline handling inconsistency**
   - Daily-claim flow had timeout handling, but payout-claim and daily-claim retry/offline strategies were not aligned.
5. **Hot-path timing markers absent**
   - Transport failures did not include structured timing metadata useful for operational triage.

## Optimizations and hardening applied

### 1) Fetch/cache/revalidation hardening

- Enhanced `packages/api-client/src/transport.ts` with:
  - bounded timeout handling
  - retry policy for retryable reads and idempotency-safe writes
  - concurrent GET in-flight dedupe
  - short-lived GET cache
  - deterministic cache invalidation after write requests
  - structured transport timing details on error metadata

### 2) UI responsiveness hardening

- Removed redundant row cloning across table clients in all three apps.
- Removed redundant client-side resorting in Pay tables (server ordering is authoritative).
- Added deferred row rendering updates for table clients to reduce UI blocking under filter/load churn.
- Added missing route-level loading skeleton files for Markets and Points/Tasks routes.
- Added Pay page-size cap (`<=100`) to prevent oversized table payload/render cost.

### 3) Error/retry resilience hardening

- Added `apps/pay-web/app/lib/claim-submission-client.ts`:
  - timeout-safe claim submission
  - retryable failure retries with bounded backoff
  - explicit offline envelope mapping
  - retry guidance for UX
- Hardened `apps/points-tasks-web/app/lib/claim-execution-client.ts`:
  - bounded retries
  - offline-aware errors
  - preserved `intentId` across retries for deterministic resume semantics
- Updated payout claim UI flow to use shared submission helper and preserve clear retry/timeout/offline messaging.

### 4) Bundle/runtime optimization

- Lazy-loaded non-critical claim modules:
  - `apps/pay-web/app/payouts/page.tsx` -> `ClaimFingerprintCardClient`
  - `apps/points-tasks-web/app/points/page.tsx` -> `DailyClaimCard`
- Added lightweight loading placeholders for lazy claim sections.

### 5) Performance guardrails

- Added `pnpm perf:guard` (`tools/perf/phase17-guard.mjs`) to validate:
  - per-app bundle chunk budget thresholds
  - critical route build artifact presence after build
- Added transport timing marker instrumentation for known hot paths.
- Added Phase 17 reliability/performance test coverage in:
  - `packages/api-client/src/__tests__/phase17-reliability-performance.spec.ts`

## Reliability guarantees after Phase 17

1. **Timeout guarantee**
   - HTTP transport requests are bounded by a default timeout (12s) instead of unbounded hangs.
2. **Retry safety guarantee**
   - Retries apply only when retryable and safe:
     - GET/HEAD reads
     - writes with explicit idempotency headers/keys
3. **Revalidation guarantee after critical actions**
   - Claim-success paths trigger route refresh to force deterministic state re-read.
   - Transport write operations invalidate GET cache for subsequent reads.
4. **Error envelope clarity**
   - Timeout/offline/retry exhaustion conditions surface explicit machine-readable codes and retryability guidance.
5. **Race resilience**
   - Claim workflows preserve in-flight locks and retained intent context for deterministic retry continuation.

## Measurement and verification approach

- **Unit/integration tests** (deterministic, CI-safe):
  - GET dedupe behavior
  - cache invalidation after write
  - retry behavior and non-idempotent write non-retry behavior
  - timeout/offline mapping
  - retry resume preserving intent context
  - loading/error/empty state contract consistency checks
  - transport timing marker emission checks
- **Build-time guardrails**:
  - `pnpm perf:guard` after app builds for bundle budget + route artifact checks
- **Standard pipeline validation**:
  - lint/typecheck/build/test plus per-app build commands and api-client test command

## Remaining accepted risks

1. GET cache is intentionally short-lived and transport-local; it reduces duplicate reads but does not replace server-side caching strategy.
2. Bundle guard uses total chunk and route artifact heuristics, not full interactive runtime profiling.
3. Deferred table rendering improves responsiveness under churn but does not implement full virtualization.
4. Retry behavior is bounded and conservative; some upstream-specific transient conditions may still require manual retry from UI.
