# Phase 21: Brand direction + P2P + Merchant dashboard

## Scope

Phase 21 applies brand direction through shared color tokens and component styling, and introduces Pay P2P + merchant operational surfaces.

> Logo assets are explicitly excluded in Phase 21. No logo files are modified or replaced.

## Brand token palette

Implemented shared token minimums in `packages/ui/src/theme.ts`:

- Primary: `#3B5BFF`
- Secondary: `#14B8A6`
- Accent: `#7C3AED`
- Success: `#16A34A`
- Warning: `#F59E0B`
- Danger: `#DC2626`
- Background dark: `#0B1020`
- Background light: `#F8FAFC`
- Text primary: `#0F172A`
- Text secondary: `#475569`
- Inverse text: `#FFFFFF`
- Border light: `#CBD5E1`
- Border dark: `#1E293B`

## Brand usage rules

- Primary is the default main CTA token for action buttons.
- Secondary and accent are used for supportive highlights and non-primary emphasis.
- Card, border, status, focus, and indicator surfaces consume shared tokens only.
- Ad-hoc feature-level hex colors are avoided; focus shadows and borders are tokenized.
- Contrast-sensitive status text uses high-contrast text token combinations for AA-friendly readability.

## P2P architecture

### Routes

- `/p2p/send`
- `/p2p/receive`
- `/p2p/history`

### Send flow

- Step model: `entry -> review -> submitting -> success|failure`
- Inputs: recipient handle, amount, optional memo
- Validation: recipient format, amount parsing/bounds, memo sanitization
- Submit path: `POST /api/p2p/send`
- API route uses existing `payClient.createPaymentIntent` and parity transition primitives (mode-aware)
- Idempotency and correlation: client-generated idempotency key + request/correlation IDs
- Failure handling: retry-safe guidance when error is retryable

### Receive/request flow

- Receive instructions surface includes a scoped identity handle.
- Request-payment UI is present with explicit deferred backend messaging when endpoint support is unavailable.

### P2P status states

- Notification states map to: `initiated`, `processing`, `completed`, `failed`
- Mapping derives from canonical intent states (`created`, `authorized`, `executing`, `settled`, `failed`, `reversed`)
- Notification references are privacy-safe and redacted.

## Merchant dashboard architecture

### Route

- `/merchant`

### Role model

- Merchant dashboard visibility is admin-gated via shared route permissions and workspace capability checks.
- Non-authorized users receive explicit permission-denied states.

### Modules

- KPI overview cards:
  - total volume
  - successful count/rate
  - pending/processing count
  - failed count
- Transactions table:
  - status, amount, payer/payee (safe/redacted), timestamp, reference
  - status/date/search filtering
  - detail expansion for review
- Settlement/payout summary card from existing payout summary contract
- Refund/dispute panel with explicit deferred/unavailable state when fields/actions are not available

### Merchant actions

- Create payment link/request: explicit deferred state when endpoint is unavailable
- Export transactions: client-side CSV export when rows exist
- Retry failed: explicit deferred state when mutation endpoint is unavailable
- View details: transaction row expansion

## Backend availability and deferred behavior

- Existing API/client contracts are reused; no new backend contract is invented.
- When backend capabilities are missing, UI shows explicit preview/deferred messaging.
- P2P history is derived from existing payout/invoice/overview rails in preview mode.
- Behavior remains deterministic across `mock` and `http` modes.

## Security and privacy considerations

- Sensitive values are redacted before rendering in user-facing transaction/history references.
- No secrets/tokens/auth material are exposed in UI surfaces.
- Write flows preserve idempotency context and request correlation metadata.
- Existing auth + workspace capability guardrails remain enforced.
