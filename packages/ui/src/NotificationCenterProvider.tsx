"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createDefaultNotificationPreferences,
  createDefaultCategoryToggles,
  mergeNotificationPreferences,
  markAllNotificationsRead,
  markNotificationRead,
  upsertNotification,
  type NotificationDraft,
  type NotificationItem,
  type NotificationPreferences,
} from "./notification-center-model";
import {
  loadNotificationStorageSnapshot,
  persistNotificationStorageSnapshot,
  type NotificationPersistenceMode,
} from "./notification-center-storage";

export type NotificationCenterStatus = "loading" | "ready" | "error";

export interface NotificationCenterContextValue {
  mode: NotificationPersistenceMode;
  status: NotificationCenterStatus;
  errorMessage?: string;
  notifications: NotificationItem[];
  preferences: NotificationPreferences;
  addNotification: (draft: NotificationDraft) => void;
  markAsRead: (notificationId: string) => void;
  markAsUnread: (notificationId: string) => void;
  markAllRead: () => void;
  updatePreferences: (
    next:
      | NotificationPreferences
      | ((current: NotificationPreferences) => NotificationPreferences),
  ) => void;
  reloadFromStorage: () => void;
  supportsWebhookTestPing: boolean;
  webhookTestPingReason: string;
}

const noop = () => undefined;

const defaultContextValue: NotificationCenterContextValue = {
  mode: "local-preview",
  status: "loading",
  notifications: [],
  preferences: {
    email: {
      enabled: true,
      categories: createDefaultCategoryToggles(true),
    },
    webhook: {
      enabled: false,
      endpointUrl: "",
      categories: createDefaultCategoryToggles(true),
    },
  },
  addNotification: noop,
  markAsRead: noop,
  markAsUnread: noop,
  markAllRead: noop,
  updatePreferences: noop,
  reloadFromStorage: noop,
  supportsWebhookTestPing: false,
  webhookTestPingReason: "Webhook test ping is deferred until a remote delivery endpoint is available.",
};

const NotificationCenterContext = createContext<NotificationCenterContextValue>(defaultContextValue);

export interface NotificationCenterProviderProps {
  scopeKey: string;
  children: ReactNode;
  mode?: NotificationPersistenceMode;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  initialNotifications?: NotificationItem[];
  initialPreferences?: NotificationPreferences;
  initialStatus?: NotificationCenterStatus;
}

function resolveStorage(storage: NotificationCenterProviderProps["storage"]): Pick<Storage, "getItem" | "setItem"> | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function NotificationCenterProvider({
  scopeKey,
  children,
  mode = "local-preview",
  storage,
  initialNotifications,
  initialPreferences,
  initialStatus,
}: NotificationCenterProviderProps) {
  const resolvedStorage = resolveStorage(storage);
  const shouldHydrate =
    typeof initialNotifications === "undefined" &&
    typeof initialPreferences === "undefined" &&
    typeof initialStatus === "undefined";

  const [status, setStatus] = useState<NotificationCenterStatus>(() => initialStatus ?? (shouldHydrate ? "loading" : "ready"));
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => initialNotifications ?? []);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    () => initialPreferences ?? createDefaultNotificationPreferences(),
  );

  const loadSnapshot = useCallback(() => {
    const snapshot = loadNotificationStorageSnapshot(resolvedStorage, scopeKey);
    setNotifications(snapshot.notifications);
    setPreferences(snapshot.preferences);
    setErrorMessage(snapshot.errorMessage);
    setStatus(snapshot.errorMessage ? "error" : "ready");
  }, [resolvedStorage, scopeKey]);

  useEffect(() => {
    if (!shouldHydrate) {
      return;
    }

    loadSnapshot();
  }, [loadSnapshot, shouldHydrate]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    persistNotificationStorageSnapshot(resolvedStorage, scopeKey, {
      notifications,
      preferences,
    });
  }, [notifications, preferences, resolvedStorage, scopeKey, status]);

  const addNotification = useCallback((draft: NotificationDraft) => {
    setNotifications((current) => upsertNotification(current, draft));
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((current) => markNotificationRead(current, notificationId, true));
  }, []);

  const markAsUnread = useCallback((notificationId: string) => {
    setNotifications((current) => markNotificationRead(current, notificationId, false));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) => markAllNotificationsRead(current));
  }, []);

  const updatePreferences = useCallback(
    (
      next:
        | NotificationPreferences
        | ((current: NotificationPreferences) => NotificationPreferences),
    ) => {
      setPreferences((current) => {
        const resolvedNext = typeof next === "function" ? next(current) : next;
        return mergeNotificationPreferences(current, resolvedNext);
      });
    },
    [],
  );

  const value = useMemo<NotificationCenterContextValue>(
    () => ({
      mode,
      status,
      ...(errorMessage ? { errorMessage } : {}),
      notifications,
      preferences,
      addNotification,
      markAsRead,
      markAsUnread,
      markAllRead,
      updatePreferences,
      reloadFromStorage: loadSnapshot,
      supportsWebhookTestPing: false,
      webhookTestPingReason: "Webhook test ping is deferred until a remote delivery endpoint is available.",
    }),
    [
      addNotification,
      errorMessage,
      loadSnapshot,
      markAllRead,
      markAsRead,
      markAsUnread,
      mode,
      notifications,
      preferences,
      status,
      updatePreferences,
    ],
  );

  return <NotificationCenterContext.Provider value={value}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter(): NotificationCenterContextValue {
  return useContext(NotificationCenterContext);
}
