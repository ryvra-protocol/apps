# Phase 16: Team/Workspace Controls

## Scope

Phase 16 delivers cross-app team/workspace UX controls for:

- role-aware views and action gating
- delegated-operation provenance visibility
- hardened account/workspace(/user) switcher behavior

Products in scope:

- `apps/markets-web`
- `apps/pay-web`
- `apps/points-tasks-web`

## Role model and source of truth

Source of truth: `@ryvra/auth` (`packages/auth/src/workspace-access.ts`).

- Workspace roles:
  - `Viewer`
  - `Operator`
  - `Admin`
- Capability map:
  - `read`
  - `operate`
  - `admin`
- Claim-to-role mapping used by current runtime session stubs:
  - `support` -> `Viewer`
  - `member`/`operator` -> `Operator`
  - `admin` -> `Admin`

Apps must consume shared helpers (`resolveWorkspaceRoleView`, `canAccessWorkspaceCapability`, `describeWorkspaceCapabilityRequirement`) and must not redefine role semantics locally.

## UI gating rules and limitations

### Rules

- Action controls:
  - enabled only when required capability is present
  - otherwise disabled with explicit reason text
- Sensitive operational panels (timeline/evidence):
  - visible for roles with `operate` capability
  - replaced with explicit permission guidance for `Viewer`
- Route-level restrictions where route metadata exists:
  - enforce `evaluateRoutePermission(resolveRoutePermissionMeta(...))`
  - render explicit permission-denied states (no silent failure)
- Navigation:
  - restricted routes are disabled and labeled with required-role reason

### Limitations

- Phase 16 does not introduce new backend authorization.
- UI gating reflects available runtime role/session metadata only.
- When role/session metadata is unavailable or malformed, behavior falls back to conservative defaults (`Viewer` semantics and explicit unavailability messaging).

## Delegated operations visibility model

Source of truth for shared rendering/filter behavior: `@ryvra/ui` (`DelegationContext.tsx`).

- Provenance fields surfaced when available:
  - `initiated by`
  - `acting for`
  - `account`
  - `workspace`
- Shared filters:
  - `all`
  - `mine`
  - `delegated_to_me`
  - `delegated_by_me`
- Explicit unavailable rendering:
  - `Not available in current environment`

App mappings:

- Markets:
  - Orders list/detail shows provenance shell + explicit unavailable fallback (backend delegation metadata not currently exposed).
- Pay:
  - Payouts, invoices, reconciliation surfaces show provenance shell + explicit unavailable fallback (backend delegation metadata not currently exposed).
- Points/Tasks:
  - Points entries: metadata-based extraction where available.
  - Tasks: user/workspace scoped attribution where available.
  - Fallback unavailable messaging when actor metadata is absent.

## Switcher state, persistence, and URL rules

Source of truth: `@ryvra/ui` (`workspace-scope.ts`, `WorkspaceScopeSwitcher.tsx`).

- Canonical query keys:
  - `account_id`
  - `workspace_id`
  - optional `user_id` (Points/Tasks shell)
- Accepted aliases (auto-normalized):
  - `accountId`, `workspaceId`, `userId`
- Validation:
  - invalid/malformed values are rejected
  - unsupported option values are reset to safe defaults
  - explicit notices are rendered in shell
- Route intent preservation:
  - route path is preserved during switches
  - only approved compatibility params are retained
  - incompatible pagination/filter state is dropped where needed
- Persistence:
  - per-product storage key: `ryvra.scope.<product>`
  - hydration-safe restore on client with canonical rewrite
  - invalid stored state is ignored with explicit notice

## Backend data gaps and fallback behavior

Known current gaps:

- Markets and Pay contracts do not currently provide full delegated-actor provenance fields for operation DTOs.
- Tasks actor provenance is partial and not consistently explicit across all rows.

Fallback policy:

- never render blank ambiguous states for delegation
- render explicit unavailable message when provenance is missing
- do not infer or fabricate backend authorization/delegation data
- preserve existing request/correlation/idempotency behavior unchanged
