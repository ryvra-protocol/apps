# Markets Integration Parity (Phase 9.5 v2)

## Canonical source of truth

The Apps Markets integration is now pinned to the merged canonical Markets OpenAPI in `ryvra-protocol/markets` `main`:

- `openapi/markets.openapi.yaml`
- `docs/api-contract-changelog.md`

Compatibility markers used by Apps runtime:

- OpenAPI SHA: `cc08c626f2f26e192fe86d744d2aa1798c9c690a`
- OpenAPI commit: `87b7bf6764be28a6f6b89ff6f6226fe1f40fda46`
- Version marker: `MARKETS_API_VERSION=2026-08-08`
- Apps parity marker: `phase-9-5-v2-2026-08-08T06:30:01.561Z`

## Enforced parity gates

### Account scope (`account_id`)

`account_id` is required for:

- `/markets/orders`
- `/markets/orders/summary`
- `/markets/positions`
- `/markets/positions/summary`
- `/markets/overview`

`@ryvra/api-client` enforces this at runtime for HTTP mode and fails fast with `invalid_request` if missing.

### Auth/header policy

In HTTP mode:

- All non-health `/markets/*` calls require an `Authorization` header using the bearer auth scheme.
- `/health` remains auth-optional.
- `x-request-id` and `x-correlation-id` are always sent (generated if absent).

### Pagination policy

Cursor is canonical:

- Preferred request params: `limit`, `cursor`.
- Deprecated compatibility param: `page` (retained for migration window; no earlier than `2027-02-08`).
- Cursor takes precedence when both cursor and page are supplied.

### Deprecated response field fallback

Canonical exposure field:

- `net_exposure_band`

Temporary fallback accepted by decoder:

- `net_exposure_bucket` (deprecated, remove no earlier than `2027-02-08`)

Decoded app DTOs always normalize to canonical `netExposureBand`.

### Error envelope

Markets HTTP error normalization is canonical-envelope first:

- `code`
- `message`
- `retryable`
- `source`
- optional `details`

## Endpoint parity map

| Client method | HTTP | Path |
| --- | --- | --- |
| `listInstruments` | GET | `/markets/instruments` |
| `getInstrumentSummary` | GET | `/markets/instruments/summary` |
| `listOrders` | GET | `/markets/orders` |
| `getOrderSummary` | GET | `/markets/orders/summary` |
| `listPositions` | GET | `/markets/positions` |
| `getPositionSummary` | GET | `/markets/positions/summary` |
| `getMarketsOverview` | GET | `/markets/overview` |
| `getParityDiagnostics` | GET | `/health` (primary) |
