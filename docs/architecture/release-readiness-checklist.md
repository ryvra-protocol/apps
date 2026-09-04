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
  - `openapi/pay.openapi.yaml`
  - `docs/api-contract-changelog.md`
  - OpenAPI SHA `27bae071d8779801eb9c35e9b8e3db6af0d06d26`
  - OpenAPI commit `4b61bf09bc16a3676ea8241675ba2d76cd22d74c`
- Points/Tasks source of truth: `ryvra-protocol/protocol-core`
  - `openapi/points-tasks.openapi.yaml`
  - `docs/api-contract-changelog.md`
- Contract pin matrix: `docs/architecture/contract-pin-matrix.json`
- Contract sync policy: `docs/architecture/org-contract-sync-policy.md`

## Contract sync release gates

- Contract pin verification passes (`pnpm contract:check` / CI `contract-sync-check`).
- Markets, Pay, and Points/Tasks parity status is reviewed against canonical repos before release.

## CI required checks

- Runtime policy check (Node 24.x + pnpm 10.16.0)
- `pnpm install --frozen-lockfile`
- `pnpm contract:check` (contract pin matrix + upstream SHA drift guard)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm perf:guard` (Phase 17 bundle budget + critical route artifact guard)
- locale smoke checks:
  - shared shell render in `en`, `fr`, and `ar`
  - locale preference persistence restore
  - RTL direction toggle assertions

## Phase 16 team/workspace controls go-live gates

- Role model parity:
  - Viewer/Operator/Admin capability mapping is sourced from `@ryvra/auth` only.
  - Role-gated controls render explicit disabled/denied reasons (no silent failure).
- Scope switcher parity:
  - canonical query keys (`account_id`, `workspace_id`, optional `user_id`) are enforced in all shells.
  - user-facing workspace switcher surfaces are removed from production shell headers.
  - malformed scope values still reset to safe defaults with deterministic canonicalization and persisted restore (`ryvra.scope.<product>`).
- Delegated visibility parity:
  - operation lists/details render provenance when metadata exists.
  - missing delegation metadata renders explicit `Not available in current environment` state.

## Phase 19 growth/conversion go-live gates

- Funnel instrumentation parity:
  - `stage_entered`, `stage_completed`, and inferable `stage_abandoned` events emit for landing/session, scope selection, first key action, and completion success.
  - Event payloads include scope hash only (no raw account/workspace/user identifiers).
- Onboarding checklist parity:
  - shared getting-started checklist is visible in dashboard/overview high-priority zones across Markets, Pay, and Points/Tasks.
  - checklist progression, minimize/dismiss/resume, and reset behavior persist by `app + scopeHash`.
- Claim experiment parity:
  - deterministic variant assignment per scope (`claim_conversion_phase19_v1`) with QA override via `claim_variant` query param.
  - variant rendering must not bypass existing role/scope/availability guards.
  - claim exposure/click/success/failure outcomes emit through shared growth events.
- Analytics sink policy:
  - backend analytics endpoint remains deferred in this phase.
  - local-preview sink persistence (`ryvra.growth.events.v1`) must stay explicitly labeled non-remote.

## UX hardening go-live gates

- Brand token compliance:
  - primary/secondary CTAs, highlight cards, and indicator accents consume shared `@ryvra/ui` theme tokens.
  - no ad-hoc color literals are introduced in app-facing UX surfaces.
- Snapshot hierarchy compliance:
  - compact indicators appear above fold for canonical context.
  - detailed snapshot cards/sections render at end-of-page on applicable routes.
- Action surface compliance:
  - Markets, Pay, and Community Hub dashboard/overview surfaces expose consistent top action zones.
  - required high-utility actions include `Send`, `Receive`, and app-specific operations (`Claim`, `Transfer`, `View History`, `Export`).
  - deferred backend actions show explicit disabled/deferred reasons.
- Community Hub naming compliance:
  - user-facing shell and primary page headers use **Ryvra Community Hub** naming.

## Phase 21 go-live gates (brand direction + P2P + merchant)

- Brand token compliance:
  - shared palette includes Primary/Secondary/Accent/Success/Warning/Danger plus required light/dark/text/border tokens.
  - CTA/buttons/cards/borders/status chips consume shared tokens only.
  - no logo asset changes are included in this phase.
- P2P surface compliance:
  - `/p2p/send` includes recipient + amount + memo + review/confirm + success/failure states.
  - `/p2p/receive` includes receive handle instructions and request-payment preview/deferred messaging.
  - `/p2p/history` includes status/date/search filtering and explicit preview fallback messaging where canonical P2P history APIs are unavailable.
  - lifecycle notifications map initiated/processing/completed/failed without exposing secrets.
- Merchant dashboard compliance:
  - `/merchant` is explicitly role-gated and renders permission-denied state for unauthorized users.
  - KPI cards, transactions table, settlement summary, and deferred refunds/disputes panel are present.
  - unavailable backend operations render explicit deferred reasons (no fake persistence).

## Smoke validation commands

```bash
node -v
pnpm -v
pnpm install --frozen-lockfile
pnpm contract:check
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

Internationalization-specific smoke assertions:

- locale preference update/persistence (`ryvra.locale`)
- timezone preference update/persistence (`ryvra.timezone`)
- fallback translation diagnostics only in non-production mode

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
