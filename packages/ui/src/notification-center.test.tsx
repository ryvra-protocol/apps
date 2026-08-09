import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationCenter } from "./NotificationCenter";
import { NotificationCenterProvider } from "./NotificationCenterProvider";
import { createDefaultNotificationPreferences } from "./notification-center-model";

test("notification center renders accessible controls, unread badge, and deep link actions", () => {
  const markup = renderToStaticMarkup(
    <NotificationCenterProvider
      scopeKey="pay:acct-1:user-1:ws-1"
      initialStatus="ready"
      initialPreferences={createDefaultNotificationPreferences()}
      initialNotifications={[
        {
          id: "notif-claim-1",
          category: "claims",
          severity: "info",
          message: "Claim submitted for payout po_123.",
          createdAt: "2026-08-09T15:00:00.000Z",
          read: false,
          href: "/payouts?ref=claim&entity=payout&id=po_123",
          referenceLabel: "Request ID",
          referenceValue: "req_123456",
          dedupeKey: "claim:submitted:req_123456",
        },
      ]}
    >
      <NotificationCenter defaultOpen />
    </NotificationCenterProvider>,
  );

  assert.match(markup, /aria-label="Open notification center \(1 unread\)"/);
  assert.match(markup, /aria-label="1 unread notifications"/);
  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-label="Notification categories"/);
  assert.match(markup, /role="tab"/);
  assert.match(markup, /aria-selected="true"/);
  assert.match(markup, /href="\/payouts\?ref=claim&amp;entity=payout&amp;id=po_123"/);
  assert.match(markup, /Open context/);
  assert.match(markup, /Local preview settings/);
  assert.match(markup, /Webhook test ping is deferred until a remote delivery endpoint is available/);
  assert.match(markup, /aria-label="Close notification center"/);
});

test("notification center renders loading, error, and empty states", () => {
  const loading = renderToStaticMarkup(
    <NotificationCenterProvider scopeKey="scope-loading" initialStatus="loading">
      <NotificationCenter defaultOpen />
    </NotificationCenterProvider>,
  );
  assert.match(loading, /Loading notifications/);

  const errored = renderToStaticMarkup(
    <NotificationCenterProvider scopeKey="scope-error" initialStatus="error" initialNotifications={[]}>
      <NotificationCenter defaultOpen />
    </NotificationCenterProvider>,
  );
  assert.match(errored, /Notifications could not be loaded/);
  assert.match(errored, /Retry/);

  const empty = renderToStaticMarkup(
    <NotificationCenterProvider
      scopeKey="scope-empty"
      initialStatus="ready"
      initialPreferences={createDefaultNotificationPreferences()}
      initialNotifications={[]}
    >
      <NotificationCenter defaultOpen />
    </NotificationCenterProvider>,
  );
  assert.match(empty, /No notifications available for this filter/);
});

test("notification center mode labels show local preview and remote sync messaging", () => {
  const remoteMarkup = renderToStaticMarkup(
    <NotificationCenterProvider
      scopeKey="scope-remote"
      mode="remote"
      initialStatus="ready"
      initialPreferences={createDefaultNotificationPreferences()}
      initialNotifications={[]}
    >
      <NotificationCenter defaultOpen />
    </NotificationCenterProvider>,
  );

  assert.match(remoteMarkup, /Remote synced settings/);
  assert.doesNotMatch(remoteMarkup, /Remote notifications and communication preference persistence are not configured/);
});
