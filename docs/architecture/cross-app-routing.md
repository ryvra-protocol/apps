# Cross-App Routing Contract

## Goal

Provide typed, consistent routing between Pay, Markets, and Points/Tasks before feature-page rollout.

## Canonical registry

`packages/config/src/routing.ts` defines:

- product IDs: `pay | markets | points`
- global nav map: `Overview`, `Pay`, `Markets`, `Points`, `Tasks`
- per-product local nav maps
- visibility and optional permission metadata per item

## Helper APIs

- `getGlobalNavItems()`
- `getProductNav(productId)`
- `buildDeepLink({ product, path, ref, entity, id, ctx })`
- `parseDeepLink(searchParams)`

`buildDeepLink` resolves product-aware URLs and appends context params.

## Deep-link contract

Standard query params:

- `ref` source module
- `entity` entity type (`invoice`, `order`, `task`, etc.)
- `id` entity identifier
- `ctx` optional context payload for future extensibility

Validation is implemented with `zod` and enforced in both builder and parser paths.

## Base URL resolution

Product base URLs are sourced from:

- `NEXT_PUBLIC_MARKETS_APP_URL`
- `NEXT_PUBLIC_PAY_APP_URL`
- `NEXT_PUBLIC_POINTS_APP_URL`

Defaults are local dev ports (`3000`, `3001`, `3002`) when env values are not set.

## Usage example

Each app shell frame consumes:

1. global nav from `getGlobalNavItems({ currentProduct })`
2. local nav from `getProductNav(productId)`
3. deep-link construction for cross-product CTA links

Each target page can read and validate context with `parseDeepLink`.
