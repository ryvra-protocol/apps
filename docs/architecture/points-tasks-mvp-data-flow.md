# Points/Tasks MVP Data Flow (Phase 10)

## Scope

`apps/points-tasks-web` now consumes typed Points/Tasks contracts from shared domain + API packages with dual-mode transport preserved:

- `mock`: deterministic local fixtures with canonical DTO decoding
- `http`: strict parity guards for auth/header/scope behavior

Canonical source references are currently protocol/policy contracts (no published Points/Tasks OpenAPI in upstream repos):

- `ryvra-protocol/protocol-core/contracts/src/events.ts`
- `ryvra-protocol/protocol-core/contracts/src/ids.ts`
- `ryvra-protocol/protocol-core/contracts/src/version.ts`
- `ryvra-protocol/protocol-core/docs/tokenomics-proof-of-transaction.md`
- `ryvra-protocol/protocol-core/docs/tokenomics-faq.md`
- `ryvra-protocol/policy-risk/docs/anti-abuse-policy.md`

## Route to client boundary map

- `/` and `/overview`
  - `pointsTasksClient.getPointsOverview({ accountId })`
  - `pointsTasksClient.getTasksOverview({ accountId })`
- `/points`
  - `pointsTasksClient.listPointEntries({ accountId, ... })`
  - `pointsTasksClient.getPointSummary({ accountId, ... })`
- `/tasks`
  - `pointsTasksClient.listTasks({ accountId, ... })`
  - `pointsTasksClient.getTaskSummary({ accountId, ... })`
- `/status`
  - `pointsTasksClient.getParityDiagnostics()`

## Hard parity gate behavior

### Account scope

`account_id` is required for:

- `/points-tasks/points/entries`
- `/points-tasks/points/summary`
- `/points-tasks/points/overview`
- `/points-tasks/tasks`
- `/points-tasks/tasks/summary`
- `/points-tasks/tasks/overview`

Client guards fail fast with `invalid_request` if `account_id` is missing.

### Auth + headers

In HTTP mode:

- non-status/non-health Points/Tasks routes require bearer auth in `Authorization`
- status/health probe routes remain auth-optional
- `x-request-id` and `x-correlation-id` are always emitted by client runtime
- idempotency headers are currently not required because Phase 10 surface is read-only

### Pagination

Cursor-first policy:

- canonical: `limit`, `cursor`
- compatibility-only (deprecated): `page`, `pageSize`
- cursor wins when both cursor + page are supplied
- compatibility removal window: not earlier than `2027-06-30`

### Deprecated response field compatibility

Decoder fallback normalization:

- points canonical `running_balance` with fallback `balance_after`
- tasks canonical `progress_percent` with fallback `progress`
- fallback removal window: not earlier than `2027-06-30`

## UI data wiring outcomes

- dashboard/overview render KPI cards + combined recent activity feed from typed overview DTOs
- points/tasks routes render typed summary cards, URL-persisted filters/sort, loading/error/empty states, and cursor-aware pagination controls
- status route renders runtime parity markers, auth/header policy metadata, account-scope policy, and non-destructive connectivity probe result

## Known limitations and follow-up plan

- endpoint-level upstream OpenAPI for Points/Tasks is not yet published; route parity is currently anchored to canonical protocol/policy artifacts plus app-level route map
- once upstream HTTP OpenAPI/routers are published, update route map + enum provenance markers and tighten method/path parity tests against upstream blobs
