# Markets MVP Data Flow (Phase 9)

## Scope

`apps/markets-web` now ships typed Markets MVP route wiring with strict parity alignment against canonical contracts in `ryvra-protocol/markets`.

Runtime modes remain:

- `mock`: deterministic seeded dataset via `@ryvra/api-client` mock transport
- `http`: live transport with parity diagnostics and canonical route mapping

## Route to client boundary map

- `/` and `/overview`
  - `marketsClient.getMarketsOverview()`
- `/instruments`
  - `marketsClient.listInstruments(...)`
  - `marketsClient.getInstrumentSummary(...)`
- `/orders`
  - `marketsClient.listOrders(...)`
  - `marketsClient.getOrderSummary(...)`
- `/positions`
  - `marketsClient.listPositions(...)`
  - `marketsClient.getPositionSummary(...)`
- `/status`
  - `marketsClient.getParityDiagnostics()`

## Apps method → Markets endpoint mapping

| Client method | HTTP method | Endpoint path | Contract source | Status |
| --- | --- | --- | --- | --- |
| `listInstruments` | GET | `/markets/instruments` | apps read-model adapter over `src/domain/unified-asset.ts` | adjusted |
| `getInstrumentSummary` | GET | `/markets/instruments/summary` | apps read-model adapter over canonical instrument state | adjusted |
| `listOrders` | GET | `/markets/orders` | apps read-model adapter over `src/types/order.ts` + `src/service/markets-service.ts` | adjusted |
| `getOrderSummary` | GET | `/markets/orders/summary` | apps read-model adapter over canonical order lifecycle states | adjusted |
| `listPositions` | GET | `/markets/positions` | apps read-model adapter over `src/domain/unified-asset.ts` exposure model | adjusted |
| `getPositionSummary` | GET | `/markets/positions/summary` | apps read-model adapter over exposure/risk projections | adjusted |
| `getMarketsOverview` | GET | `/markets/overview` | apps aggregate read-model adapter over canonical order/position/instrument state | adjusted |

> `ryvra-protocol/markets` currently publishes domain/service contracts and RFC guidance only (no OpenAPI/router-owned HTTP surface).

## DTO boundary ownership

- `@ryvra/domain-markets`
  - owns route-facing read DTOs, summary DTOs, overview DTOs
  - owns canonical enum sets used by app filters and decoder validation
  - owns markets list/filter/pagination/sort contracts
- `@ryvra/api-client`
  - owns transport mapping (`mock`/`http`)
  - owns payload decoding/validation (`markets-codec.ts`)
  - owns parity constants + route map (`markets-parity.ts`)
  - owns normalized error interpretation (`normalizeApiError`)
- `apps/markets-web`
  - owns route orchestration, query param state, and UI composition only

## Auth/config/observability path

- Auth placeholder remains enforced on every Markets route through `createStubAuthGuard`.
- Shared config loader now supplies mode/base URL plus Markets parity markers:
  - `loadMarketsIntegrationConfig(...)`
- Observability captures route-level failures through `@ryvra/observability`.
- `/status` shows mode, base URL, compatibility marker, parity check marker, and non-destructive connectivity probe results.

## Known limitations

1. `ryvra-protocol/markets` has no published OpenAPI or router/controller endpoint contract yet.
2. Current `/markets/*` endpoints are compatibility read-model adapters derived from canonical domain/service contracts.
3. Some UI fields (order type, position risk state bands) are app-level read-model projections and should be replaced by markets-owned read models once published.

## Rollout path: mock → live HTTP mode

1. Develop locally in `mock` mode with deterministic dataset + parity tests.
2. Switch to `http` via `RYVRA_RUNTIME_MODE=http` and `RYVRA_API_BASE_URL`.
3. Configure optional auth/correlation headers and connectivity path.
4. Validate `/status` diagnostics before enabling broader integration.
5. Replace compatibility paths with markets-owned OpenAPI/router endpoints when available.
