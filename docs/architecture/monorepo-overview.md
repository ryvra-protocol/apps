# Monorepo Overview

## Purpose

This monorepo establishes a shared platform foundation for the Ryvra Markets, Pay, and Points/Tasks web apps. The objective is fast product iteration with explicit boundaries between app experiences and reusable platform contracts.

## Why these boundaries exist

- Keep each product app independently deployable and product-focused.
- Centralize cross-cutting contracts (auth, config, observability, API boundaries, and UI primitives).
- Prevent duplicated DTO drift across products.
- Keep domain logic packages framework-agnostic and testable.

## Top-level structure

- `apps/*`: product-facing Next.js applications.
- `packages/*`: shared TypeScript contracts and primitives.
- `docs/architecture/*`: platform boundary and integration documentation.

## Consumption model

Apps consume shared packages through workspace dependencies. Shared packages expose typed interfaces and safe placeholders, allowing app-level integration while business implementations evolve in later phases.

## Phase 7 additions

- unified app shell primitives in `@ryvra/ui`
- typed global/local routing registry in `@ryvra/config`
- standardized deep-link contract for cross-product context transfer
