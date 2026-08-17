# Ryvra Apps Platform Monorepo

This repository hosts the unified-shell baseline with Pay, Markets, and Points/Tasks MVP data wiring for the Ryvra web app platform:

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
- **CI Node pin:** `24.19.0`
- **pnpm:** `10.16.0` (via Corepack)

## Post-upgrade notes (Node 24 / pnpm 10.16.0 / Next.js 16.3.0)

- Root engines now align on Node `24.x` and pin pnpm `10.16.0`.
- ESLint now applies `eslint-config-next` (`next/core-web-vitals`) across all Next.js apps in the monorepo.
- Verified that app-router status routes compile in `markets-web`, `pay-web`, and `points-tasks-web`, and Pay parity transport checks remain green (`mock` and `http` compatibility paths).

## Phase 17 reliability + performance notes

- `@ryvra/api-client` HTTP transport now includes bounded timeout/retry behavior, short-lived GET dedupe/cache, and write-triggered cache invalidation.
- Non-critical claim modules on `/pay/payouts` and `/points` are lazy-loaded to reduce initial client payload.
- Added performance guard command: `pnpm perf:guard` (bundle budget + critical route artifact checks after build).

## Phase 18 i18n + localization notes

- Shared shell i18n runtime now supports `en` (default), `fr`, and `ar`.
- Locale + timezone preferences are user-configurable in shell settings and persisted client-side (`ryvra.locale`, `ryvra.timezone`).
- Shared shell/notification/navigation surfaces now resolve namespaced translation keys with deterministic fallback to `en`.
- RTL direction toggles automatically when an RTL locale is selected, with shell-level directional layout adjustments.
- Number/currency/date/relative-time formatting is centralized in `@ryvra/ui` and applied across Markets, Pay, and Points/Tasks presentation layers.

## Phase 19 growth + conversion UX notes

- Shared activation funnel instrumentation now emits privacy-safe local-preview events (`ryvra.growth.events.v1`) for landing/session, scope selection, key-action initiation, and completion.
- Markets, Pay, and Points/Tasks dashboard/overview surfaces now include a shared **Getting started** checklist with scoped persistence/resume behavior.
- Claim conversion A/B experiment framework is now shared in `@ryvra/ui` with deterministic per-scope assignment and QA override via query param:
  - `claim_variant=control`
  - `claim_variant=trust_boost`
- Current analytics sink remains local-preview only in this phase; remote backend wiring is deferred.

## Phase 15 portfolio + placement notes

- Markets and Pay dashboard/overview now place the shared Unified Balance card in the top-priority section.
- `/points` and `/tasks` now place points balance + daily-claim surfaces in the top-priority section.
- Portfolio/insight modules now use shared insight formatting/state primitives and explicit historical-window fallback messaging.

## Phase 14 notifications + communications notes

- Shared in-app notification center is now available in the unified shell across Markets, Pay, and Points/Tasks.
- Notification categories include Claims, Payouts, Tasks, and System with read/unread controls and deep-link actions.
- Communication preferences (email + webhook category toggles) are currently **local preview settings** unless remote persistence contracts are explicitly added.
- Webhook test ping is intentionally disabled with explicit deferred-backend messaging in this phase.

## Setup

```bash
corepack enable
corepack prepare pnpm@10.16.0 --activate
node -v
pnpm -v
pnpm install
```

## Workspace commands

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm perf:guard
```

## Run apps

```bash
pnpm dev:markets
pnpm dev:pay
pnpm dev:points
```

## Markets parity development (Phase 9.5 v2)

`apps/markets-web` now supports strict canonical Markets parity wiring with preserved dual-mode transport:

- `mock` for deterministic local development
- `http` for live integration parity checks

### Environment variables

Core mode/base URL:

- `RYVRA_RUNTIME_MODE` (`mock` or `http`)
- `RYVRA_API_BASE_URL` (default: `http://localhost:4000`)

Markets parity/auth/header controls:

