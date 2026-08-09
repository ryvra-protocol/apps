import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultNotificationPreferences, type NotificationItem } from "./notification-center-model";
import {
  buildNotificationFeedStorageKey,
  buildNotificationPreferencesStorageKey,
  loadNotificationStorageSnapshot,
  persistNotificationStorageSnapshot,
} from "./notification-center-storage";

function createMemoryStorage() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    values: store,
  };
}

test("local preview storage persists and reloads notifications/preferences by scope", () => {
  const storage = createMemoryStorage();
  const scopeKey = "pay:acct-1:user-1:ws-1";
  const preferences = createDefaultNotificationPreferences();
  const notifications: NotificationItem[] = [
    {
      id: "local-1",
      category: "system",
      severity: "info",
      message: "Preview mode active",
      createdAt: "2026-08-09T15:30:00.000Z",
      read: false,
      dedupeKey: "system:preview",
    },
  ];

  persistNotificationStorageSnapshot(storage, scopeKey, {
    notifications,
    preferences,
  });

  const feedKey = buildNotificationFeedStorageKey(scopeKey);
  const prefKey = buildNotificationPreferencesStorageKey(scopeKey);
  assert.equal(storage.values.has(feedKey), true);
  assert.equal(storage.values.has(prefKey), true);

  const loaded = loadNotificationStorageSnapshot(storage, scopeKey);
  assert.equal(loaded.errorMessage, undefined);
  assert.equal(loaded.notifications.length, 1);
  assert.equal(loaded.notifications[0]?.message, "Preview mode active");
  assert.equal(loaded.preferences.email.enabled, true);
});

test("invalid stored payload falls back to defaults with explicit error", () => {
  const storage = createMemoryStorage();
  const scopeKey = "broken-scope";
  storage.setItem(buildNotificationFeedStorageKey(scopeKey), "{broken-json");

  const loaded = loadNotificationStorageSnapshot(storage, scopeKey);
  assert.equal(loaded.notifications.length, 0);
  assert.equal(loaded.preferences.webhook.enabled, false);
  assert.equal(Boolean(loaded.errorMessage), true);
});
