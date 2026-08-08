# Markets MVP Data Flow (Phase 9.5 v2)

## Scope

`apps/markets-web` now consumes the merged canonical Markets OpenAPI contract from `ryvra-protocol/markets`:

- `openapi/markets.openapi.yaml`
- `docs/api-contract-changelog.md`

The Markets runtime preserves dual modes:

- `mock`: deterministic local responses in canonical shape
- `http`: strict parity gates for auth/account/header/cursor behavior

## Route to client boundary map

- `/` and `/overview`
  - `marketsClient.getMarketsOverview({ accountId })`
- `/instruments`
  - `marketsClient.listInstruments(...)`
  - `marketsClient.getInstrumentSummary(...)`
- `/orders`
  - `marketsClient.listOrders({ accountId, ... })`
  - `marketsClient.getOrderSummary({ accountId, ... })`
- `/positions`
  - `marketsClient.listPositions({ accountId, ... })`
  - `marketsClient.getPositionSummary({ accountId, ... })`
- `/status`
  - `marketsClient.getParityDiagnostics()`

## Hard parity gate behavior

### Account scope

`account_id` is required for:

- `/markets/orders`
- `/markets/orders/summary`
- `/markets/positions`
- `/markets/positions/summary`
- `/markets/overview`

HTTP mode fails fast with `invalid_request` if account scope is missing.

### Auth + headers

In HTTP mode:

- non-health Markets routes require bearer auth in `Authorization`
- `/health` remains auth-optional
- `x-request-id` and `x-correlation-id` are always sent

### Pagination

Cursor-first policy:

- canonical: `limit`, `cursor`
- compatibility-only (deprecated): `page`
- cursor wins if both are provided

### Deprecated response field compatibility

- canonical: `net_exposure_band`
- temporary fallback accepted: `net_exposure_bucket` (remove no earlier than `2027-02-08`)

## Data boundary ownership

- `@ryvra/domain-markets`
  - canonical enum sets and DTO/request contracts
- `@ryvra/api-client`
  - transport wiring, request guards, canonical decode/error normalization
- `apps/markets-web`
  - route orchestration, cursor-oriented query handling, status diagnostics rendering

## Status diagnostics markers

`/status` includes:

- canonical source paths
- OpenAPI SHA + commit marker
- compatibility/parity markers
- auth/account requirement metadata
- cursor/deprecation policy metadata
- connectivity probe result
