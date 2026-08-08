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

## Runtime requirements

- **Node.js:** `24.x` (workspace engines: `>=24 <25`)
- **pnpm:** `10.16.0` (via Corepack)

## Post-upgrade notes (Node 24 / pnpm 10.16.0 / Next.js 16.3.0)

- Root engines now align on Node `24.x` and pin pnpm `10.16.0`.
- ESLint now applies `eslint-config-next` (`next/core-web-vitals`) across all Next.js apps in the monorepo.
- Verified that app-router status routes compile in `markets-web`, `pay-web`, and `points-tasks-web`, and Pay parity transport checks remain green (`mock` and `http` compatibility paths).

## Setup

```bash
corepack enable
corepack prepare pnpm@10.16.0 --activate
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

## Pay integration parity development (Phase 8.5)

`apps/pay-web` continues to support typed Pay data wiring with preserved dual mode transport:

- `mock` for deterministic local development
- `http` for live integration parity checks

### Environment variables

Core mode/base URL:

- `RYVRA_RUNTIME_MODE` (`mock` or `http`)
- `RYVRA_API_BASE_URL` (default: `http://localhost:4000`)
- `RYVRA_PAY_RUNTIME_MODE` (optional Pay-only override)
- `RYVRA_PAY_API_BASE_URL` (optional Pay-only override)

Pay parity/auth/header controls:

- `RYVRA_PAY_AUTH_TOKEN` (optional bearer token)
- `RYVRA_PAY_AUTH_SCHEME` (default: `Bearer`)
- `RYVRA_PAY_REQUEST_ID_HEADER` (default: `x-request-id`)
- `RYVRA_PAY_CORRELATION_ID_HEADER` (default: `x-correlation-id`)
- `RYVRA_PAY_IDEMPOTENCY_HEADER` (default: `idempotency-key`)
- `RYVRA_PAY_CONNECTIVITY_PATH` (default probe: `/health`, fallback `/pay/overview`)
- `RYVRA_PAY_COMPATIBILITY_VERSION` (optional override)
- `RYVRA_PAY_PARITY_CHECK_MARKER` (optional override)

Optional smoke-test guard:

- `RYVRA_PAY_CONNECTIVITY_SMOKE_URL`
- `RYVRA_PAY_CONNECTIVITY_SMOKE_PATH` (optional, defaults to `/health`)

> Note: legacy `live` values are normalized to `http` for backward compatibility.

### Useful commands

```bash
pnpm --filter @ryvra/pay-web dev
pnpm --filter @ryvra/pay-web typecheck
pnpm --filter @ryvra/pay-web build
pnpm --filter @ryvra/api-client test:parity
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

> Contributor caveat: keep Corepack pinned to `pnpm@10.16.0` when regenerating `pnpm-lock.yaml` to avoid lockfile churn.

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
- `docs/architecture/pay-integration-parity.md`
