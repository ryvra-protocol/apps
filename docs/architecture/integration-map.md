# Integration Map

## Internal app-to-package integration

- `apps/markets-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-markets`
- `apps/pay-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-payments`
- `apps/points-tasks-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-points`, `@ryvra/domain-tasks`

## Cross-app routing foundation

- `@ryvra/config` exposes canonical global + product navigation maps and deep-link helpers.
- `@ryvra/ui` provides shared shell/navigation primitives consumed by all three apps.
- Cross-app context handoff uses query params (`ref`, `entity`, `id`, `ctx`) validated by shared schema utilities.
- Phase 12.5A shell map in `@ryvra/ui`:
  - shared sidebar defaults to collapsed (icon-only) until the user toggles it
  - sidebar collapse preference is persisted in client storage and reused across app loads
  - top product nav destinations now route through a centered floating bottom icon dock (non-full-width)
  - icon-only nav controls preserve accessibility with labels/tooltips/focus states and active-route `aria-current`

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

## Phase 12B + 12.5B additions: unified balance + points daily-claim execution flow

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
  - `/points` daily-claim module driven by read/status metadata (`pointsTasksClient.getDailyClaimStatus`) plus write execution through `/api/claims/daily`.
- Daily-claim status endpoint remains provisional (`GET /points-tasks/eligibility`), while claim execution now uses existing Pay write APIs:
  - `POST /pay/intents`
  - `POST /pay/intents/{id}/transitions`
- Phase 12.5B claim writes are idempotent and retry-safe:
  - per-attempt idempotency key generation
  - request/correlation ID emission on every write
  - partial-failure resume via retained `intentId`
  - explicit terminal failure messaging and new-attempt semantics
- Fingerprint/WebAuthn/passkey auth is still out of scope for Points daily claim in this phase.

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

## Phase 13 trust/security/compliance UX map

- Shared trust primitives now live in `@ryvra/ui`:
  - `OperationTimelineCard`
  - `ComplianceEvidencePanel`
  - `TrustDisclosureCard`
  - `ErrorTransparencySummary`
  - `PolicyLinksCard`
  - `ConfirmationReceiptCard`
- Shared evidence sanitization redacts sensitive trust fields and renders explicit unavailable placeholders.
- App integration points:
  - `apps/markets-web/app/orders/page.tsx`
    - latest order timeline + compliance evidence + policy/help links
    - references: order/reference/correlation/route IDs
  - `apps/pay-web/app/payouts/page.tsx` and `app/components/claim-fingerprint-card-client.tsx`
    - payout timeline + claim submission timeline
    - claim confirmation receipt and evidence panel with intent/request/correlation/idempotency references
  - `apps/points-tasks-web/app/points/page.tsx` and `app/tasks/page.tsx`
    - daily-claim and task progression timelines
    - evidence panels with explicit unavailable states where request/correlation IDs are not present
- Error UX across app-level `page-states.tsx` now uses `ErrorTransparencySummary` to standardize:
  - what happened
  - retry safety
  - next-step guidance
  - source/retryability trust metadata

## Phase 17 reliability + performance hardening map

- `@ryvra/api-client` HTTP transport (`packages/api-client/src/transport.ts`) now centralizes:
  - bounded request timeouts
  - retry policy for retry-safe reads and idempotency-keyed writes
  - concurrent GET in-flight dedupe + short TTL cache
  - deterministic cache invalidation after writes
  - timing markers for hot-path diagnostics (`error.details.transport` + optional request metric callback)
- Claim execution reliability alignment:
  - `apps/pay-web/app/lib/claim-submission-client.ts` adds timeout/offline handling + bounded retries for payout claim submissions
  - `apps/points-tasks-web/app/lib/claim-execution-client.ts` now retries retryable failures and preserves `intentId` across attempts
  - both claim flows trigger deterministic data revalidation after successful writes (route refresh)
- UI responsiveness hardening:
  - table clients now avoid redundant row cloning/sorting and use deferred row rendering updates under filter/load churn
  - missing route-level loading skeletons were added in Markets and Points/Tasks to match Pay route behavior
- Bundle/runtime hardening:
  - non-critical claim modules are lazy-loaded on `/pay/payouts` and `/points`
  - performance guard command `pnpm perf:guard` validates chunk budgets and critical route build artifacts after builds

## Phase 14 notifications + comms map

- Shared in-app notification center is implemented in `@ryvra/ui` (`NotificationCenterProvider` + `NotificationCenterControl`) and mounted by every app shell:
  - entry point: bell icon in global header with unread badge
  - panel capabilities: category filters (`All`, `Claims`, `Payouts`, `Tasks`, `System`), deterministic sorting, read/unread controls, deep-link actions
  - explicit local-preview feed labeling when remote notification feed wiring is unavailable
- Notification producers:
  - `apps/pay-web/app/components/claim-fingerprint-card-client.tsx`
    - emits claim lifecycle notifications (`submitted`, `processing`, `completed`, `failed/retryable`)
  - `apps/pay-web/app/components/payout-status-notification-bridge.tsx`
    - maps payout statuses to user notifications (`created/queued`, `processing`, `completed`, `failed/retryable`)
  - `apps/points-tasks-web/app/components/daily-claim-card.tsx`
    - emits daily-claim lifecycle notifications (`submitted`, `processing`, `completed`, `failed/retryable`)
  - `apps/points-tasks-web/app/components/task-status-notification-bridge.tsx`
    - maps task progression statuses (`assigned/eligible`, `in-progress`, `completed/reward-ready`, terminal issue states)
- Preferences UI:
  - hosted inside notification center panel
  - email + webhook global toggles and per-category toggles
  - webhook URL validation with inline error messaging
  - test ping intentionally disabled with explicit reason until remote execution support exists
- Persistence model in Phase 14:
  - notification history: local storage, scope-keyed by app + account/workspace/user query context
  - communication preferences: local storage only with explicit `local preview settings` labeling
  - no silent fake remote persistence
- Deferred backend wiring:
  - no canonical notification-feed API surfaced yet in `@ryvra/api-client`
  - no canonical remote email/webhook preference endpoint surfaced yet in `@ryvra/api-client`
  - UI exposes explicit preview-state copy until these contracts are available

## Placement guidance for future business logic

- Domain-specific orchestration belongs in app-level features unless shared by multiple apps.
- Stable shared domain rules should move into domain packages.
- Infrastructure bindings (HTTP SDKs, auth adapters) should remain behind `@ryvra/api-client` and `@ryvra/auth` interfaces.
