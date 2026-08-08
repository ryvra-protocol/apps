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
- `/tasks`
  - `pointsTasksClient.listTasks({ accountId, userId?, workspaceId?, filters?, pagination?, sort? })`
  - `pointsTasksClient.getTaskSummary({ accountId, userId?, workspaceId? })`
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
- canonical v1 read-only surface does not require idempotency headers

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
- status route renders canonical contract provenance (OpenAPI path/changelog/SHA/commit/version) plus connectivity probe behavior

## Migration notes

- provisional query aliases and provisional enum sets were removed from parity serialization
- non-canonical task owner/search request filters were removed from HTTP contract mapping
- Points/Tasks DTO contracts now align to canonical OpenAPI field sets

## Remaining limitations

- canonical v1 does not expose write/transition routes; future write parity and idempotency enforcement will be added when published upstream