- `RYVRA_MARKETS_AUTH_TOKEN` (required in `http` mode for non-health routes)
- `RYVRA_MARKETS_AUTH_SCHEME` (default: `Bearer`)
- `RYVRA_MARKETS_REQUEST_ID_HEADER` (default: `x-request-id`)
- `RYVRA_MARKETS_CORRELATION_ID_HEADER` (default: `x-correlation-id`)
- `RYVRA_MARKETS_ACCOUNT_ID` (required in `http` mode for account-scoped endpoints)
- `RYVRA_MARKETS_CONNECTIVITY_PATH` (default probe: `/health`, fallback `/markets/instruments?limit=1`)
- `RYVRA_MARKETS_COMPATIBILITY_VERSION` (optional override)
- `RYVRA_MARKETS_PARITY_CHECK_MARKER` (optional override)

Contract behavior notes:

- account-scoped routes require `account_id` (`orders`, `orders/summary`, `positions`, `positions/summary`, `overview`)
- pagination is cursor-first (`limit`, `cursor`); `page` is deprecated compatibility only
- decoder normalizes deprecated `net_exposure_bucket` into canonical `net_exposure_band`
- runtime config now fails fast in `http` mode if `RYVRA_MARKETS_AUTH_TOKEN` is missing

Optional smoke-test guard:

- `RYVRA_MARKETS_CONNECTIVITY_SMOKE_URL`
- `RYVRA_MARKETS_CONNECTIVITY_SMOKE_PATH` (optional, defaults to `/health`)

### Useful commands

```bash
pnpm --filter @ryvra/markets-web dev
pnpm --filter @ryvra/markets-web typecheck
pnpm --filter @ryvra/markets-web build
pnpm --filter @ryvra/api-client test:parity
```

## Points/Tasks parity development (Phase 10.5)

`apps/points-tasks-web` now supports strict typed Points/Tasks parity wiring with preserved dual mode transport:

- `mock` for deterministic local development
- `http` for live integration parity checks

Canonical source of truth (`ryvra-protocol/protocol-core`, default branch):

- `openapi/points-tasks.openapi.yaml`
- `docs/api-contract-changelog.md`
- version marker: `2026-08-08.v1`

### Environment variables

Core mode/base URL:

- `RYVRA_RUNTIME_MODE` (`mock` or `http`)
- `RYVRA_API_BASE_URL` (default: `http://localhost:4000`)

Points/Tasks parity/auth/header controls:

- `RYVRA_POINTS_TASKS_AUTH_TOKEN` (required in `http` mode for all canonical routes except `/points-tasks/status/health`)
- `RYVRA_POINTS_TASKS_AUTH_SCHEME` (default: `Bearer`)
- `RYVRA_POINTS_TASKS_REQUEST_ID_HEADER` (default: `x-request-id`)
- `RYVRA_POINTS_TASKS_CORRELATION_ID_HEADER` (default: `x-correlation-id`)
- `RYVRA_POINTS_TASKS_ACCOUNT_ID` (required in `http` mode for account-scoped endpoints)
- `RYVRA_POINTS_TASKS_CONNECTIVITY_PATH` (default probe: `/points-tasks/status`, fallback `/points-tasks/status/health`)
- `RYVRA_POINTS_TASKS_COMPATIBILITY_VERSION` (optional override)
- `RYVRA_POINTS_TASKS_PARITY_CHECK_MARKER` (optional override)
- `RYVRA_PAY_AUTH_TOKEN` (required in `http` mode to execute `/points` daily claim write flow through Pay intents)

Contract behavior notes:

- account-scoped routes require `account_id` (`points/*`, `tasks/*`, overview/summary)
- pagination is cursor-first (`limit`, `cursor`); `page` is deprecated compatibility only
- canonical filters/sort use OpenAPI keys (`entry_*`, `task_*`, `occurred_*`, `due_*`, `sort`)
- Points/Tasks HTTP errors are normalized to canonical envelope (`code`, `message`, `retryable`, `source`, optional `details`)
- deprecated payload aliases are accepted only where canonical compatibility allows
- runtime config now fails fast in `http` mode if `RYVRA_POINTS_TASKS_AUTH_TOKEN` is missing
- `/points` daily-claim module loads status from Points/Tasks and executes claims through Pay intent writes (`POST /pay/intents` + transitions) when invoke is available
- claim writes in `/points` reuse per-attempt idempotency keys on safe retries and always emit request/correlation IDs
- if claim execution endpoint is unavailable, daily-claim CTA stays disabled with explicit reason/retry guidance
- `/points` and `/tasks` now surface trust timelines/evidence panels and policy/help links with explicit unavailable-state placeholders for missing references

