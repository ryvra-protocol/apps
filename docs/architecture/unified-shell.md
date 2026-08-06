# Unified Shell Architecture

## Purpose

Phase 7 establishes a shared app shell so Markets, Pay, and Points/Tasks feel like one platform experience.

## Shared shell surface

Implemented in `packages/ui`:

- `AppShell`
- `GlobalHeader`
- `GlobalSidebar`
- `ProductSwitcher`
- `UserMenu`
- `Breadcrumbs`
- `CommandPaletteTrigger`
- `ContextualNav`

Each component is typed, app-agnostic, and designed for composition.

## Visual system baseline

Shared tokens in `packages/ui/src/theme.ts` now provide:

- neutral background/surface primitives
- semantic text and border roles
- spacing scale
- typography scale and weights
- radius and shadow tokens
- focus ring tokens
- motion tokens with reduced-motion fallback

## Accessibility conventions

The shell enforces:

- semantic landmarks (`header`, `nav`, `aside`, `main`, `footer`)
- skip-to-content support
- visible keyboard focus states
- ARIA labels on navigation regions and switcher surfaces
- keyboard-reachable header/sidebar controls

## App integration pattern

Each app owns:

- app-specific shell frame (`app/shell-frame.tsx`)
- breadcrumb label mapping
- local/module nav semantics

All apps consume shared nav and route registry helpers from `@ryvra/config`.
