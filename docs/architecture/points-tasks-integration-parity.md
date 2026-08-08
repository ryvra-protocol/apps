# Points/Tasks Integration Parity (Phase 10)

## Canonical source of truth

Current Apps parity is pinned to protocol/policy contracts because a dedicated Points/Tasks HTTP OpenAPI is not published upstream.

Canonical references:

- protocol source: `ryvra-protocol/protocol-core`
  - `contracts/src/events.ts`
  - `contracts/src/ids.ts`
  - `contracts/src/version.ts`
  - `docs/tokenomics-proof-of-transaction.md`
  - `docs/tokenomics-faq.md`
- policy source: `ryvra-protocol/policy-risk`
  - `docs/anti-abuse-policy.md`

Published OpenAPI for Points/Tasks: **No**

Compatibility markers used by Apps runtime:

- contract schema version: `1.0.0`
- version marker: `POT_CONTRACT_SCHEMA_VERSION=1.0.0`
- apps parity marker: `phase-10-2026-08-08T07:54:18.436Z`

## Enforced parity gates

### Account scope (`account_id`)

Required on account-scoped endpoints:

- `/points-tasks/points/entries`
- `/points-tasks/points/summary`
- `/points-tasks/points/overview`
- `/points-tasks/tasks`
- `/points-tasks/tasks/summary`
- `/points-tasks/tasks/overview`

### Auth/header policy

In HTTP mode:

- bearer auth is required on non-status/non-health Points/Tasks routes
- status route (`/points-tasks/status`) and health probe route (`/points-tasks/status/health`) remain auth-optional
- `x-request-id` and `x-correlation-id` are emitted on all Points/Tasks client requests
- idempotency headers are not applicable in Phase 10 because exposed Points/Tasks methods are read-only

### Pagination/deprecation policy

- canonical pagination: cursor-first (`limit`, `cursor`)
- deprecated compatibility: `page` and `pageSize` (supported until at least `2027-06-30`)
- cursor is authoritative when both cursor and page are present

### Deprecated response field compatibility

- points canonical `running_balance`, fallback `balance_after`
- tasks canonical `progress_percent`, fallback `progress`
- fallback compatibility removal window not before `2027-06-30`

### Error envelope

Normalized canonical error contract:

- `code`
- `message`
- `retryable`
- `source`
- optional `details`

## Endpoint parity map

| Client method | HTTP | Path | Scope required | Pagination |
| --- | --- | --- | --- | --- |
| `listPointEntries` | GET | `/points-tasks/points/entries` | `account_id` | cursor (`page` deprecated) |
| `getPointSummary` | GET | `/points-tasks/points/summary` | `account_id` | none |
| `getPointsOverview` | GET | `/points-tasks/points/overview` | `account_id` | none |
| `listTasks` | GET | `/points-tasks/tasks` | `account_id` | cursor (`page` deprecated) |
| `getTaskSummary` | GET | `/points-tasks/tasks/summary` | `account_id` | none |
| `getTasksOverview` | GET | `/points-tasks/tasks/overview` | `account_id` | none |
| `getParityDiagnostics` | GET probe | `/points-tasks/status/health` (configurable) | none | none |

## Known limitations + follow-up

- no upstream Points/Tasks HTTP OpenAPI blob to lock method/path parity against commit SHA yet
- once upstream endpoint contract is published, replace provisional route-map assumptions with upstream path references and add SHA/commit markers in this document
