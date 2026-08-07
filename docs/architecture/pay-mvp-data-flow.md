# Pay MVP Data Flow (Phase 8)

## Scope

Phase 8 wires `apps/pay-web` routes to typed Pay data contracts through `@ryvra/api-client` with dual runtime transport modes:

- `mock`: deterministic seeded in-memory responses for local/dev workflows
- `http`: endpoint-ready transport against configured API base URL

## Route to data boundary map

- `/` and `/overview`
  - `payClient.getPayOverview()`
  - renders aggregate cards + recent activity from a single overview DTO
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
  - runtime/config health snapshot

## DTO boundaries

Contracts are defined in `@ryvra/domain-payments` and consumed by `@ryvra/api-client` and `apps/pay-web`:

- `InvoiceDto`, `InvoiceSummaryDto`, `InvoiceFilters`
- `PayoutDto`, `PayoutSummaryDto`, `PayoutFilters`
- `ReconciliationItemDto`, `ReconciliationSummaryDto`, `ReconciliationFilters`
- `PayOverviewDto` (+ metrics/activity nested DTOs)
- shared list contracts: `PayListRequest<TFilters>`, `PayListResponse<TItem>`, pagination/sort/date-range DTOs

## API client contracts and transport behavior

`createPayClient(...)` exposes:

- `listInvoices`
- `getInvoiceSummary`
- `listPayouts`
- `getPayoutSummary`
- `listReconciliationItems`
- `getReconciliationSummary`
- `getPayOverview`

Error handling uses normalized API errors with:

- `code`
- `message`
- `retryable`
- `source`

## HTTP endpoint plug points

Current HTTP-ready paths used by the Pay client:

- `GET /pay/overview`
- `GET /pay/invoices`
- `GET /pay/invoices/summary`
- `GET /pay/payouts`
- `GET /pay/payouts/summary`
- `GET /pay/reconciliation/items`
- `GET /pay/reconciliation/summary`

To connect a real backend, implement these handlers and preserve the DTO shapes from `@ryvra/domain-payments`.

## Auth and observability wiring

- Route-level guard placeholder uses `@ryvra/auth` (`createStubAuthGuard`)
- Runtime mode/API config loaded via `@ryvra/config`
- Fetch failures and route-critical errors are logged via `@ryvra/observability`

## Known MVP limitations

- Route guard is a placeholder (no real session provider integration)
- Filters/pagination are query-param driven and basic
- Reconciliation drilldown is row expansion only (no dedicated detail route yet)
- Mock mode data is deterministic and finite (not persistence-backed)
