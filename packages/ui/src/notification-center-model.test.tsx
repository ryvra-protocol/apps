import assert from "node:assert/strict";
import test from "node:test";
import {
  countUnreadNotifications,
  createDefaultNotificationPreferences,
  createInitialNotificationPanelUiState,
  filterNotifications,
  isWebhookEndpointUrlValid,
  markAllNotificationsRead,
  markNotificationRead,
  mergeNotificationPreferences,
  resolveNotificationListState,
  sortNotifications,
  toggleNotificationPanelOpen,
  upsertNotification,
  type NotificationItem,
} from "./notification-center-model";

const notifications: NotificationItem[] = [
  {
    id: "n-1",
    category: "claims",
    severity: "info",
    message: "Claim submitted",
    createdAt: "2026-08-09T15:02:00.000Z",
    read: false,
    href: "/payouts?ref=claim",
  },
  {
    id: "n-2",
    category: "tasks",
    severity: "success",
    message: "Task completed",
    createdAt: "2026-08-09T15:01:00.000Z",
    read: true,
    href: "/tasks?ref=task",
  },
  {
    id: "n-3",
    category: "payouts",
    severity: "warn",
    message: "Payout failed",
    createdAt: "2026-08-09T15:03:00.000Z",
    read: false,
    href: "/payouts?ref=payout",
  },
];

test("panel open/close state and unread count are deterministic", () => {
  const initial = createInitialNotificationPanelUiState();
  assert.equal(initial.isOpen, false);

  const opened = toggleNotificationPanelOpen(initial, true);
  assert.equal(opened.isOpen, true);

  const toggled = toggleNotificationPanelOpen(opened);
  assert.equal(toggled.isOpen, false);

  assert.equal(countUnreadNotifications(notifications), 2);
});

test("list state resolver covers loading/empty/error/success", () => {
  assert.equal(resolveNotificationListState({ loading: true, items: [] }), "loading");
  assert.equal(resolveNotificationListState({ loading: false, errorMessage: "boom", items: [] }), "error");
  assert.equal(resolveNotificationListState({ loading: false, items: [] }), "empty");
  assert.equal(resolveNotificationListState({ loading: false, items: notifications }), "success");
});

test("filters and ordering keep deterministic output", () => {
  const claimsOnly = filterNotifications(notifications, "claims");
  assert.equal(claimsOnly.length, 1);
  assert.equal(claimsOnly[0]?.id, "n-1");

  const newest = sortNotifications(notifications, "newest");
  assert.deepEqual(
    newest.map((item) => item.id),
    ["n-3", "n-1", "n-2"],
  );

  const oldest = sortNotifications(notifications, "oldest");
  assert.deepEqual(
    oldest.map((item) => item.id),
    ["n-2", "n-1", "n-3"],
  );
});

test("mark read/unread actions are reversible", () => {
  const markedRead = markNotificationRead(notifications, "n-1", true);
  assert.equal(markedRead.find((item) => item.id === "n-1")?.read, true);

  const markedUnread = markNotificationRead(markedRead, "n-2", false);
  assert.equal(markedUnread.find((item) => item.id === "n-2")?.read, false);

  const allRead = markAllNotificationsRead(markedUnread);
  assert.equal(allRead.every((item) => item.read), true);
});

test("notification upsert respects dedupe keys and deep-link payload", () => {
  const draft = {
    category: "claims" as const,
    severity: "info" as const,
    message: "Claim processing",
    href: "/payouts?ref=claim&entity=payout&id=po_1",
    referenceLabel: "Intent ID",
    referenceValue: "intent_123456789",
    dedupeKey: "claim:processing:req-1",
  };

  const created = upsertNotification([], draft);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.href, draft.href);

  const duplicate = upsertNotification(created, draft);
  assert.equal(duplicate.length, 1);
});

test("preference defaults, toggle merge, and webhook url validation are stable", () => {
  const defaults = createDefaultNotificationPreferences();
  assert.equal(defaults.email.enabled, true);
  assert.equal(defaults.webhook.enabled, false);

  const merged = mergeNotificationPreferences(defaults, {
    email: {
      enabled: false,
      categories: {
        ...defaults.email.categories,
        tasks: false,
      },
    },
    webhook: {
      enabled: true,
      endpointUrl: "https://hooks.ryvra.test/events",
      categories: {
        ...defaults.webhook.categories,
        claims: false,
      },
    },
  });

  assert.equal(merged.email.enabled, false);
  assert.equal(merged.email.categories.tasks, false);
  assert.equal(merged.webhook.enabled, true);
  assert.equal(merged.webhook.categories.claims, false);

  assert.equal(isWebhookEndpointUrlValid("https://hooks.ryvra.test/events"), true);
  assert.equal(isWebhookEndpointUrlValid("http://localhost:8080/hook"), true);
  assert.equal(isWebhookEndpointUrlValid("ftp://hooks.ryvra.test"), false);
  assert.equal(isWebhookEndpointUrlValid("not-a-url"), false);
});
