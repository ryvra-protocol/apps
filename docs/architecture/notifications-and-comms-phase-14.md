# Notifications & Communications — Phase 14

## Scope

Phase 14 delivers a UI-first in-app notification center and communication preference surfaces across:

- `apps/markets-web`
- `apps/pay-web`
- `apps/points-tasks-web`

No new backend contracts were introduced in this phase. Where backend persistence/feed wiring is absent, the UX is explicit about local preview behavior.

## Notification center architecture

### Shared shell integration

- `@ryvra/ui` now provides:
  - `NotificationCenterProvider`
  - `NotificationCenterControl`
  - notification model helpers (filters/sort/read state/mapping functions)
- `AppShell` mounts `NotificationCenterProvider` and `GlobalHeader` renders the bell trigger with unread badge.
- All three app `shell-frame.tsx` files pass:
  - `notificationAppId` (product identity)
  - `notificationScopeKey` (derived from account/workspace/user query params where present)
  - `notificationFeedMode="local-preview"`
  - `notificationPreferenceMode="local-preview"`

### Center capabilities

- Header trigger:
  - icon-only bell button
  - unread badge
  - ARIA labels and expanded/collapsed semantics
- Panel:
  - view tabs: notification center + preferences
  - category filters: `All`, `Claims`, `Payouts`, `Tasks`, `System`
  - deterministic sort: newest/oldest
  - read/unread controls
  - deep-link actions to related app context
  - loading, empty, error, success list states
- Explicit preview-state copy:
  - feed mode label
  - local preview disclosure when remote feed is not wired

## Producer/mapping model (claim/payout/task)

### Claim notifications

- Producers:
  - `apps/pay-web/app/components/claim-fingerprint-card-client.tsx`
  - `apps/points-tasks-web/app/components/daily-claim-card.tsx`
- Lifecycle mapping:
  - `submitted`
  - `processing`
  - `completed`
  - `failed` (retryable/non-retryable guidance-aware copy)

### Payout notifications

- Producer:
  - `apps/pay-web/app/components/payout-status-notification-bridge.tsx`
- Status mapping:
  - `SCHEDULED` -> created/queued
  - `PROCESSING` -> processing
  - `COMPLETED` -> completed
  - `FAILED` -> failed/retryable guidance

### Task notifications

- Producer:
  - `apps/points-tasks-web/app/components/task-status-notification-bridge.tsx`
- Status mapping:
  - `eligible` / `not_started` -> assigned/eligible
  - `in_progress` / active progression -> in-progress update
  - `completed` / done progression -> completed/reward-ready
  - terminal non-success states -> closed-with-issue guidance

## Preference storage modes

### Email preferences

- global toggle
- per-category toggles (`Claims`, `Payouts`, `Tasks`, `System`)

### Webhook preferences

- global toggle
- endpoint URL input
- per-category toggles
- inline URL validation
- test ping control disabled with explicit reason until backend support exists

### Persistence behavior in Phase 14

- **Notifications:** local storage (scope-keyed)
- **Preferences:** local storage (scope-keyed)
- **Remote persistence/feed:** not available in current contracts
- UI labels this mode as **local preview settings** to prevent deceptive behavior.

## Privacy and redaction rules

- Notification references are rendered as snippets (truncated identifiers).
- Secret-like labels (token/secret/password/authorization/api-key) are redacted.
- No auth tokens or credential values are rendered in notification surfaces.
- Existing auth guard behavior remains unchanged.
- Scope isolation is enforced by scope-keyed local storage (app + account/workspace/user context).

## Accessibility and trust UX

- keyboard-operable trigger, tabs, actions, and preference controls
- ARIA labels for icon controls and unread badge
- focus handoff on open/close interactions
- contrast-safe severity/read indicators
- reduced-motion safe transitions (inherits shell reduced-motion policy)

## Deferred backend wiring notes

Deferred until canonical API contracts exist:

1. Remote notification feed endpoint(s)
2. Remote communication preference read/write endpoint(s)
3. Webhook test ping execution endpoint

Current behavior intentionally stays explicit local-preview-only until these backend capabilities are published and integrated through `@ryvra/api-client`.
