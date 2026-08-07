# Pay MVP Data Flow (Phase 8 / 8.5)

## Scope

`apps/pay-web` remains read-model focused while adding Phase 8.5 integration parity hardening against `ryvra-protocol/pay` canonical contracts.

Runtime modes are preserved:

- `mock`: deterministic local fixtures
- `http`: live transport with parity diagnostics, payload validation, and header wiring

## Route to client boundary map

- `/` and `/overview`
  - `payClient.getPayOverview()`
- `/invoices`
  - `payClient.listInvoices(...)`
  - `payClient.getInvoiceSummary(...)`
- `/payouts`
  - `payClient.listPayouts(...)`
  - `payClient.getPayoutSummary(...)`
- `/reconciliation`
  - `payClient.listReconciliationItems(...)`
  - `payClient.getReconciliationSummary(...)`
- `/status`
  - `payClient.getParityDiagnostics()`

## Contracts and parity alignment

### Read-model DTOs (dashboard-facing)

- `InvoiceDto`, `PayoutDto`, `ReconciliationItemDto`, summaries, and overview models
- shared list/filter contracts: `PayListRequest`, `PayListResponse`, pagination, sort, date range

### Canonical pay protocol DTOs (source-of-truth aligned)

- `PaymentIntent`, `PaymentIntentState`, `PaymentExecution`, `SettlementSnapshot`, `ReconciliationResult`
- canonical states: `created | authorized | executing | settled | failed | reversed`
- canonical protocol version marker: `rfc-0006-v1-draft`

### Client parity write paths (UI still read-only)

- `createPaymentIntent` -> `POST /pay/intents`
- `transitionPaymentIntent` -> `POST /pay/intents/{intentId}/transitions`
- `reconcileSettlement` -> `POST /pay/reconciliation/intents/{intentId}`

These endpoints are parity-derived from pay service semantics until `ryvra-protocol/pay` publishes router/spec files.

## HTTP behavior and diagnostics

- pay client query names aligned to snake_case compatibility (`page_size`, `sort_field`, `sort_direction`, `destination_type`, `exception_only`)
- response payloads are runtime-validated; invalid shapes fail fast with `pay_payload_validation_failed`
- `/pay/status` now reports:
  - active mode
  - configured base URL
  - declared compatibility version
  - parity marker
  - connectivity probe result

## Auth and observability

- configurable auth/header injection in HTTP mode:
  - bearer auth
  - request ID
  - correlation ID
  - idempotency header on write paths
- mock mode keeps local-only behavior and does not require secrets
- route-level errors continue through `@ryvra/observability`

## Limitations

1. pay repo currently exposes domain/service contracts without published HTTP routes/spec.
2. Dashboard routes continue to rely on read-model compatibility endpoints.
3. Canonical endpoint assumptions should be replaced with pay-owned OpenAPI/router contracts when published.
