# Notifications and Communications (Phase 14)

## Scope

Phase 14 introduces a shared in-app notification center and communication preference surfaces across:

- `apps/markets-web`
- `apps/pay-web`
- `apps/points-tasks-web`

Delivery is UI-first. Backend notification feeds and remote preference persistence are explicitly deferred where contracts are not available.

## Notification center architecture

### Shared shell integration

- Notification center is embedded in the shared header action row (`@ryvra/ui`).
- A scope-aware provider wraps the shell (`NotificationCenterProvider`) and exposes notification state/actions through `useNotificationCenter`.
- Scope key is derived per app shell from product + account/user/workspace query context to preserve account/tenant isolation in local storage.

### Data model

- Categories: `claims`, `payouts`, `tasks`, `system`
- Severities: `info`, `success`, `warn`, `error`
- Notification item fields include:
  - read/unread state
  - ISO timestamp
  - concise message
  - optional deep-link route
  - optional reference label/value (sanitized snippet)
  - optional dedupe key

### Panel behavior

- Trigger: bell button with unread badge and ARIA labeling.
- Views: category tabs (`All`, `Claims`, `Payouts`, `Tasks`, `System`) and sort (`Newest first`, `Oldest first`).
- States: loading, error (retry action), empty, success.
- Actions per item:
  - mark read/unread
  - open context deep-link (marks read)
- Ordering is deterministic by timestamp and stable tie-breaker.

## Producer and mapping model

### Claim lifecycle notifications

Produced from claim submission flows in:

- `apps/pay-web/app/components/claim-fingerprint-card-client.tsx`
- `apps/points-tasks-web/app/components/daily-claim-card.tsx`

Mapped lifecycle stages:

- submitted
- processing
- completed
- failed (retryable/non-retryable severity)

References use intent/request/correlation snippets where available.

### Payout status notifications

Produced from payout list surfaces in:

- `apps/pay-web/app/components/payouts-table-client.tsx`

Canonical mappings:

- `SCHEDULED` -> created/queued
- `PROCESSING` -> processing
- `COMPLETED` -> completed
- `FAILED` -> failed/retryable (keyword-based retryability hint)

### Task status notifications

Produced from task list surfaces in:

- `apps/points-tasks-web/app/components/tasks-table-client.tsx`

Canonical/provisional mappings:

- `eligible` / `not_started` -> assigned/eligible
- `in_progress` / active review states -> in-progress update
- `completed` / `done` -> completed/reward-ready
- blocked/terminal states -> warn-level closure/update copy

## Preferences surface architecture

Preferences live in the notification center panel:

- Email:
  - global toggle
  - per-category toggles
- Webhook:
  - global toggle
  - endpoint URL input
  - per-category toggles
  - basic URL validation with inline error
  - test ping button disabled with explicit reason when unsupported

## Storage modes and persistence behavior

### Current phase behavior

- Mode: **local preview settings**
- Notifications + preferences persist in browser local storage by scope key.
- UI explicitly labels local preview mode and states that remote persistence is not configured.

### Remote mode support

- Provider supports an explicit `remote` mode label for future backend wiring.
- No remote feed/prefs endpoint is currently integrated in this phase.

## Privacy and redaction rules

- No secrets/tokens are displayed in notification messages or references.
- Reference values are sanitized and abbreviated; sensitive patterns are redacted.
- IDs shown in UI are snippets only when appropriate.
- No auth token/header values are stored in notifications/preferences.

## Accessibility and trust UX

- Keyboard-accessible trigger, tabs, action controls, and close behavior.
- ARIA labels for icon/control surfaces and unread badge announcements.
- Focus management returns focus to trigger on close and focuses panel heading on open.
- Read/unread and severity indicators use explicit text and contrast-safe token usage.
- Reduced-motion behavior inherits shell-wide motion reduction policy.

## Deferred backend wiring notes

The following backend capabilities remain deferred pending published contracts/endpoints:

- remote in-app notification feed subscription/history
- remote read/unread persistence
- remote email/webhook preference persistence APIs
- webhook test ping execution endpoint

Phase 14 keeps these gaps explicit in UI copy and mode labeling to avoid deceptive behavior.
