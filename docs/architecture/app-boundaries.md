# App Boundaries

## Purpose

Define clear responsibility boundaries between the three frontend apps and shared packages to keep product features isolated while enabling consistent cross-app UX and integration policies.

## Apps

### `apps/markets-web`

- Owns Markets product user flows, page composition, and local feature state.
- Consumes canonical Markets contracts via `@ryvra/api-client` + `@ryvra/domain-markets`.
- Must not implement protocol-level transport logic directly in pages/components.

### `apps/pay-web`

- Owns Pay product user flows, page composition, and local feature state.
- Consumes Pay contracts via `@ryvra/api-client` + `@ryvra/domain-payments`.
- Keeps write/transition behavior behind API client methods; no raw protocol payload crafting in UI layers.

### `apps/points-tasks-web`

- Owns Points/Tasks product user flows, page composition, and local feature state.
- Consumes canonical Points/Tasks OpenAPI contracts via `@ryvra/api-client` + `@ryvra/domain-points`/`@ryvra/domain-tasks`.
- Must not bypass shared parity/auth/scope guards with direct fetch calls.

## Shared packages

### `@ryvra/api-client`

- Single boundary for backend/API access and transport behavior (`mock`/`http`).
- Enforces canonical route mappings, auth requirements, scope guards, header policy, pagination/deprecation behavior, and error normalization.
- Exposes parity diagnostics metadata for status pages.

### `@ryvra/domain-*`

- Source of typed domain contracts (DTOs, enums, request/response shapes, filters).
- Aligns app-consumed types with canonical protocol contracts.

### `@ryvra/config`

- Source of navigation maps, deep-link helpers, and environment/runtime config parsing.

### `@ryvra/ui`

- Shared shell, navigation, and reusable presentational components.
- No backend integration or product-specific business decisions.

### `@ryvra/auth`

- Auth/session abstractions for HTTP mode integration and account context propagation.

### `@ryvra/observability`

- Logging/tracing/diagnostic helpers and shared telemetry primitives.

## Protocol ownership boundaries

### Markets (`ryvra-protocol/markets`)

- Canonical OpenAPI is published and used for strict parity in apps.

### Pay (`ryvra-protocol/pay`)

- Canonical domain/service contracts are integrated; full HTTP OpenAPI publication remains pending.

### Points/Tasks (`ryvra-protocol/protocol-core`)

- Canonical OpenAPI is published and enforced in apps parity:
  - `openapi/points-tasks.openapi.yaml`
  - `docs/api-contract-changelog.md`
  - marker `POINTS_TASKS_API_VERSION=2026-08-08.v1`

## Non-goals at app layer

- Re-defining canonical protocol enums/DTOs locally.
- Re-implementing transport/parity/auth rules in page components.
- Introducing per-app ad hoc error formats for protocol-backed routes.

## Change policy

- Cross-app integration behavior changes must be implemented in shared packages first (`@ryvra/api-client`, relevant `@ryvra/domain-*`).
- App-level changes should consume shared updates with minimal glue code.
- Backward compatibility beyond canonical deprecation windows must be explicit and documented.
