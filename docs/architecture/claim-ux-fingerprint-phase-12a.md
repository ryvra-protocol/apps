# Phase 12A Claim UX: Fingerprint-Style Confirmation (No WebAuthn)

## Scope and entrypoint

- Claim action is exposed in **Pay** on route: `apps/pay-web/app/payouts/page.tsx`.
- UI entry component: `apps/pay-web/app/components/claim-fingerprint-card-client.tsx`.
- CTA label: `Claim`.
- CTA remains visible even when unavailable; when unavailable it renders a disabled state with an explicit reason.

## UX behavior

- Confirmation flow states: `idle -> confirming -> submitting -> success/failure` with cancel path.
- Fingerprint-style control is a **tap-confirm interaction layer only**.
- Legal copy shown in UI:
  - “Fingerprint-style confirmation is a UI interaction, not biometric verification.”
- Accessibility provisions in this phase:
  - keyboard-operable button semantics (Enter/Space)
  - visible focus states
  - ARIA labels/descriptions and live status updates
  - reduced-motion fallback (`prefers-reduced-motion`)

## API wiring

- Client-side submit target: `POST /api/claims/payout` (Next.js route handler).
- Handler path: `apps/pay-web/app/api/claims/payout/route.ts`.
- Canonical pay write method invoked by handler:
  - `payClient.createPaymentIntent(intent, requestOptions)`
- Canonical/provisional endpoint used by client package:
  - `POST /pay/intents`

## Idempotency and trace headers

- Idempotency key is generated per claim session in UI (`createClaimIdempotencyKey(...)`) and sent with claim submit.
- Route handler always forwards idempotency to pay client request options.
- Request and correlation IDs are always attached:
  - inbound from `x-request-id` / `x-correlation-id` when present
  - generated when missing
  - forwarded to pay client on every claim write request
- UI failure state renders canonical envelope fields:
  - `message`, `retryable`, `source` (+ request/correlation IDs for traceability)

## Runtime guardrails

- In `http` mode, claim submission requires `RYVRA_PAY_AUTH_TOKEN`.
- If missing in `http` mode:
  - CTA is disabled with actionable reason
  - route handler fails fast with explicit error envelope
- If endpoint/runtime mode is unavailable, CTA is disabled with explicit reason.

## Explicit non-WebAuthn boundary (Phase 12A)

- No WebAuthn/passkey APIs are used in this phase.
- No biometric identity assertions are produced.
- Security remains existing auth/session/token + server-side validation.

## Migration path to Phase 12B/12C

- Phase 12B: add optional WebAuthn attestation challenge orchestration behind feature flag while preserving existing idempotent claim API semantics.
- Phase 12C: graduate to passkey-backed verification for eligible environments, keeping:
  - canonical request/correlation ID propagation
  - idempotency behavior
  - fallback non-biometric confirmation path when passkeys unavailable.
