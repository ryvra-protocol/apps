# Phase 19: Growth and conversion UX

## Activation funnel stages

Phase 19 standardizes funnel tracking across shell and claim/task conversion surfaces.

### Stage definitions

1. `landing_first_session`
   - Entered/completed when a user lands on a shell route.
2. `scope_selection`
   - Entered/completed when account/workspace scope is resolved in the shell.
3. `first_key_action_initiation`
   - Entered/completed when a conversion action is initiated (claim/payout/task route/workflow entry).
   - Abandoned when a started claim flow is cancelled or the surface unmounts before outcome.
4. `completion_success`
   - Entered/completed when key action reaches success outcome (or deterministic task-route completion surface).

## Event schema

Shared event model is implemented in `packages/ui/src/growth-instrumentation.ts`.

- Namespace: `phase_19_growth_conversion`
- Sink modes:
  - `local_preview` (default, current)
  - `remote` (adapter wiring deferred)
- Core fields:
  - `eventName`: `stage_entered | stage_completed | stage_abandoned | variant_exposed | cta_clicked | claim_success | claim_failure | onboarding_step_completed`
  - `appId`
  - `route`
  - `scopeHash` (hashed account/workspace/user scope)
  - `at` (ISO timestamp)
- Optional fields:
  - `stage`
  - `actionType` (`claim | payout | task`)
  - `experimentId`
  - `variant`
  - `stepId`
  - `metadata` (sanitized; sensitive keys are redacted)

## Getting Started checklist model

Shared onboarding module:

- Component: `packages/ui/src/GettingStartedChecklist.tsx`
- Model: `packages/ui/src/getting-started-checklist.ts`

Checklist steps (ordered):

1. `connect_select_scope`
2. `review_unified_balance`
3. `complete_first_action`
4. `verify_notifications_preferences`

Behavior:

- progress state tracks completed/remaining counts
- minimize/dismiss state is persisted
- resume restores prior state for the same scope
- reset restores deterministic default state

Persistence scope:

- key format: `ryvra.onboarding.<appId>.<scopeHash>`
- scope hash is derived from account/workspace/user context to avoid storing raw identifiers in event payloads

## Claim conversion experiment framework

Shared experiment module:

- `packages/ui/src/claim-conversion-experiment.ts`
- experiment id: `claim_conversion_phase19_v1`
- variants:
  - `control`
  - `trust_boost`

Assignment + override model:

- deterministic assignment by `experimentId + scopeHash`
- assignment persistence: `ryvra.exp.<experimentId>.<scopeHash>`
- QA override: `claim_variant` query param (`control` or `trust_boost`)
- override persistence: `ryvra.exp.override.<experimentId>.<scopeHash>`

Tracked outcomes:

- `variant_exposed`
- `cta_clicked`
- `claim_success`
- `claim_failure`

## Privacy, trust, and safety constraints

- No secrets/tokens/authorization fields are persisted in growth event metadata.
- Scope in event payloads is represented as hash only (`scopeHash`).
- Experiment variants are presentation-only and cannot bypass existing role/scope/availability guards.
- Existing claim/payout/task permission checks remain authoritative.

## Deferred backend analytics wiring

No backend analytics ingestion endpoint is assumed in Phase 19.

Current behavior:

- events are captured in local preview mode via client storage (`ryvra.growth.events.v1`)
- sink labeling is explicit (`local_preview`) to avoid false remote-sync expectations

Future remote wiring path:

1. provide a remote sink adapter to `createGrowthInstrumentation(...)`
2. keep current event schema stable
3. preserve redaction and scope hashing rules before emission
