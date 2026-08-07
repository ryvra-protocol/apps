# Pay Integration Parity Hardening (Phase 8.5)

## Stage check (before edits)

### Current apps integration surface (`apps/pay-web` + `packages/api-client`)

- UI routes consume read-oriented Pay methods only:
  - `getPayOverview`
  - `listInvoices` + `getInvoiceSummary`
  - `listPayouts` + `getPayoutSummary`
  - `listReconciliationItems` + `getReconciliationSummary`
  - `listSubscriptions`
- Transport supports `mock` and `http` modes.
- Prior status diagnostics exposed only `app`, `mode`, `apiBaseUrl`, and static `healthy: true`.

### Endpoint assumptions vs `ryvra-protocol/pay` exposure

- **Assumed in apps:** HTTP routes under `/pay/*` read models.
- **Actual in pay repo:** no HTTP router/controller/OpenAPI exposure at this stage.
- Canonical pay repo is a domain/service module (types + state machine + service orchestration), not an API server.

### DTO/enums mismatch risk

- Apps read DTOs (invoice/payout/reconciliation dashboard shapes) differ from pay canonical domain objects (`PaymentIntent`, `SettlementSnapshot`, event payloads).
- Apps used uppercase dashboard status enums; pay canonical lifecycle states are lowercase intent states.

### Auth/header strategy status

- Prior client had no standardized bearer, correlation, request-id, or idempotency header wiring.

### Status diagnostics available (before changes)

- Only static config snapshot with no parity metadata and no connectivity probe.

### Stage classification for this objective

- **scaffold**
- Reason: pay repo has canonical domain contracts but no exposed HTTP API contract yet.

### Concrete parity gaps

1. Missing explicit canonical pay protocol/version compatibility declaration in apps.
2. Missing client-side runtime payload validation for pay responses.
3. Missing auth/correlation/idempotency header contract.
4. Missing diagnostics for mode/base URL/version parity/connectivity.
5. Missing parity-focused tests for route mapping/enums/error normalization.

## Cross-repo source-of-truth verification (`ryvra-protocol/pay`)

### Canonical references used

- `README.md` (status + canonical baseline)
- `src/types/payment-intent.ts`
- `src/types/payment-events.ts`
- `src/service/pay-service.ts`
- `src/service/state-machine.ts`
- `src/service/reconciliation.ts`
- `src/service/idempotency-store.ts`
- `src/adapters/policy-client.ts`
- `src/adapters/unified-asset-boundary.ts`
- `src/adapters/accounts-execution-boundary.ts`
- `docs/rfc-0006-pay-rails-and-payment-intents.md`

### Verification summary

- **Endpoint paths / methods:**
  - No OpenAPI/spec/router/controller files found in `ryvra-protocol/pay`.
  - No canonical HTTP endpoint list exists yet.
- **Request payload schemas (canonical domain):**
  - `PaymentIntent`, `PaymentExecution`, `UnifiedAssetReference`, boundary inputs in `src/types/payment-intent.ts`.
- **Response payload schemas (canonical domain):**
  - `PaymentIntent`, `PolicyDecision`, event envelopes, reconciliation result model in `src/types/payment-events.ts` and `src/service/reconciliation.ts`.
- **Enum/status sets:**
  - lifecycle: `created | authorized | executing | settled | failed | reversed`.
  - policy decision: `ALLOW | DENY`.
  - reconciliation result: `matched | mismatch | pending`.
- **Pagination/filter conventions:**
  - Not defined by pay repo HTTP contract (no API exposure yet).
- **Auth requirements:**
  - idempotency tuple and retry semantics documented in `docs/rfc-0006-pay-rails-and-payment-intents.md` and enforced in `src/service/pay-service.ts`.
- **Versioning strategy:**
  - RFC baseline is `v1` draft (`docs/rfc-0006-pay-rails-and-payment-intents.md`), package currently `0.1.0`.

## Phase 8.5 parity alignment implemented in apps

- Added canonical pay protocol types and enums in `@ryvra/domain-payments` alongside existing read-model DTOs.
- Added runtime payload decoding/validation for pay client responses.
- Added parity route map constants + declared compatibility marker/version.
- Added standardized header wiring:
  - `Authorization`
  - request-id header (default `x-request-id`)
  - correlation header (default `x-correlation-id`)
  - idempotency header (default `idempotency-key`) for write paths
- Added canonical write-path client methods for parity:
  - `createPaymentIntent`
  - `transitionPaymentIntent`
  - `reconcileSettlement`
- Enhanced `/pay/status` with parity diagnostics and non-destructive connectivity probing.
- Added parity-focused tests (contracts/routes/enums/errors + optional connectivity smoke guard).

## Endpoint mapping (apps client method -> parity path)

| Client method | HTTP method | Endpoint path | Contract source | Status |
| --- | --- | --- | --- | --- |
| `listInvoices` | GET | `/pay/invoices` | apps read model compatibility | adjusted |
| `getInvoiceSummary` | GET | `/pay/invoices/summary` | apps read model compatibility | adjusted |
| `listPayouts` | GET | `/pay/payouts` | apps read model compatibility | adjusted |
| `getPayoutSummary` | GET | `/pay/payouts/summary` | apps read model compatibility | adjusted |
| `listReconciliationItems` | GET | `/pay/reconciliation/items` | apps read model compatibility | adjusted |
| `getReconciliationSummary` | GET | `/pay/reconciliation/summary` | apps read model compatibility | adjusted |
| `getPayOverview` | GET | `/pay/overview` | apps read model compatibility | adjusted |
| `listSubscriptions` | GET | `/pay/subscriptions` | apps read model compatibility | adjusted |
| `createPaymentIntent` | POST | `/pay/intents` | derived from `src/service/pay-service.ts` + RFC baseline | adjusted |
| `transitionPaymentIntent` | POST | `/pay/intents/{intentId}/transitions` | derived from `transitionIntent(...)` in `src/service/pay-service.ts` | adjusted |
| `reconcileSettlement` | POST | `/pay/reconciliation/intents/{intentId}` | derived from `reconcileIntentSettlement(...)` in `src/service/reconciliation.ts` | adjusted |

## Version compatibility policy

- Declared compatibility string in apps client: `rfc-0006-v1-draft+phase8-read-model-adapter`.
- Build/check marker default: `phase-8.5-2026-08-07T01:25:40.481Z`.
- Runtime overrides supported:
  - `RYVRA_PAY_COMPATIBILITY_VERSION`
  - `RYVRA_PAY_PARITY_CHECK_MARKER`

## Auth/header contract

- Runtime-configurable token/header wiring:
  - `RYVRA_PAY_AUTH_TOKEN`
  - `RYVRA_PAY_AUTH_SCHEME`
  - `RYVRA_PAY_REQUEST_ID_HEADER`
  - `RYVRA_PAY_CORRELATION_ID_HEADER`
  - `RYVRA_PAY_IDEMPOTENCY_HEADER`
- Default headers in HTTP mode:
  - `Authorization header` (when token present)
  - `x-request-id: <uuid>`
  - `x-correlation-id: <uuid or supplied value>`
  - `idempotency-key: <key>` on write calls
- Mock mode remains safe/local with no live dependency.

## Known limitations and next steps

1. `ryvra-protocol/pay` still lacks an officially published HTTP API contract/spec.
2. Existing dashboard read-model endpoints remain compatibility paths until pay publishes canonical API endpoints.
3. Future parity pass should replace derived write route assumptions with published pay OpenAPI/router definitions once available.