Optional smoke-test guard:

- `RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_URL`
- `RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_PATH` (optional, defaults to `/points-tasks/status/health`)

### Useful commands

```bash
pnpm --filter @ryvra/points-tasks-web dev
pnpm --filter @ryvra/points-tasks-web typecheck
pnpm --filter @ryvra/points-tasks-web build
pnpm --filter @ryvra/api-client test:parity
```

## Pay integration parity development (Phase 8.5)

`apps/pay-web` continues to support typed Pay data wiring with preserved dual mode transport:

- `mock` for deterministic local development
- `http` for live integration parity checks

Phase 12A UX note:

- `/pay/payouts` now includes a fingerprint-style **UI-only** claim confirmation flow (no WebAuthn).
- Claim submission uses canonical pay client write path (`createPaymentIntent` -> `POST /pay/intents`) with idempotency + request/correlation IDs.

Phase 12B UI/data-flow note:

- Pay dashboard/overview now render a shared **Unified Balance** card backed by read-only Markets positions data.
- Unified balance scope in Pay uses `RYVRA_MARKETS_ACCOUNT_ID` (mock fallback supported).
- No new pay write wiring was introduced for Points daily claim in this phase (deferred to Phase 12.5B).

Phase 13 trust/security/compliance UX note:

- `/pay/payouts` now includes timeline + evidence panels and policy/help links for payout/claim trust transparency.
- Claim success now renders a confirmation receipt surface with intent/request/correlation references when available.

### Environment variables

Core mode/base URL:

- `RYVRA_RUNTIME_MODE` (`mock` or `http`)
- `RYVRA_API_BASE_URL` (default: `http://localhost:4000`)
- `RYVRA_PAY_RUNTIME_MODE` (optional Pay-only override)
- `RYVRA_PAY_API_BASE_URL` (optional Pay-only override)

Pay parity/auth/header controls:

- `RYVRA_PAY_AUTH_TOKEN` (optional for read routes, required for claim submission in `http` mode)
- `RYVRA_PAY_AUTH_SCHEME` (default: `Bearer`)
- `RYVRA_PAY_REQUEST_ID_HEADER` (default: `x-request-id`)
- `RYVRA_PAY_CORRELATION_ID_HEADER` (default: `x-correlation-id`)
- `RYVRA_PAY_IDEMPOTENCY_HEADER` (default: `idempotency-key`)
- `RYVRA_PAY_CONNECTIVITY_PATH` (default probe: `/health`, fallback `/pay/overview`)
- `RYVRA_PAY_COMPATIBILITY_VERSION` (optional override)
- `RYVRA_PAY_PARITY_CHECK_MARKER` (optional override)
- `RYVRA_MARKETS_ACCOUNT_ID` (required in `http` mode to load Pay unified-balance card)
- `RYVRA_MARKETS_AUTH_TOKEN` (optional if distinct from pay auth token; required when Markets read routes need separate auth)

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
- `pnpm perf:guard`
- runtime policy verification (`Node 24.x`, `pnpm 10.16.0`)

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
- `docs/architecture/markets-integration-parity.md`
- `docs/architecture/markets-mvp-data-flow.md`
- `docs/architecture/pay-mvp-data-flow.md`
- `docs/architecture/pay-integration-parity.md`
- `docs/architecture/claim-ux-fingerprint-phase-12a.md`
- `docs/architecture/points-tasks-mvp-data-flow.md`
- `docs/architecture/unified-balance-and-daily-claim-phase-12b.md`
- `docs/architecture/trust-security-compliance-phase-13.md`
- `docs/architecture/claim-execution-phase-12-5b.md`
- `docs/architecture/points-tasks-integration-parity.md`
- `docs/architecture/release-readiness-checklist.md`
- `docs/architecture/reliability-performance-phase-17.md`
- `docs/architecture/notifications-and-comms-phase-14.md`
- `docs/architecture/portfolio-and-insights-phase-15.md`
- `docs/architecture/i18n-localization-phase-18.md`
- `docs/architecture/growth-conversion-phase-19.md`
