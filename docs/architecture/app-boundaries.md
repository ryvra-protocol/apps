# App Boundaries

## Purpose

Define clear responsibility boundaries between the three frontend apps and shared packages to keep product features isolated while enabling consistent cross-app UX and integration policies.

## Apps

### `apps/markets-web`

- Owns Markets product user flows, page composition, and local feature state.
- Consumes canonical Markets contracts via `@ryvra/api-client` + `@ryvra/domain-markets`.
- Must not implement protocol-level transport logic directly in pages/components.
- Surfaces actionable runtime errors (including diagnostics/status failures) without bypassing shared guardrails.
- Uses shared Unified Balance Card UX, while sourcing account-scoped asset rows via read-only `marketsClient.listPositions`.
- Owns user-facing order trust timeline/evidence composition while consuming shared trust primitives from `@ryvra/ui`.
- Consumes shared in-app notification center + communication preference surfaces from `@ryvra/ui` without introducing product-specific notification persistence contracts.
- Owns Markets-specific portfolio insight KPI composition while using shared insight primitives and existing read-only markets data.
- Must keep Unified Balance in the top-priority dashboard/overview zone ahead of secondary analytics.
- Uses shared scope switcher primitives to enforce canonical account/workspace query state and persistence.
- Applies Viewer/Operator/Admin UI gating for operational controls and evidence panels using shared capability helpers (no backend auth invention).
- Surfaces delegated-operation provenance in orders list/detail surfaces with explicit fallback messaging when backend metadata is unavailable.
- Must consume shared locale/timezone formatting helpers for user-facing number/date/time/currency presentation and avoid app-local hardcoded locale assumptions.

### `apps/pay-web`

- Owns Pay product user flows, page composition, and local feature state.
- Consumes Pay contracts via `@ryvra/api-client` + `@ryvra/domain-payments`.
- Keeps write/transition behavior behind API client methods; no raw protocol payload crafting in UI layers.
- Maintains parity diagnostics with explicit retry/error handling and shared request/correlation headers.
- Fingerprint-style claim confirmation remains a UI interaction boundary only; identity/security remains session/token + server-side validation.
- Uses the same shared Unified Balance Card component/formatting as Markets and consumes read-only Markets positions for cross-app parity.
- Must surface account-scope issues for unified balance explicitly (non-silent).
- Owns claim/payout trust disclosures, receipt rendering, and evidence wiring without introducing new backend contract fields.
- Owns payout-claim client orchestration while enforcing timeout/offline-safe UX and deterministic post-success revalidation.
- Owns claim/payout notification producer mappings for Phase 14 while keeping persistence/deep-link shell behavior inside shared UI primitives.
- Owns Pay-specific portfolio/operational trend KPI composition while keeping Unified Balance in the top-priority zone.
- Uses shared scope switcher primitives to enforce canonical account/workspace query state and persistence.
- Applies Viewer/Operator/Admin gating for claim actions, reconciliation access, and sensitive operational evidence panels with explicit denied reasons.
- Surfaces delegated-operation provenance in payouts/invoices/reconciliation surfaces; when delegation metadata is absent, renders explicit unavailable state (never silent/blank).
- Must consume shared locale/timezone formatting helpers for user-facing number/date/time/currency presentation and avoid app-local hardcoded locale assumptions.

### `apps/points-tasks-web`

- Owns Points/Tasks product user flows, page composition, and local feature state.
- Consumes canonical Points/Tasks OpenAPI contracts via `@ryvra/api-client` + `@ryvra/domain-points`/`@ryvra/domain-tasks`.
- Must not bypass shared parity/auth/scope guards with direct fetch calls.
- Preserves canonical auth optionality: health-only route (`/points-tasks/status/health`) may bypass bearer auth; status/data routes may not.
- Owns points balance and daily-claim status surfaces, including guarded fallback UX when the daily-claim status endpoint is provisional/unavailable.
- Owns task/daily-claim trust timeline composition and explicit unavailable-state messaging for missing operation references.
- Owns retry-safe daily-claim client retry/resume behavior (including retained `intentId` between retry attempts).
- Owns task + daily-claim notification producer mappings for Phase 14 while consuming shared notification center/preference UX from `@ryvra/ui`.
- Must keep points balance + daily-claim surfaces in top-priority zones on both `/points` and `/tasks`.
- Owns points/tasks portfolio insight composition using canonical overview reads and explicit history-window fallback messaging.
- Uses shared scope switcher primitives to enforce canonical account/workspace/user query state and persistence.
- Applies Viewer/Operator/Admin gating for claim actions, task route permissions, and operational evidence visibility.
- Surfaces delegated-operation provenance in points/task list/detail surfaces, using metadata where present and explicit unavailable state when absent.
- Must consume shared locale/timezone formatting helpers for user-facing number/date/time/currency presentation and avoid app-local hardcoded locale assumptions.

## Shared packages

### `@ryvra/api-client`

- Single boundary for backend/API access and transport behavior (`mock`/`http`).
- Enforces canonical route mappings, auth requirements, scope guards, header policy, pagination/deprecation behavior, and error normalization.
- Emits canonical request/correlation IDs for transport and diagnostics probes in both mock and http modes.
- Centralizes reliability controls for HTTP mode (timeout, retry policy, idempotency-aware write retries, short-lived GET dedupe/cache, and write-triggered cache invalidation).
- Exposes hot-path timing diagnostics through transport error metadata and optional metric hooks.
- Exposes parity diagnostics metadata for status pages.
- Hosts shared unified-balance aggregation/format helpers and provisional daily-claim read-status decoding used across apps.
- Does not yet expose notification feed or communication-preference endpoints; apps must surface explicit local-preview/deferred messaging until contracts are published.

