# Ryvra Apps Platform Monorepo

This repository hosts the Phase 6 scaffold for the Ryvra web app platform:

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

Default app runtime mode is mock-safe and uses typed contracts from shared packages.

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
