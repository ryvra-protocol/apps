# Integration Map

## Internal app-to-package integration

- `apps/markets-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-markets`
- `apps/pay-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-payments`
- `apps/points-tasks-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-points`, `@ryvra/domain-tasks`

## Cross-app routing foundation

- `@ryvra/config` exposes canonical global + product navigation maps and deep-link helpers.
- `@ryvra/ui` provides shared shell/navigation primitives consumed by all three apps.
- Cross-app context handoff uses query params (`ref`, `entity`, `id`, `ctx`) validated by shared schema utilities.

## Markets integration map (Phase 9.5 v2 strict parity)

- `apps/markets-web` runtime (`app/lib/runtime.ts`) loads mode/API config and constructs `createApiClient(...).markets`.
- `@ryvra/domain-markets` exports:
  - canonical Markets enum surfaces and DTO/request contracts
  - account-scoped request contracts for orders/positions/overview
  - cursor-first pagination contracts with deprecated page compatibility
- `@ryvra/api-client` markets surface includes:
  - `listInstruments`, `getInstrumentSummary`
  - `listOrders`, `getOrderSummary`
  - `listPositions`, `getPositionSummary`
  - `getMarketsOverview`, `getParityDiagnostics`
  - hard HTTP guards:
    - required bearer auth on non-health routes
    - required `account_id` for account-scoped endpoints
    - required request/correlation ids
  - canonical error-envelope normalization (`code`, `message`, `retryable`, `source`, optional `details`)
  - diagnostics route now surfaces actionable error states when parity probes fail
- query/filter parity in HTTP mode uses canonical snake_case keys.
- `/markets/status` displays mode, base URL, source OpenAPI refs, compatibility marker, parity marker, and connectivity probe result.

## Markets source-of-truth linkage (`ryvra-protocol/markets`)

- Canonical merged contract references:
  - `openapi/markets.openapi.yaml`
  - `docs/api-contract-changelog.md`
- Current Apps marker linkage:
  - `MARKETS_API_VERSION=2026-08-08`
  - OpenAPI SHA `cc08c626f2f26e192fe86d744d2aa1798c9c690a`
  - OpenAPI commit `87b7bf6764be28a6f6b89ff6f6226fe1f40fda46`

## Pay integration map (Phase 8.5 parity hardening)

- `apps/pay-web` runtime (`app/lib/runtime.ts`) loads mode/API config and constructs `createPayClient(...)` with parity-aware auth/header settings.
- `@ryvra/domain-payments` now exports:
  - dashboard read-model DTOs (invoices/payouts/reconciliation/overview)
  - canonical pay protocol contracts (payment intents/events/reconciliation primitives)
- `@ryvra/api-client` pay surface now includes:
  - read-model methods used by current UI
  - parity write methods (`createPaymentIntent`, `transitionPaymentIntent`, `reconcileSettlement`)
  - runtime payload decoding and parity diagnostics (`getParityDiagnostics`)
  - canonical request/correlation id emission across both data paths and diagnostics probes
- query/filter parity in HTTP mode uses snake_case compatibility keys.
- `/pay/status` displays mode, base URL, compatibility version, parity marker, and connectivity probe result.
- `/pay/status` now renders explicit retryable error state when diagnostics cannot be loaded.
- `/pay/payouts` now exposes a user-facing `Claim` CTA via `app/components/claim-fingerprint-card-client.tsx` with a UI-only fingerprint-style confirmation step (no WebAuthn).
- Claim submissions flow through `app/api/claims/payout/route.ts` and call `payClient.createPaymentIntent(...)` -> `POST /pay/intents` with idempotency key + request/correlation IDs attached on every write request.
- In `http` mode, claim submission is disabled unless `RYVRA_PAY_AUTH_TOKEN` is configured; UI always shows an explicit reason when claim is disabled.

## Phase 12B additions: unified balance + points daily-claim read flow

- Shared **Unified Balance Card** is now consumed by both:
  - `apps/markets-web` (dashboard + overview)
  - `apps/pay-web` (dashboard + overview)
- Unified balance data source is read-only and account-scoped:
  - `marketsClient.listPositions({ account_id })`
  - deterministic aggregation + formatting from shared `@ryvra/api-client` helpers (`unified-balance.ts`)
