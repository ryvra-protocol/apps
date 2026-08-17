# UX Hardening: Brand, Action Surfaces, and User-Facing Simplification

## Scope

This phase hardens end-user UX across Markets, Pay, and the Ryvra Community Hub by removing exposed workspace controls, improving hierarchy, and standardizing high-utility actions.

## Why workspace controls were removed from user-facing UI

- End users should not manage internal workspace scope in primary app flows.
- Exposed workspace/account/user selectors increased cognitive load and diluted product-level workflows.
- Scope handling remains enforced internally through canonical query normalization and persisted scope state, without user-facing workspace controls.

## Snapshot placement and indicator policy

- Canonical/operational snapshot emphasis now uses compact inline indicators near the top of pages.
- Full snapshot detail cards are retained as supporting context and placed at the end of each applicable page.
- Primary workflows (actions, balances, activity, modules) remain above the fold.

## Brand color usage guidelines

- Shared token source: `packages/ui/src/theme.ts`.
- Brand hierarchy:
  - Primary CTAs use `color.primary` with hover/active variants.
  - Supporting CTAs use secondary treatment with brand-border hover accents.
  - Highlight cards and important status chips use `primarySurface`/`primaryBorder` and semantic status colors.
- Avoid ad-hoc color literals in app surfaces; consume tokenized values only.

## Action button taxonomy by app

### Markets

- Core actions: `Send`, `Receive`, `View History`, `Export` (deferred)
- Module actions: `Open Spot`, `Open Perps`, `Stake Now`
- New side-nav modules: Classified Spot, Perps Trading, Staking

### Pay

- Core actions: `Send`, `Receive`, `Claim`, `View History`, `Transfer` (deferred), `Export` (deferred)
- Claim action remains guard-railed by existing operate capability checks.

### Ryvra Community Hub

- Core actions: `Send`, `Receive`, `Claim`, `View History`, `Transfer` (deferred), `Export` (deferred)
- Claim CTA is surfaced in dashboard and overview top action zones with explicit disabled reasons.

## Deferred backend action notes

Deferred actions remain visible with explicit reasons to preserve IA discoverability while preventing broken workflows:

- Markets: spot/perps/staking execution backends are deferred by environment.
- Pay: transfer/export operations are deferred pending reporting/treasury APIs.
- Community Hub: transfer/export operations are deferred pending community transfer/reporting APIs.

These deferred states preserve existing role/permission guards and avoid introducing backend or security contract changes.
