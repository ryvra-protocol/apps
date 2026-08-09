import {
  createDefaultNotificationPreferences,
  mergeNotificationPreferences,
  sortNotifications,
  type NotificationItem,
  type NotificationPreferences,
} from "./notification-center-model";

export type NotificationPersistenceMode = "remote" | "local-preview";

export const NOTIFICATION_FEED_STORAGE_PREFIX = "ryvra:notifications:feed:v1";
export const NOTIFICATION_PREFERENCES_STORAGE_PREFIX = "ryvra:notifications:preferences:v1";

function normalizeScopeKey(scopeKey: string): string {
  const trimmed = scopeKey.trim();
  if (trimmed.length === 0) {
    return "global";
  }

  return trimmed.replace(/\s+/g, "_");
}

function ensureObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

function isNotificationItem(value: unknown): value is NotificationItem {
  const candidate = ensureObject(value);
  if (!candidate) {
    return false;
  }

  return (
    typeof candidate.id === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.severity === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.read === "boolean"
  );
}

export interface NotificationStorageLoadResult {
  notifications: NotificationItem[];
  preferences: NotificationPreferences;
  errorMessage?: string;
}

export function buildNotificationFeedStorageKey(scopeKey: string): string {
  return `${NOTIFICATION_FEED_STORAGE_PREFIX}:${normalizeScopeKey(scopeKey)}`;
}

export function buildNotificationPreferencesStorageKey(scopeKey: string): string {
  return `${NOTIFICATION_PREFERENCES_STORAGE_PREFIX}:${normalizeScopeKey(scopeKey)}`;
}

export function loadNotificationStorageSnapshot(
  storage: Pick<Storage, "getItem"> | null | undefined,
  scopeKey: string,
): NotificationStorageLoadResult {
  const defaultPreferences = createDefaultNotificationPreferences();

  if (!storage) {
    return {
      notifications: [],
      preferences: defaultPreferences,
    };
  }

  const feedKey = buildNotificationFeedStorageKey(scopeKey);
  const preferencesKey = buildNotificationPreferencesStorageKey(scopeKey);

  try {
    const parsedFeed = JSON.parse(storage.getItem(feedKey) ?? "[]") as unknown;
    const notifications = Array.isArray(parsedFeed)
      ? sortNotifications(parsedFeed.filter((entry): entry is NotificationItem => isNotificationItem(entry)), "newest")
      : [];

    const parsedPreferences = JSON.parse(storage.getItem(preferencesKey) ?? "{}") as unknown;
    const mergedPreferences = mergeNotificationPreferences(
      defaultPreferences,
      ensureObject(parsedPreferences) ? (parsedPreferences as Partial<NotificationPreferences>) : {},
    );

    return {
      notifications,
      preferences: mergedPreferences,
    };
  } catch {
    return {
      notifications: [],
      preferences: defaultPreferences,
      errorMessage: "Stored notification data could not be loaded. Reset to local preview defaults.",
    };
  }
}

export function persistNotificationStorageSnapshot(
  storage: Pick<Storage, "setItem"> | null | undefined,
  scopeKey: string,
  snapshot: {
    notifications: readonly NotificationItem[];
    preferences: NotificationPreferences;
  },
): void {
  if (!storage) {
    return;
  }

  const feedKey = buildNotificationFeedStorageKey(scopeKey);
  const preferencesKey = buildNotificationPreferencesStorageKey(scopeKey);

  try {
    storage.setItem(feedKey, JSON.stringify(sortNotifications(snapshot.notifications, "newest")));
    storage.setItem(preferencesKey, JSON.stringify(snapshot.preferences));
  } catch {
    // ignore storage write failures (private mode/storage quotas)
  }
}