- Pay app unified-balance scope uses `RYVRA_MARKETS_ACCOUNT_ID` (or mock fallback) and surfaces explicit scope errors when missing/mismatched.
- `apps/points-tasks-web` now includes:
  - points balance card on `/points`
  - points balance card on `/tasks` via shared points-summary request builder
  - `/points` daily-claim module driven by read-only status (`pointsTasksClient.getDailyClaimStatus`) with guarded fallback when endpoint is unavailable.
- Daily-claim endpoint path remains provisional (`GET /points-tasks/eligibility`) and is treated as read-only status metadata (no write execution).
- **Explicit deferral:** Phase 12B does not add or wire pay write-intent execution (`POST /pay/intents` / transition writes) for daily claim; that remains deferred to Phase 12.5B.

## Pay source-of-truth linkage (`ryvra-protocol/pay`)

- Canonical source files currently define domain/service contracts (no published HTTP router/spec yet):
  - `src/types/payment-intent.ts`
  - `src/types/payment-events.ts`
  - `src/service/pay-service.ts`
  - `src/service/reconciliation.ts`
  - `src/service/state-machine.ts`
  - `docs/rfc-0006-pay-rails-and-payment-intents.md`

## Points/Tasks integration map (Phase 10.5 strict canonical parity)

- `apps/points-tasks-web` runtime (`app/lib/runtime.ts`) loads mode/API config and constructs `createApiClient(...).pointsTasks`.
- `@ryvra/domain-points` and `@ryvra/domain-tasks` now export:
  - canonical OpenAPI-aligned enum/DTO/request contracts
  - account-scoped request contracts with optional `user_id`/`workspace_id`
  - cursor-first pagination with canonical deprecated `page` compatibility only
- `@ryvra/api-client` pointsTasks surface includes:
  - `listPointEntries`, `getPointSummary`, `getPointsOverview`
  - `listTasks`, `getTaskSummary`, `getTasksOverview`
  - `getParityDiagnostics`
  - hard HTTP guards:
    - bearer required by default
    - auth optional only for `/points-tasks/status/health`
    - required `account_id` on scoped endpoints
    - required request/correlation ids
  - canonical Points/Tasks error-envelope normalization (`code`, `message`, `retryable`, `source`, optional `details`)
  - canonical health optionality hardened: non-canonical `/health` no longer bypasses auth guards
- query/filter parity now uses canonical Points/Tasks keys (`entry_*`, `task_*`, `occurred_*`, `due_*`, `sort`).
- `/status` displays canonical OpenAPI/changelog linkage, compatibility marker, parity marker, and connectivity probe result.

## Points/Tasks source-of-truth linkage (`ryvra-protocol/protocol-core`)

- Canonical merged contract references:
  - `openapi/points-tasks.openapi.yaml`
  - `docs/api-contract-changelog.md`
- Current Apps marker linkage:
  - `POINTS_TASKS_API_VERSION=2026-08-08.v1`
  - OpenAPI SHA `89e790e859984892fcfbbe7e0b3e7dd2f159b2e7`
  - OpenAPI commit `b3abbc4fce3ee4024ba39049623a870747a521f7`

## External Ryvra touchpoints (future integration targets)

- **Ryvra Identity/Auth services:** concrete session validation and role claims.
- **Ryvra Markets services:** canonical `/markets/*` contract now published and enforced in apps parity wiring.
- **Ryvra Pay services:** canonical HTTP/API publication still pending.
- **Ryvra Points/Tasks services:** canonical endpoint-level OpenAPI is now published and wired in apps parity contracts.
- **Ryvra observability stack:** structured logs, tracing, and alerting pipeline.

## Phase 11 release-readiness hardening highlights

- `@ryvra/config` now fails fast in HTTP mode when critical Markets/Points-Tasks auth token env vars are missing.
- `@ryvra/api-client` normalizes canonical error envelopes more consistently on fallback paths.
- Status routes across apps now keep retry-oriented UX and aligned diagnostics error handling behavior.

## Placement guidance for future business logic

- Domain-specific orchestration belongs in app-level features unless shared by multiple apps.
- Stable shared domain rules should move into domain packages.
- Infrastructure bindings (HTTP SDKs, auth adapters) should remain behind `@ryvra/api-client` and `@ryvra/auth` interfaces.
