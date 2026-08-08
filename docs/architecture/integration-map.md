# Integration Map

## Internal app-to-package integration

- `apps/markets-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-markets`
- `apps/pay-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-payments`
- `apps/points-tasks-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-tokenomics`

## Cross-app routing foundation

- `@ryvra/config` exposes canonical global + product navigation maps and deep-link helpers.
- `@ryvra/ui` provides shared shell/navigation primitives consumed by all three apps.
- Cross-app context handoff uses query params (`ref`, `entity`, `id`, `ctx`) validated by shared schema utilities.

## Markets integration map (Phase 9 MVP data wiring + parity)

- `apps/markets-web` runtime (`app/lib/runtime.ts`) loads mode/API config and constructs `createApiClient(...).markets`.
- `@ryvra/domain-markets` exports:
  - markets MVP read-model DTOs (instruments/orders/positions/overview + summaries)
  - canonical enum surfaces (sides/order lifecycle/policy-aware risk flags)
  - shared list/filter/pagination/sort contracts
- `@ryvra/api-client` markets surface includes:
  - `listInstruments`, `getInstrumentSummary`
  - `listOrders`, `getOrderSummary`
  - `listPositions`, `getPositionSummary`
  - `getMarketsOverview`, `getParityDiagnostics`
- query/filter parity in HTTP mode uses snake_case compatibility keys.
- `/markets/status` displays mode, base URL, compatibility version, parity marker, and connectivity probe result.

## Markets source-of-truth linkage (`ryvra-protocol/markets`)

- Canonical source files currently define domain/service contracts (no published OpenAPI/router yet):
  - `src/types/market-intent.ts`
  - `src/types/order.ts`
  - `src/adapters/execution-adapter.ts`
  - `src/adapters/policy-client.ts`
  - `src/domain/unified-asset.ts`
  - `src/service/markets-service.ts`
  - `docs/rfc-0007-markets-intents-and-execution.md`

## Pay integration map (Phase 8.5 parity hardening)

- `apps/pay-web` runtime (`app/lib/runtime.ts`) loads mode/API config and constructs `createPayClient(...)` with parity-aware auth/header settings.
- `@ryvra/domain-payments` now exports:
  - dashboard read-model DTOs (invoices/payouts/reconciliation/overview)
  - canonical pay protocol contracts (payment intents/events/reconciliation primitives)
- `@ryvra/api-client` pay surface now includes:
  - read-model methods used by current UI
  - parity write methods (`createPaymentIntent`, `transitionPaymentIntent`, `reconcileSettlement`)
  - runtime payload decoding and parity diagnostics (`getParityDiagnostics`)
- query/filter parity in HTTP mode uses snake_case compatibility keys.
- `/pay/status` displays mode, base URL, compatibility version, parity marker, and connectivity probe result.

## Pay source-of-truth linkage (`ryvra-protocol/pay`)

- Canonical source files currently define domain/service contracts (no published HTTP router/spec yet):
  - `src/types/payment-intent.ts`
  - `src/types/payment-events.ts`
  - `src/service/pay-service.ts`
  - `src/service/reconciliation.ts`
  - `src/service/state-machine.ts`
  - `docs/rfc-0006-pay-rails-and-payment-intents.md`

## External Ryvra touchpoints (future integration targets)

- **Ryvra Identity/Auth services:** concrete session validation and role claims.
- **Ryvra Markets services:** compatibility `/markets/*` read-model adapters in apps pending markets-owned published HTTP/API contract.
- **Ryvra Pay services:** canonical HTTP/API publication still pending.
- **Ryvra Points/Tasks services:** eligibility, conversion, and task event APIs.
- **Ryvra observability stack:** structured logs, tracing, and alerting pipeline.

## Placement guidance for future business logic

- Domain-specific orchestration belongs in app-level features unless shared by multiple apps.
- Stable shared domain rules should move into domain packages.
- Infrastructure bindings (HTTP SDKs, auth adapters) should remain behind `@ryvra/api-client` and `@ryvra/auth` interfaces.
