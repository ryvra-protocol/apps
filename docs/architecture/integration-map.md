# Integration Map

## Internal app-to-package integration

- `apps/markets-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-markets`
- `apps/pay-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-payments`
- `apps/points-tasks-web` -> `@ryvra/ui`, `@ryvra/auth`, `@ryvra/config`, `@ryvra/api-client`, `@ryvra/observability`, `@ryvra/domain-tokenomics`

## External Ryvra touchpoints (future integration targets)

- **Ryvra Identity/Auth services:** concrete session validation and role claims.
- **Ryvra Markets services:** market data, execution, and risk APIs.
- **Ryvra Pay services:** invoicing, payouts, subscriptions, and reconciliation APIs.
- **Ryvra Points/Tasks services:** eligibility, conversion, and task event APIs.
- **Ryvra observability stack:** structured logs, tracing, and alerting pipeline.

## Placement guidance for future business logic

- Domain-specific orchestration belongs in app-level features unless shared by multiple apps.
- Stable shared domain rules should move into domain packages.
- Infrastructure bindings (HTTP SDKs, auth adapters) should remain behind `@ryvra/api-client` and `@ryvra/auth` interfaces.
