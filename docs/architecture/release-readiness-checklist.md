# Release Readiness Checklist

## Runtime / toolchain pins

- Node.js: `24.x` (workspace engines `>=24 <25`)
- CI Node pin: `24.19.0` (`actions/setup-node@v4`)
- pnpm: `10.16.0` (root `packageManager`, root `engines.pnpm`, CI setup pin)
- Lockfile policy: `pnpm install --frozen-lockfile`

## Required env vars by app / mode

### Shared

- `RYVRA_RUNTIME_MODE`: `mock | http` (`live` is normalized to `http`)
- `RYVRA_API_BASE_URL`: defaults to `http://localhost:4000`

### Markets (`apps/markets-web`)

- `mock` mode:
  - `RYVRA_MARKETS_AUTH_TOKEN` optional
- `http` mode:
  - `RYVRA_MARKETS_AUTH_TOKEN` **required** (fail-fast validation)
  - `RYVRA_MARKETS_ACCOUNT_ID` recommended for default account-scoped routes (`/`, `/overview`, `/orders`, `/positions`)

### Pay (`apps/pay-web`)

- `mock` mode:
  - no required Pay-specific auth vars
- `http` mode:
  - `RYVRA_PAY_AUTH_TOKEN` optional
  - `RYVRA_PAY_RUNTIME_MODE` and `RYVRA_PAY_API_BASE_URL` optional app-specific overrides

### Points/Tasks (`apps/points-tasks-web`)

- `mock` mode:
  - `RYVRA_POINTS_TASKS_AUTH_TOKEN` optional
- `http` mode:
  - `RYVRA_POINTS_TASKS_AUTH_TOKEN` **required** (fail-fast validation)
  - `RYVRA_POINTS_TASKS_ACCOUNT_ID` recommended for default account-scoped routes (`/`, `/overview`, `/points`, `/tasks`)

## Canonical contract dependencies

- Markets source of truth: `ryvra-protocol/markets`
  - `openapi/markets.openapi.yaml`
  - `docs/api-contract-changelog.md`
- Pay source of truth: `ryvra-protocol/pay`
  - canonical domain/service contracts + RFC references documented in `docs/architecture/integration-map.md`
- Points/Tasks source of truth: `ryvra-protocol/protocol-core`
  - `openapi/points-tasks.openapi.yaml`
  - `docs/api-contract-changelog.md`

## CI required checks

- Runtime policy check (Node 24.x + pnpm 10.16.0)
- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm perf:guard` (Phase 17 bundle budget + critical route artifact guard)

## Phase 16 team/workspace controls go-live gates

- Role model parity:
  - Viewer/Operator/Admin capability mapping is sourced from `@ryvra/auth` only.
  - Role-gated controls render explicit disabled/denied reasons (no silent failure).
- Scope switcher parity:
  - canonical query keys (`account_id`, `workspace_id`, optional `user_id`) are enforced in all shells.
  - malformed scope values reset to safe defaults with explicit notice.
  - scope persistence (`ryvra.scope.<product>`) restores without SSR hydration mismatch.
- Delegated visibility parity:
  - operation lists/details render provenance when metadata exists.
  - missing delegation metadata renders explicit `Not available in current environment` state.

## Smoke validation commands

```bash
node -v
pnpm -v
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm --filter @ryvra/markets-web build
pnpm --filter @ryvra/pay-web build
pnpm --filter @ryvra/points-tasks-web build
pnpm --filter @ryvra/api-client test
pnpm perf:guard
```

Optional guarded connectivity probes:

- `RYVRA_MARKETS_CONNECTIVITY_SMOKE_URL`
- `RYVRA_PAY_CONNECTIVITY_SMOKE_URL`
- `RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_URL`

Performance/reliability transport defaults in HTTP mode:

- Request timeout: 12s (`@ryvra/api-client` fetch transport)
- Retry policy: bounded retries for retryable reads and idempotency-safe writes
- GET dedupe/cache: short TTL with automatic invalidation after writes

## Known acceptable warnings

- Next.js first-run local build warning (`No build cache found`): expected on fresh CI/local workspaces; does not affect production build correctness.
- Optional connectivity smoke tests marked `SKIP` when env vars are absent: expected in CI-safe default configuration with no private endpoints/secrets.
- pnpm install warning for ignored dependency build scripts (`esbuild`, `unrs-resolver`): expected under pnpm secure-install defaults unless explicitly approved.
