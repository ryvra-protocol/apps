# Points/Tasks MVP Data Flow (Phase 10.5)

## Scope

`apps/points-tasks-web` consumes canonical Points/Tasks contracts through `@ryvra/api-client` with preserved dual-mode transport:

- `mock`: deterministic fixtures mapped to canonical OpenAPI payloads
- `http`: strict canonical parity guards for auth/header/scope behavior

Canonical references (`ryvra-protocol/protocol-core`, default branch):

- `openapi/points-tasks.openapi.yaml`
- `docs/api-contract-changelog.md`
- version marker `2026-08-08.v1`

## Route to client boundary map

- `/` and `/overview`
  - `pointsTasksClient.getPointsOverview({ accountId, userId?, workspaceId?, window? })`
  - `pointsTasksClient.getTasksOverview({ accountId, userId?, workspaceId?, window? })`
- `/points`
  - `pointsTasksClient.listPointEntries({ accountId, userId?, workspaceId?, filters?, pagination?, sort? })`
  - `pointsTasksClient.getPointSummary({ accountId, userId?, workspaceId?, window?, dateRange? })`
  - `pointsTasksClient.getDailyClaimStatus({ accountId, userId?, workspaceId? })` (read/status route)
  - `POST /api/claims/daily` (server route that executes Pay intent + transition workflow for claim writes)
- `/tasks`
  - `pointsTasksClient.listTasks({ accountId, userId?, workspaceId?, filters?, pagination?, sort? })`
  - `pointsTasksClient.getTaskSummary({ accountId, userId?, workspaceId? })`
  - `pointsTasksClient.getPointSummary({ accountId, userId?, workspaceId? })` (tasks-page balance card reuse)
- `/status`
  - `pointsTasksClient.getParityDiagnostics()`

## Hard parity gate behavior

### Scope

Required:

- `/points-tasks/points/entries`
- `/points-tasks/points/summary`
- `/points-tasks/points/overview`
- `/points-tasks/tasks`
- `/points-tasks/tasks/summary`
- `/points-tasks/tasks/overview`

Optional scope fields forwarded when provided:

- `user_id`
- `workspace_id`

### Auth + headers

In HTTP mode:

- bearer auth required for canonical routes by default
- only `/points-tasks/status/health` remains auth-optional
- `x-request-id` and `x-correlation-id` are always emitted
- claim write path emits idempotency keys on Pay write requests (`POST /pay/intents`, `POST /pay/intents/{id}/transitions`)

### Pagination

- canonical: `limit`, `cursor`
- compatibility-only (deprecated): `page`
- cursor wins when both are supplied
- removal window: not before `2027-02-04`

### Error envelope

Normalized Points/Tasks errors are canonical-only:

- `code`, `message`, `retryable`, `source`, optional `details`

## UI wiring outcomes

- overview/dashboard render canonical overview KPIs and activity summaries
- points/tasks routes serialize canonical filter/sort/pagination params
- `/points` renders points balance + daily-claim status module with disabled CTA reasons when claim execution is unavailable
- `/tasks` renders tasks summary plus account-scoped points balance card via shared points-summary request builder
- status route renders canonical contract provenance (OpenAPI path/changelog/SHA/commit/version) plus connectivity probe behavior

## Daily claim Phase 12B baseline + 12.5B execution guardrails

- Daily claim status remains sourced from provisional read endpoint (`GET /points-tasks/eligibility`).
- Claim execution is now wired through Pay intent APIs via `/api/claims/daily`:
  - create intent (`POST /pay/intents`)
  - transition chain (`POST /pay/intents/{intentId}/transitions`)
- Retry-safe behavior:
  - same logical retry reuses attempt idempotency key
  - partial failures reuse existing `intentId` and continue transitions
  - terminal failures require explicit new attempt
- Endpoint unavailability is surfaced with explicit disabled CTA reason + retry when retryable.
- Cooldown/already-claimed states include next-eligible timestamp when provided.

## Migration notes

- provisional query aliases and provisional enum sets were removed from parity serialization
- non-canonical task owner/search request filters were removed from HTTP contract mapping
- Points/Tasks DTO contracts now align to canonical OpenAPI field sets

## Remaining limitations

- Pay claim transition sequence is still provisional pending a pay-owned claim-specific HTTP contract publication.
