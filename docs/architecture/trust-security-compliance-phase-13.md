# Phase 13: Trust, Security, and Compliance UX hardening

## Scope and intent

Phase 13 hardens user-facing trust/compliance surfaces in the existing app IA for Markets, Pay, and Points/Tasks.

- No backend contract changes were introduced.
- No new write semantics were invented.
- Existing parity/runtime behavior from prior phases remains intact.

## Shared UX primitives

`@ryvra/ui` now provides reusable trust components:

- `OperationTimelineCard`
- `ComplianceEvidencePanel`
- `TrustDisclosureCard`
- `ErrorTransparencySummary`
- `PolicyLinksCard`
- `ConfirmationReceiptCard`

The shared evidence sanitizer redacts sensitive label/value patterns and emits explicit placeholders when data is unavailable.

## Timeline and evidence model by app

### Markets (`apps/markets-web`)

- Route: `/orders`
- Timeline component: `OperationTimelineCard` (latest order lifecycle)
- Helper model: `app/lib/trust-compliance.ts`
- Evidence panel: `ComplianceEvidencePanel`
- IDs surfaced:
  - order ID
  - reference ID
  - correlation ID
  - route ID (if available)
- Source system surfaced: `markets-api`
- Retryability surfaced from policy/status context

### Pay (`apps/pay-web`)

- Route: `/payouts`
- Timeline components:
  - `OperationTimelineCard` for latest payout lifecycle
  - in-panel claim submission timeline in `ClaimFingerprintCardClient`
- Helper model: `app/lib/trust-compliance.ts`
- Evidence panels:
  - latest payout compliance evidence
  - claim compliance evidence in confirmation panel
- Receipt surface: `ConfirmationReceiptCard` after successful claim submission
- IDs surfaced:
  - payout ID
  - intent ID (when available)
  - request ID (when available)
  - correlation ID (when available)
  - idempotency key
- Source system surfaced: `pay`

### Points/Tasks (`apps/points-tasks-web`)

- Routes: `/points`, `/tasks`
- Timeline components:
  - daily claim timeline (`/points`)
  - latest task progression timeline (`/tasks`)
- Helper model: `app/lib/trust-compliance.ts`
- Evidence panels:
  - daily claim compliance evidence
  - latest task compliance evidence
- IDs/references surfaced:
  - task ID
  - account/workspace scope references
  - daily claim request/correlation references as explicit unavailable placeholders when not provided by current backend surfaces
- Source systems surfaced: `tasks_engine`, `points_tasks_api`

## Reference ID semantics

- **Intent ID**: pay payment-intent identifier for claim write submissions.
- **Request ID**: per-request trace identifier for transport/runtime correlation.
- **Correlation ID**: cross-service correlation marker for operation tracing.
- **Reference ID**: business-level reference for an operation in canonical contracts.
- **Route ID**: execution route identifier from markets order processing when present.
- **Idempotency key**: client/server deduplication key for pay claim intent creation.

## Error transparency principles

Phase 13 standardizes user-safe error messaging via `ErrorTransparencySummary`:

1. **What happened**: plain-language error statement.
2. **Retry safety**: explicit retryable vs non-retryable guidance.
3. **What to do next**: deterministic next-step guidance.
4. **Envelope context**: source and retryability metadata surfaced without exposing sensitive internals.

This aligns to canonical envelope semantics (`code`, `message`, `retryable`, `source`, optional details) while remaining end-user safe.

## Policy/help and disclosure surfaces

High-impact flows now include:

- trust disclosures for confirmation semantics, retry semantics, and processing expectations
- non-intrusive policy/help links to status, overview, and related operational routes

## Known data availability limits

The UI explicitly labels unavailable trust fields as:

`Not available in current environment`

Known current limitations:

- Some lifecycle stages expose only best-known timestamps when canonical stage-specific timestamps are not present.
- Daily claim write execution references are not available on current Points/Tasks read-status flow.
- Certain pay/markets lifecycle transitions do not provide stage-level event IDs in current app-consumed DTOs.

These are rendered as explicit placeholders (not silent omissions) to preserve trust and audit expectations.