### `@ryvra/domain-*`

- Source of typed domain contracts (DTOs, enums, request/response shapes, filters).
- Aligns app-consumed types with canonical protocol contracts.

### `@ryvra/config`

- Source of navigation maps, deep-link helpers, and environment/runtime config parsing.
- Fails fast with variable-level messages for invalid env values and missing HTTP-mode auth tokens on Markets/Points-Tasks integration paths.
- Owns route permission metadata evaluation and product/path permission lookup used by app-level permission-denied rendering.

### `@ryvra/ui`

- Shared shell, navigation, and reusable presentational components.
- No backend integration or product-specific business decisions.
- Owns unified nav iconography and interaction styling semantics across products.
- Owns reusable trust/compliance presentation primitives (timelines, disclosures, evidence panels, receipts, policy links, standardized error transparency copy).
- Owns the reusable in-app notification center, scoped notification state provider, read/unread interactions, category/sort controls, and communication preference surfaces (email/webhook UI-first mode labeling).
- Owns reusable portfolio/insight presentation primitives (window controls, module state rendering, compact trend visuals, and shared formatting helpers).
- Owns shared team/workspace controls primitives:
  - scope parsing/canonicalization/persistence helpers
  - global role/scope switcher component
  - delegated provenance chips and delegation-filter matching helpers
- Enforces Phase 12.5A navigation policy across Markets, Pay, and Points/Tasks:
  - sidebar is collapsed by default on first load and expands only by user action
  - sidebar preference persists via client storage after user interaction
  - icon-only controls always retain accessible labels, tooltips, and `aria-current` semantics
  - top product navigation is rendered as a centered bottom icon dock with safe-area-aware spacing
  - notification center trigger and panel controls preserve keyboard/ARIA/focus semantics across shells
- Owns shared i18n/localization runtime and shell-level preferences:
  - locale provider + translation resolver with default fallback to `en`
  - locale/timezone preference persistence keys and hydration-safe restore
  - locale switcher and timezone switcher header controls
  - RTL direction toggling and shell-level directional mirroring hooks
  - locale-aware number/date/time/currency formatting helpers used by app surfaces

### `@ryvra/auth`

- Auth/session abstractions for HTTP mode integration and account context propagation.
- Owns workspace role model (`Viewer`/`Operator`/`Admin`) and capability checks used for consistent cross-app UI gating.

### `@ryvra/observability`

- Logging/tracing/diagnostic helpers and shared telemetry primitives.

## Protocol ownership boundaries

### Markets (`ryvra-protocol/markets`)

- Canonical OpenAPI is published and used for strict parity in apps.

### Pay (`ryvra-protocol/pay`)

- Canonical domain/service contracts are integrated; full HTTP OpenAPI publication remains pending.

### Points/Tasks (`ryvra-protocol/protocol-core`)

- Canonical OpenAPI is published and enforced in apps parity:
  - `openapi/points-tasks.openapi.yaml`
  - `docs/api-contract-changelog.md`
  - marker `POINTS_TASKS_API_VERSION=2026-08-08.v1`

## Non-goals at app layer

- Re-defining canonical protocol enums/DTOs locally.
- Re-implementing transport/parity/auth rules in page components.
- Introducing per-app ad hoc error formats for protocol-backed routes.
- Wiring new pay-intent write execution flows for Points daily claim in Phase 12B (explicitly deferred to Phase 12.5B).

## Change policy

- Cross-app integration behavior changes must be implemented in shared packages first (`@ryvra/api-client`, relevant `@ryvra/domain-*`).
- App-level changes should consume shared updates with minimal glue code.
- Backward compatibility beyond canonical deprecation windows must be explicit and documented.

## Phase 19 boundaries: growth and conversion UX

- `apps/markets-web`
  - Consumes shared activation funnel tracking from the shell and shared onboarding checklist entry points in dashboard/overview top-priority zones.
  - Treats first-action funnel progression as route-level operational workflow entry (`/orders`, `/positions`) without introducing new write behavior.
- `apps/pay-web`
  - Owns payout claim conversion surfaces while consuming shared experiment assignment/tracking primitives.
  - Must preserve existing permission/runtime guards (`canOperate`, claim availability) regardless of experiment variant.
  - Emits claim conversion outcomes through shared growth instrumentation without exposing request payloads or secrets.
- `apps/points-tasks-web`
  - Owns daily-claim conversion surfaces while consuming shared experiment assignment/tracking primitives.
  - Must preserve existing claim eligibility and operator guardrails regardless of experiment variant.
  - Emits task-route activation funnel progression from shell and claim outcomes from daily-claim card.
- `@ryvra/ui`
  - Owns Phase 19 shared primitives:
    - growth funnel/event model + local-preview sink
    - reusable getting-started checklist model/component
    - claim conversion experiment assignment + event tracker + accessible variant status surface
  - Must remain privacy-safe by hashing scope context and redacting sensitive metadata keys before persistence.
- `@ryvra/api-client` / backend services
  - No new analytics endpoint contract is assumed in this phase.
  - Remote sink wiring is explicitly deferred; current implementation remains local/dev instrumentation only.
