# App Boundaries

## apps/markets-web

- Owns Markets user experience and route surface.
- Uses `@ryvra/domain-markets` and `@ryvra/api-client` for typed market boundary calls.
- Uses shared auth/config/observability primitives plus unified shell + routing helpers.
- Owns query-param-driven filters/sort UX for `/instruments`, `/orders`, `/positions`.
- Consumes only typed read-model boundaries (`getMarketsOverview`, list/summary methods, parity diagnostics).
- Does not own canonical market execution logic (policy/routing/settlement remain source-of-truth in `ryvra-protocol/markets`).

## apps/pay-web

- Owns Pay user experience and route surface.
- Uses `@ryvra/domain-payments` and `@ryvra/api-client` for payment boundary calls.
- Uses shared auth/config/observability primitives plus unified shell + routing helpers.

## apps/points-tasks-web

- Owns Points/Tasks user experience and route surface.
- Uses `@ryvra/domain-points`, `@ryvra/domain-tasks`, and `@ryvra/api-client` for typed points/tasks boundary calls.
- Uses shared auth/config/observability primitives plus unified shell + routing helpers.
- Owns query-param-driven filters/sort UX for `/points` and `/tasks`.
- Consumes typed summary/overview/list boundaries plus parity diagnostics.
- Does not own canonical protocol/policy logic (source-of-truth remains in `ryvra-protocol/protocol-core` and `ryvra-protocol/policy-risk`).

## Boundary rules

- Product-specific business workflows stay in each app or future app-specific domain modules.
- Cross-app primitives belong in `packages/*` only when reused by at least two apps.
- Domain packages must stay UI-framework agnostic.
- Route-level data fetching, auth checks, and UI-level retries remain app-owned.
- Transport mapping, payload validation, and parity diagnostics remain client-package owned.
