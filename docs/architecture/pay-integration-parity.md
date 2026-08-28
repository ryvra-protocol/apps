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

- **Assumed in apps:** HTTP routes under `/pay/*` read/write models.
- **Actual in pay repo:** canonical HTTP OpenAPI is published at `openapi/pay.openapi.yaml` with changelog `docs/api-contract-changelog.md`.
- **Current Apps pin:** OpenAPI SHA `27bae071d8779801eb9c35e9b8e3db6af0d06d26`, commit `4b61bf09bc16a3676ea8241675ba2d76cd22d74c`.

### DTO/enums mismatch risk

- Apps read DTOs (invoice/payout/reconciliation dashboard shapes) differ from pay canonical domain objects (`PaymentIntent`, `SettlementSnapshot`, event payloads).
- Apps used uppercase dashboard status enums; pay canonical lifecycle states are lowercase intent states.

### Auth/header strategy status

- Prior client had no standardized bearer, correlation, request-id, or idempotency header wiring.

### Status diagnostics available (before changes)

- Only static config snapshot with no parity metadata and no connectivity probe.

### Stage classification for this objective

- **aligned**
- Reason: canonical pay OpenAPI is published and pinned in Apps; remaining caveats are feature-level semantics, not source-of-truth publication.

### Concrete parity gaps

1. Missing explicit canonical pay protocol/version compatibility declaration in apps.
2. Missing client-side runtime payload validation for pay responses.
3. Missing auth/correlation/idempotency header contract.
4. Missing diagnostics for mode/base URL/version parity/connectivity.
5. Missing parity-focused tests for route mapping/enums/error normalization.

## Cross-repo source-of-truth verification (`ryvra-protocol/pay`)

### Canonical references used

- `openapi/pay.openapi.yaml`
- `docs/api-contract-changelog.md`
- `docs/rfc-0006-pay-rails-and-payment-intents.md`

### Verification summary

- **Endpoint paths / methods:**
  - Canonical `/pay/*` read and write routes are published in `openapi/pay.openapi.yaml`.
- **Request/response payload schemas (canonical HTTP + domain):**
  - OpenAPI defines endpoint-level request/response schema shapes.
  - Domain/service references (`PaymentIntent`, `PaymentExecution`, reconciliation primitives) remain the implementation baseline.
- **Enum/status sets:**
  - lifecycle: `created | authorized | executing | settled | failed | reversed`.
  - policy decision: `ALLOW | DENY`.
  - reconciliation result: `matched | mismatch | pending`.
- **Pagination/filter conventions:**
  - Canonical query conventions are defined in the published Pay OpenAPI contract.
- **Auth requirements:**
  - idempotency tuple and retry semantics documented in `docs/rfc-0006-pay-rails-and-payment-intents.md` and enforced in `src/service/pay-service.ts`.
- **Versioning strategy:**
  - Published contract version is `1.0.0` (`info.version`) with semantic-versioned contract changes tracked in `docs/api-contract-changelog.md`.

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
| `listInvoices` | GET | `/pay/invoices` | `openapi/pay.openapi.yaml` | adjusted |
| `getInvoiceSummary` | GET | `/pay/invoices/summary` | `openapi/pay.openapi.yaml` | adjusted |
| `listPayouts` | GET | `/pay/payouts` | `openapi/pay.openapi.yaml` | adjusted |
| `getPayoutSummary` | GET | `/pay/payouts/summary` | `openapi/pay.openapi.yaml` | adjusted |
| `listReconciliationItems` | GET | `/pay/reconciliation/items` | `openapi/pay.openapi.yaml` | adjusted |
| `getReconciliationSummary` | GET | `/pay/reconciliation/summary` | `openapi/pay.openapi.yaml` | adjusted |
| `getPayOverview` | GET | `/pay/overview` | `openapi/pay.openapi.yaml` | adjusted |
| `listSubscriptions` | GET | `/pay/subscriptions` | `openapi/pay.openapi.yaml` (deprecated) | adjusted |
| `createPaymentIntent` | POST | `/pay/intents` | `openapi/pay.openapi.yaml` | adjusted |
| `transitionPaymentIntent` | POST | `/pay/intents/{intentId}/transitions` | `openapi/pay.openapi.yaml` | adjusted |
| `reconcileSettlement` | POST | `/pay/reconciliation/intents/{intentId}` | `openapi/pay.openapi.yaml` | adjusted |

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

1. `ryvra-protocol/pay` has a published canonical HTTP API contract pinned in Apps (`openapi/pay.openapi.yaml`, SHA `27bae071d8779801eb9c35e9b8e3db6af0d06d26`).
2. Existing dashboard route UX still includes compatibility adapters around canonical payloads.
3. Claim-specific workflow semantics may remain deferred/provisional even when the canonical base endpoints are published.
