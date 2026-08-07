# Ryvra Apps Platform Monorepo

This repository hosts the Phase 8 unified-shell + Pay MVP data wiring foundation for the Ryvra web app platform:

- `apps/markets-web`
- `apps/pay-web`
- `apps/points-tasks-web`
- shared platform packages in `packages/*`

## Monorepo stack

- **Package manager:** pnpm workspaces
- **Task orchestration:** Turborepo
- **Apps:** Next.js App Router + TypeScript
- **Shared contracts:** TypeScript packages (UI, auth, config, API, domain, observability)
- **Code quality:** ESLint + Prettier

## Setup

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
```

## Workspace commands

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

## Run apps

```bash
pnpm dev:markets
pnpm dev:pay
pnpm dev:points
```

## Pay MVP development (Phase 8)

`apps/pay-web` supports typed Pay data wiring via `@ryvra/api-client` with `mock` and `http` runtime transport modes.

### Environment variables

Use shared variables for all apps, or Pay-specific overrides for Pay only:

- `RYVRA_RUNTIME_MODE` (`mock` or `http`)
- `RYVRA_API_BASE_URL` (default: `http://localhost:4000`)
- `RYVRA_PAY_RUNTIME_MODE` (optional override for Pay app only)
- `RYVRA_PAY_API_BASE_URL` (optional override for Pay app only)

> Note: legacy `live` values are normalized to `http` for backward compatibility.

### Mock vs HTTP mode

- **mock mode**
  - deterministic seeded invoice/payout/reconciliation/overview data
  - no backend dependency required
  - UI shows a non-intrusive mode badge
- **http mode**
  - routes call endpoint-ready Pay paths through fetch transport
  - expected paths include `/pay/overview`, `/pay/invoices`, `/pay/payouts`, `/pay/reconciliation/*`

### Useful commands

```bash
pnpm --filter @ryvra/pay-web dev
pnpm --filter @ryvra/pay-web typecheck
pnpm --filter @ryvra/pay-web build
```

## Unified shell + cross-app routing

The three apps share a common shell and typed cross-app routing contract:

- shell components and design tokens: `@ryvra/ui`
- global/local route registry and deep-link helpers: `@ryvra/config`
- deep-link params: `ref`, `entity`, `id`, optional `ctx`

Cross-app base URLs are configurable through:

- `NEXT_PUBLIC_MARKETS_APP_URL`
- `NEXT_PUBLIC_PAY_APP_URL`
- `NEXT_PUBLIC_POINTS_APP_URL`

## CI expectations

Pull requests into `main` must pass:

- install (`pnpm install --frozen-lockfile`)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

## Contribution guidance

### Add a new app

1. Create `apps/<new-app>` with Next.js + TypeScript App Router baseline.
2. Depend on shared contracts from `packages/*` instead of duplicating DTOs.
3. Add workspace scripts (`dev`, `lint`, `typecheck`, `build`, `test`).

### Add a new package

1. Create `packages/<new-package>` with `src/index.ts` and `tsconfig.json`.
2. Keep exports typed and minimal.
3. Avoid framework coupling in domain packages.

## Architecture docs

See `docs/architecture/` for boundaries, responsibilities, and integration mapping.

- `docs/architecture/unified-shell.md`
- `docs/architecture/cross-app-routing.md`
- `docs/architecture/pay-mvp-data-flow.md`
