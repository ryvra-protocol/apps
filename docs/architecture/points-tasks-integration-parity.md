# Points/Tasks Integration Parity (Phase 10.5)

## Canonical source of truth

Apps Points/Tasks parity is now pinned to the published canonical OpenAPI in `ryvra-protocol/protocol-core` (default branch):

- OpenAPI: `openapi/points-tasks.openapi.yaml`
- Changelog: `docs/api-contract-changelog.md`
- OpenAPI commit: `b3abbc4fce3ee4024ba39049623a870747a521f7`
- OpenAPI blob SHA: `89e790e859984892fcfbbe7e0b3e7dd2f159b2e7`
- Canonical API version marker: `2026-08-08.v1`

## Endpoint parity map

| Client method | HTTP | Canonical path | Scope | Auth | Status |
| --- | --- | --- | --- | --- | --- |
| `listPointEntries` | GET | `/points-tasks/points/entries` | required `account_id`; optional `user_id`, `workspace_id` | bearer required | matched |
| `getPointSummary` | GET | `/points-tasks/points/summary` | required `account_id`; optional `user_id`, `workspace_id` | bearer required | matched |
| `getPointsOverview` | GET | `/points-tasks/points/overview` | required `account_id`; optional `user_id`, `workspace_id` | bearer required | matched |
| `listTasks` | GET | `/points-tasks/tasks` | required `account_id`; optional `user_id`, `workspace_id` | bearer required | matched |
| `getTaskSummary` | GET | `/points-tasks/tasks/summary` | required `account_id`; optional `user_id`, `workspace_id` | bearer required | matched |
| `getTasksOverview` | GET | `/points-tasks/tasks/overview` | required `account_id`; optional `user_id`, `workspace_id` | bearer required | matched |
| `getParityDiagnostics` | GET probe | `/points-tasks/status` (primary), `/points-tasks/status/health` (fallback) | status: optional scoped diagnostics; health: none | status bearer required, health auth-optional | matched |

## Scope, auth, and headers

- Account-scoped endpoints fail fast with typed `invalid_request` errors when `account_id` is missing.
- `user_id` and `workspace_id` are preserved in request contracts and query serialization where provided.
- In HTTP mode, bearer auth is required on all canonical routes except `/points-tasks/status/health`.
- `x-request-id` and `x-correlation-id` are always emitted; generated when not supplied.
- Canonical v1 is read-only, so idempotency headers are not required.

## Pagination and deprecation policy

- Canonical pagination is cursor-first: `limit` + `cursor`.
- Legacy `page` is retained only as canonical deprecated compatibility.
- When both `cursor` and `page` are provided, `cursor` takes precedence.
- Deprecated page compatibility removal window: not before `2027-02-04`.

## Canonical error envelope

Points/Tasks HTTP normalization is now constrained to canonical shape:

- `code`
- `message`
- `retryable`
- `source`
- optional `details`

## Migration notes (Phase 10 -> 10.5)

- Query params renamed to canonical keys:
  - `type` -> `entry_type` / `task_type`
  - `status` -> `entry_status` / `task_status`
  - `source` -> `entry_source`
  - `from`/`to` -> `occurred_from`/`occurred_to` and `due_after`/`due_before`
  - `sort_by` + `sort_order` -> canonical `sort` literal values
- Removed non-canonical Points/Tasks request filters from client serialization (`search`, task owner filters).
- Domain enums/DTOs now mirror canonical OpenAPI sets and fields.
- Diagnostics now expose canonical OpenAPI path/changelog/SHA/commit/version metadata.

## Remaining limitations

- No write/transition Points/Tasks routes are in canonical v1; idempotency enforcement remains deferred until write endpoints are published.
