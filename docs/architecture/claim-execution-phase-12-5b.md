# Claim Execution via Pay Intents (Phase 12.5B)

## Scope

Phase 12.5B wires the `/points` daily-claim CTA to Pay write contracts and keeps the existing Phase 12B read/status model.

In scope:

- `POST /pay/intents` for daily-claim intent creation
- `POST /pay/intents/{intentId}/transitions` for claim lifecycle completion
- idempotent retry-safe submit flow
- explicit HTTP-mode auth/config guards
- deterministic post-success state refresh

Out of scope:

- WebAuthn/passkeys or biometric auth flows
- new backend endpoints beyond existing Pay intent/transition routes

## End-to-end sequence

1. User taps **Claim daily points** on `/points`.
2. Client creates or reuses a logical attempt context:
   - `idempotencyKey`
   - `x-request-id`
   - `x-correlation-id`
   - optional `intentId` (for partial retry resume)
3. Client calls `POST /api/claims/daily` with account scope + attempt context.
4. API route validates auth and runtime configuration.
5. API route executes Pay workflow:
   1. `createPaymentIntent` -> `POST /pay/intents` (unless `intentId` already exists)
   2. `transitionPaymentIntent` chain -> `POST /pay/intents/{id}/transitions`
6. API returns either:
   - success with final state + sync targets
   - canonical error envelope + partial context (`intentId`, failed transition) for safe retry
7. Client updates UX state and triggers refresh so claim status and points summary/balance reconcile immediately.

## Intent and transition workflow

Selected workflow for Phase 12.5B:

- create intent in `created`
- transition in sequence: `authorized -> executing -> settled`

This sequence is a guarded provisional assumption until Pay publishes a claim-specific transition contract. If upstream transition semantics differ, the API route returns explicit canonical errors and preserves `intentId` for safe retry/resume instead of re-creating a new intent.

## Idempotency strategy

Per logical claim attempt:

- Base key: `points.daily_claim:<accountId>:<nonce>`
- Create-intent write uses base key.
- Transition writes use deterministic child keys:
  - `<base>:transition:authorized`
  - `<base>:transition:executing`
  - `<base>:transition:settled`

Retry semantics:

- Retry of the same failed/pending attempt reuses the same base + child keys.
- New explicit attempt (after terminal failure) generates a new base key.

## Request tracing

Every write attempt emits:

- `x-request-id`
- `x-correlation-id`

These IDs are sent from client -> claim API route -> Pay client writes and surfaced in error UX.

## Retry and error handling model

- In-flight lock prevents duplicate submit while workflow is active.
- Retryable failures show a safe retry CTA that resumes the same attempt context.
- Non-retryable failures show terminal guidance and require explicit new attempt.
- Partial workflow failures (intent created, transition failed) return `intentId`; retries resume transitions without creating a second intent.
- Timeout/network failures are classified as retryable with explicit messaging.

## Security/guardrails

- In `http` mode, claim execution requires `RYVRA_PAY_AUTH_TOKEN`.
- Missing auth/config returns explicit non-retryable error (`pay_claim_auth_missing`).
- Existing account-scope and canonical error-envelope behavior are preserved.

## Explicit phase note

Phase 12.5B uses a **UI confirmation interaction only** and does **not** implement WebAuthn/passkeys.
