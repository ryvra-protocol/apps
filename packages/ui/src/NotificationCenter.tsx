"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { themeTokens } from "./theme";

export const notificationCategories = ["claims", "payouts", "tasks", "system"] as const;
export type NotificationCategory = (typeof notificationCategories)[number];
export type NotificationCategoryFilter = NotificationCategory | "all";
export type NotificationSeverity = "info" | "success" | "warn" | "error";
export type NotificationSortOrder = "newest" | "oldest";
export type NotificationDeliveryMode = "local-preview" | "remote";

export interface NotificationReferenceInput {
  label: string;
  value?: string | null;
}

export interface NotificationReference {
  label: string;
  snippet: string;
}

export interface NotificationDraft {
  eventKey: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp?: string;
  routeHref?: string;
  routeLabel?: string;
  references?: NotificationReferenceInput[];
  read?: boolean;
}

export interface NotificationRecord {
  id: string;
  eventKey: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: string;
  routeHref?: string;
  routeLabel?: string;
  references: NotificationReference[];
  read: boolean;
}

export interface NotificationCategoryPreferences {
  claims: boolean;
  payouts: boolean;
  tasks: boolean;
  system: boolean;
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    categories: NotificationCategoryPreferences;
  };
  webhook: {
    enabled: boolean;
    endpointUrl: string;
    categories: NotificationCategoryPreferences;
  };
  updatedAt: string;
}

export interface ClaimLifecycleNotificationInput {
  stage: "submitted" | "processing" | "completed" | "failed";
  eventKey: string;
  retryable?: boolean;
  routeHref?: string;
  references?: NotificationReferenceInput[];
  timestamp?: string;
}

export interface PayoutStatusNotificationInput {
  payoutId: string;
  status: string;
  eventKey: string;
  routeHref?: string;
  retryable?: boolean;
  timestamp?: string;
}

export interface TaskStatusNotificationInput {
  taskId: string;
  status: string;
  progressState?: string | null;
  progressPercent?: number | null;
  eventKey: string;
  routeHref?: string;
  timestamp?: string;
}

const NOTIFICATION_STORAGE_PREFIX = "ryvra.notifications.v1";
const PREFERENCES_STORAGE_PREFIX = "ryvra.notification-prefs.v1";
const DEFAULT_SCOPE_KEY = "workspace-default";
const MAX_STORED_NOTIFICATIONS = 300;
const SENSITIVE_REFERENCE_LABEL_PATTERN = /(token|secret|password|authorization|api[-_ ]?key)/i;

const categoryLabels: Record<NotificationCategoryFilter, string> = {
  all: "All",
  claims: "Claims",
  payouts: "Payouts",
  tasks: "Tasks",
  system: "System",
};

const severityLabels: Record<NotificationSeverity, string> = {
  info: "Info",
  success: "Success",
  warn: "Warning",
  error: "Error",
};

function createDefaultCategoryPreferences(): NotificationCategoryPreferences {
  return {
    claims: true,
    payouts: true,
    tasks: true,
    system: true,
  };
}

export function createDefaultNotificationPreferences(): NotificationPreferences {
  return {
    email: {
      enabled: false,
      categories: createDefaultCategoryPreferences(),
    },
    webhook: {
      enabled: false,
      endpointUrl: "",
      categories: createDefaultCategoryPreferences(),
    },
    updatedAt: new Date(0).toISOString(),
  };
}

function makeNotificationStorageKey(appId: string, scopeKey: string): string {
  return `${NOTIFICATION_STORAGE_PREFIX}:${appId}:${scopeKey}`;
}

function makePreferencesStorageKey(appId: string, scopeKey: string): string {
  return `${PREFERENCES_STORAGE_PREFIX}:${appId}:${scopeKey}`;
}

function resolveScopeKeyFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  const accountId = params.get("account_id") ?? params.get("accountId");
  const workspaceId = params.get("workspace_id") ?? params.get("workspaceId");
  const userId = params.get("user_id") ?? params.get("userId");

  const scope = [
    accountId ? `account:${accountId}` : null,
    workspaceId ? `workspace:${workspaceId}` : null,
    userId ? `user:${userId}` : null,
  ]
    .filter(Boolean)
    .join("|");

  return scope.length > 0 ? scope : DEFAULT_SCOPE_KEY;
}

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeNotificationTimestamp(timestamp: string | undefined): string {
  const candidate = timestamp?.trim();
  if (!candidate) {
    return new Date().toISOString();
  }

  const parsed = Date.parse(candidate);
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }

  return new Date(parsed).toISOString();
}

function normalizeNotificationCategory(value: unknown): NotificationCategory {
  if (value === "claims" || value === "payouts" || value === "tasks" || value === "system") {
    return value;
  }

  return "system";
}

function normalizeNotificationSeverity(value: unknown): NotificationSeverity {
  if (value === "info" || value === "success" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toSafeReferenceSnippet(label: string, value?: string | null): string {
  if (!value || value.trim().length === 0) {
    return "unavailable";
  }

  if (SENSITIVE_REFERENCE_LABEL_PATTERN.test(label)) {
    return "redacted";
  }

  const compact = value.trim();
  if (compact.length <= 8) {
    return compact;
  }

  return `${compact.slice(0, 4)}…${compact.slice(-4)}`;
}

function sanitizeReferences(references: NotificationReferenceInput[] | undefined): NotificationReference[] {
  if (!references || references.length === 0) {
    return [];
  }

  return references.map((reference) => ({
    label: reference.label,
    snippet: toSafeReferenceSnippet(reference.label, reference.value),
  }));
}

function makeNotificationRecord(draft: NotificationDraft): NotificationRecord {
  const timestamp = normalizeNotificationTimestamp(draft.timestamp);
  return {
    id: `${draft.eventKey}:${timestamp}`,
    eventKey: draft.eventKey,
    category: draft.category,
    severity: draft.severity,
    title: draft.title.trim(),
    message: draft.message.trim(),
    timestamp,
    ...(draft.routeHref ? { routeHref: draft.routeHref } : {}),
    ...(draft.routeLabel ? { routeLabel: draft.routeLabel } : {}),
    references: sanitizeReferences(draft.references),
    read: Boolean(draft.read),
  };
}

function isRecordShape(value: unknown): value is NotificationRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<NotificationRecord>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.eventKey === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.timestamp === "string" &&
    typeof candidate.read === "boolean"
  );
}

function parseNotificationRecords(rawValue: string | null): NotificationRecord[] {
  if (!rawValue) {
    return [];
  }

  const parsed = JSON.parse(rawValue) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter(isRecordShape)
    .map((entry) =>
      makeNotificationRecord({
        eventKey: entry.eventKey,
        category: normalizeNotificationCategory(entry.category),
        severity: normalizeNotificationSeverity(entry.severity),
        title: entry.title,
        message: entry.message,
        timestamp: entry.timestamp,
        ...(entry.routeHref ? { routeHref: entry.routeHref } : {}),
        ...(entry.routeLabel ? { routeLabel: entry.routeLabel } : {}),
        references: (entry.references ?? []).map((reference) => ({
          label: reference.label,
          value: reference.snippet,
        })),
        read: entry.read,
      }),
    );
}

function parsePreferenceCategories(value: unknown): NotificationCategoryPreferences {
  if (typeof value !== "object" || value === null) {
    return createDefaultCategoryPreferences();
  }

  const candidate = value as Partial<NotificationCategoryPreferences>;
  return {
    claims: normalizeBoolean(candidate.claims, true),
    payouts: normalizeBoolean(candidate.payouts, true),
    tasks: normalizeBoolean(candidate.tasks, true),
    system: normalizeBoolean(candidate.system, true),
  };
}

function parseNotificationPreferences(rawValue: string | null): NotificationPreferences {
  if (!rawValue) {
    return createDefaultNotificationPreferences();
  }

  const parsed = JSON.parse(rawValue) as unknown;
  if (typeof parsed !== "object" || parsed === null) {
    return createDefaultNotificationPreferences();
  }

  const candidate = parsed as Partial<NotificationPreferences>;

  return {
    email: {
      enabled: normalizeBoolean(candidate.email?.enabled, false),
      categories: parsePreferenceCategories(candidate.email?.categories),
    },
    webhook: {
      enabled: normalizeBoolean(candidate.webhook?.enabled, false),
      endpointUrl: typeof candidate.webhook?.endpointUrl === "string" ? candidate.webhook.endpointUrl : "",
      categories: parsePreferenceCategories(candidate.webhook?.categories),
    },
    updatedAt: normalizeNotificationTimestamp(candidate.updatedAt),
  };
}

export function toggleNotificationCenterOpen(isOpen: boolean): boolean {
  return !isOpen;
}

export function getNotificationUnreadCount(notifications: readonly NotificationRecord[]): number {
  return notifications.reduce((count, notification) => count + (notification.read ? 0 : 1), 0);
}

function compareNotifications(left: NotificationRecord, right: NotificationRecord, sortOrder: NotificationSortOrder): number {
  if (left.timestamp !== right.timestamp) {
    if (sortOrder === "newest") {
      return left.timestamp < right.timestamp ? 1 : -1;
    }

    return left.timestamp > right.timestamp ? 1 : -1;
  }

  return left.id > right.id ? 1 : -1;
}

export function sortNotifications(
  notifications: readonly NotificationRecord[],
  sortOrder: NotificationSortOrder = "newest",
): NotificationRecord[] {
  return [...notifications].sort((left, right) => compareNotifications(left, right, sortOrder));
}

export function filterNotificationsByCategory(
  notifications: readonly NotificationRecord[],
  category: NotificationCategoryFilter,
): NotificationRecord[] {
  if (category === "all") {
    return [...notifications];
  }

  return notifications.filter((notification) => notification.category === category);
}

export function resolveNotificationList(
  notifications: readonly NotificationRecord[],
  category: NotificationCategoryFilter,
  sortOrder: NotificationSortOrder,
): NotificationRecord[] {
  return sortNotifications(filterNotificationsByCategory(notifications, category), sortOrder);
}

export function setNotificationReadState(
  notifications: readonly NotificationRecord[],
  notificationId: string,
  read: boolean,
): NotificationRecord[] {
  return notifications.map((notification) =>
    notification.id === notificationId ? { ...notification, read } : notification,
  );
}

export function validateWebhookUrl(url: string): string | null {
  if (url.trim().length === 0) {
    return "Webhook endpoint URL is required when webhook delivery is enabled.";
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "Webhook URL must begin with https:// or http://.";
    }
    return null;
  } catch {
    return "Enter a valid webhook URL.";
  }
}

export function resolveFeedModeLabel(mode: NotificationDeliveryMode): string {
  return mode === "remote" ? "Remote feed active" : "Local preview feed";
}

export function resolvePreferenceModeLabel(mode: NotificationDeliveryMode): string {
  return mode === "remote" ? "Remote preference persistence" : "Local preview settings";
}

function resolveClaimFailureGuidance(retryable: boolean): string {
  return retryable
    ? "Claim failed. Retry only when the operation guidance confirms it is safe."
    : "Claim failed. Review operation details before starting a new attempt.";
}

export function mapClaimLifecycleNotification(input: ClaimLifecycleNotificationInput): NotificationDraft {
  const references = input.references && input.references.length > 0 ? { references: input.references } : {};

  if (input.stage === "submitted") {
    return {
      eventKey: input.eventKey,
      category: "claims",
      severity: "info",
      title: "Claim submitted",
      message: "Your claim was submitted and queued.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open claim context",
      ...references,
    };
  }

  if (input.stage === "processing") {
    return {
      eventKey: input.eventKey,
      category: "claims",
      severity: "info",
      title: "Claim processing",
      message: "Claim processing has started.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open claim context",
      ...references,
    };
  }

  if (input.stage === "completed") {
    return {
      eventKey: input.eventKey,
      category: "claims",
      severity: "success",
      title: "Claim completed",
      message: "Claim processing completed successfully.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open claim context",
      ...references,
    };
  }

  return {
    eventKey: input.eventKey,
    category: "claims",
    severity: input.retryable ? "warn" : "error",
    title: "Claim failed",
    message: resolveClaimFailureGuidance(Boolean(input.retryable)),
    ...(input.timestamp ? { timestamp: input.timestamp } : {}),
    ...(input.routeHref ? { routeHref: input.routeHref } : {}),
    routeLabel: "Open claim context",
    ...references,
  };
}

export function mapPayoutStatusNotification(input: PayoutStatusNotificationInput): NotificationDraft | null {
  const normalizedStatus = input.status.trim().toUpperCase();
  const references: NotificationReferenceInput[] = [{ label: "Payout", value: input.payoutId }];

  if (normalizedStatus === "SCHEDULED") {
    return {
      eventKey: input.eventKey,
      category: "payouts",
      severity: "info",
      title: "Payout queued",
      message: "A payout was created and queued for processing.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open payout context",
      references,
    };
  }

  if (normalizedStatus === "PROCESSING") {
    return {
      eventKey: input.eventKey,
      category: "payouts",
      severity: "info",
      title: "Payout processing",
      message: "Payout processing is in progress.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open payout context",
      references,
    };
  }

  if (normalizedStatus === "COMPLETED") {
    return {
      eventKey: input.eventKey,
      category: "payouts",
      severity: "success",
      title: "Payout completed",
      message: "Payout processing completed successfully.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open payout context",
      references,
    };
  }

  if (normalizedStatus === "FAILED") {
    return {
      eventKey: input.eventKey,
      category: "payouts",
      severity: input.retryable ? "warn" : "error",
      title: "Payout failed",
      message: input.retryable
        ? "Payout failed. Retry only when operation guidance confirms it is safe."
        : "Payout failed. Review the payout details before retrying.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open payout context",
      references,
    };
  }

  return null;
}

export function mapTaskStatusNotification(input: TaskStatusNotificationInput): NotificationDraft | null {
  const normalizedStatus = input.status.trim().toLowerCase();
  const normalizedProgress = input.progressState?.trim().toLowerCase() ?? "";
  const references: NotificationReferenceInput[] = [{ label: "Task", value: input.taskId }];

  if (normalizedStatus === "eligible" || normalizedStatus === "not_started") {
    return {
      eventKey: input.eventKey,
      category: "tasks",
      severity: "info",
      title: "Task assigned",
      message: "Task is eligible and ready to start.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open task context",
      references,
    };
  }

  if (normalizedStatus === "in_progress" || normalizedProgress === "active" || normalizedProgress === "under_review") {
    const progressSuffix =
      typeof input.progressPercent === "number" && Number.isFinite(input.progressPercent)
        ? ` (${Math.round(input.progressPercent)}% complete)`
        : "";
    return {
      eventKey: input.eventKey,
      category: "tasks",
      severity: "info",
      title: "Task update",
      message: `Task is in progress${progressSuffix}.`,
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open task context",
      references,
    };
  }

  if (normalizedStatus === "completed" || normalizedProgress === "done") {
    return {
      eventKey: input.eventKey,
      category: "tasks",
      severity: "success",
      title: "Task completed",
      message: "Task completed and reward is ready for claim review.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open task context",
      references,
    };
  }

  if (normalizedStatus === "failed" || normalizedStatus === "expired" || normalizedStatus === "canceled") {
    return {
      eventKey: input.eventKey,
      category: "tasks",
      severity: "warn",
      title: "Task closed with issue",
      message: "Task closed before completion. Check task details for retry eligibility.",
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.routeHref ? { routeHref: input.routeHref } : {}),
      routeLabel: "Open task context",
      references,
    };
  }

  return null;
}

function formatTimestamp(timestampIso: string): string {
  const parsed = Date.parse(timestampIso);
  if (Number.isNaN(parsed)) {
    return timestampIso;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

interface NotificationCenterContextValue {
  feedMode: NotificationDeliveryMode;
  preferenceMode: NotificationDeliveryMode;
  notifications: NotificationRecord[];
  unreadCount: number;
  list: NotificationRecord[];
  category: NotificationCategoryFilter;
  sortOrder: NotificationSortOrder;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreferences;
  preferencesLoading: boolean;
  preferencesError: string | null;
  webhookUrlError: string | null;
  panelOpen: boolean;
  addNotification: (draft: NotificationDraft) => void;
  markNotificationRead: (notificationId: string) => void;
  markNotificationUnread: (notificationId: string) => void;
  markAllRead: () => void;
  setCategory: (category: NotificationCategoryFilter) => void;
  setSortOrder: (order: NotificationSortOrder) => void;
  setPanelOpen: (open: boolean) => void;
  setEmailEnabled: (enabled: boolean) => void;
  setEmailCategoryEnabled: (category: NotificationCategory, enabled: boolean) => void;
  setWebhookEnabled: (enabled: boolean) => void;
  setWebhookEndpointUrl: (url: string) => void;
  setWebhookCategoryEnabled: (category: NotificationCategory, enabled: boolean) => void;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | null>(null);

function updatePreferencesTimestamp(preferences: NotificationPreferences): NotificationPreferences {
  return {
    ...preferences,
    updatedAt: new Date().toISOString(),
  };
}

export function setEmailPreferenceEnabled(
  preferences: NotificationPreferences,
  enabled: boolean,
): NotificationPreferences {
  return updatePreferencesTimestamp({
    ...preferences,
    email: {
      ...preferences.email,
      enabled,
    },
  });
}

export function setEmailCategoryPreference(
  preferences: NotificationPreferences,
  category: NotificationCategory,
  enabled: boolean,
): NotificationPreferences {
  return updatePreferencesTimestamp({
    ...preferences,
    email: {
      ...preferences.email,
      categories: {
        ...preferences.email.categories,
        [category]: enabled,
      },
    },
  });
}

export function setWebhookPreferenceEnabled(
  preferences: NotificationPreferences,
  enabled: boolean,
): NotificationPreferences {
  return updatePreferencesTimestamp({
    ...preferences,
    webhook: {
      ...preferences.webhook,
      enabled,
    },
  });
}

export function setWebhookEndpointPreference(
  preferences: NotificationPreferences,
  endpointUrl: string,
): NotificationPreferences {
  return updatePreferencesTimestamp({
    ...preferences,
    webhook: {
      ...preferences.webhook,
      endpointUrl,
    },
  });
}

export function setWebhookCategoryPreference(
  preferences: NotificationPreferences,
  category: NotificationCategory,
  enabled: boolean,
): NotificationPreferences {
  return updatePreferencesTimestamp({
    ...preferences,
    webhook: {
      ...preferences.webhook,
      categories: {
        ...preferences.webhook.categories,
        [category]: enabled,
      },
    },
  });
}

interface NotificationCenterProviderProps {
  appId: string;
  scopeKey?: string;
  feedMode?: NotificationDeliveryMode;
  preferenceMode?: NotificationDeliveryMode;
  children: ReactNode;
  initialNotifications?: NotificationRecord[];
  initialPreferences?: NotificationPreferences;
  initialPanelOpen?: boolean;
  initialFeedLoading?: boolean;
  initialFeedError?: string | null;
  disableStorage?: boolean;
}

export function NotificationCenterProvider({
  appId,
  scopeKey,
  feedMode = "local-preview",
  preferenceMode = "local-preview",
  children,
  initialNotifications,
  initialPreferences,
  initialPanelOpen,
  initialFeedLoading,
  initialFeedError,
  disableStorage = false,
}: NotificationCenterProviderProps) {
  const activeScopeKey =
    scopeKey?.trim() || (typeof window !== "undefined" ? resolveScopeKeyFromSearch(window.location.search) : DEFAULT_SCOPE_KEY);
  const notificationStorageKey = useMemo(
    () => makeNotificationStorageKey(appId, activeScopeKey),
    [activeScopeKey, appId],
  );
  const preferenceStorageKey = useMemo(
    () => makePreferencesStorageKey(appId, activeScopeKey),
    [activeScopeKey, appId],
  );

  const [notifications, setNotifications] = useState<NotificationRecord[]>(initialNotifications ?? []);
  const [loading, setLoading] = useState(initialFeedLoading ?? feedMode === "local-preview");
  const [error, setError] = useState<string | null>(initialFeedError ?? null);
  const [category, setCategory] = useState<NotificationCategoryFilter>("all");
  const [sortOrder, setSortOrder] = useState<NotificationSortOrder>("newest");
  const [panelOpen, setPanelOpen] = useState(Boolean(initialPanelOpen));

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    initialPreferences ?? createDefaultNotificationPreferences(),
  );
  const [preferencesLoading, setPreferencesLoading] = useState(preferenceMode === "local-preview");
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [storageHydrated, setStorageHydrated] = useState(false);

  useEffect(() => {
    if (feedMode !== "local-preview" || disableStorage) {
      setLoading(false);
      setError(null);
      setStorageHydrated(true);
      return;
    }

    const storage = safeLocalStorage();
    if (!storage) {
      setLoading(false);
      setError("Notification preview storage is unavailable in this environment.");
      setStorageHydrated(true);
      return;
    }

    try {
      setNotifications(parseNotificationRecords(storage.getItem(notificationStorageKey)));
      setError(null);
    } catch {
      setError("Unable to load local preview notifications.");
      setNotifications([]);
    } finally {
      setLoading(false);
      setStorageHydrated(true);
    }
  }, [disableStorage, feedMode, notificationStorageKey]);

  useEffect(() => {
    if (preferenceMode !== "local-preview" || disableStorage) {
      setPreferencesLoading(false);
      setPreferencesError(null);
      return;
    }

    const storage = safeLocalStorage();
    if (!storage) {
      setPreferencesLoading(false);
      setPreferencesError("Preference preview storage is unavailable in this environment.");
      return;
    }

    try {
      setPreferences(parseNotificationPreferences(storage.getItem(preferenceStorageKey)));
      setPreferencesError(null);
    } catch {
      setPreferencesError("Unable to load local preview preference settings.");
      setPreferences(createDefaultNotificationPreferences());
    } finally {
      setPreferencesLoading(false);
    }
  }, [disableStorage, preferenceMode, preferenceStorageKey]);

  useEffect(() => {
    if (!storageHydrated || feedMode !== "local-preview") {
      return;
    }

    const systemEventKey = `system:local-preview:${activeScopeKey}`;
    setNotifications((current) => {
      if (current.some((item) => item.eventKey === systemEventKey)) {
        return current;
      }

      const next = [
        makeNotificationRecord({
          eventKey: systemEventKey,
          category: "system",
          severity: "info",
          title: "Notification preview mode",
          message: "Notifications are stored locally on this device until remote feed wiring is available.",
          routeHref: "/status",
          routeLabel: "Open status diagnostics",
        }),
        ...current,
      ];

      return sortNotifications(next, "newest").slice(0, MAX_STORED_NOTIFICATIONS);
    });
  }, [activeScopeKey, feedMode, storageHydrated]);

  useEffect(() => {
    if (feedMode !== "local-preview" || disableStorage || !storageHydrated) {
      return;
    }

    const storage = safeLocalStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(notificationStorageKey, JSON.stringify(notifications));
    } catch {
      // ignore storage write failures (private mode/storage quotas)
    }
  }, [disableStorage, feedMode, notificationStorageKey, notifications, storageHydrated]);

  useEffect(() => {
    if (preferenceMode !== "local-preview" || disableStorage) {
      return;
    }

    const storage = safeLocalStorage();
    if (!storage) {
      return;
    }

    try {
      storage.setItem(preferenceStorageKey, JSON.stringify(preferences));
    } catch {
      // ignore storage write failures (private mode/storage quotas)
    }
  }, [disableStorage, preferenceMode, preferenceStorageKey, preferences]);

  const addNotification = useCallback((draft: NotificationDraft) => {
    setNotifications((current) => {
      if (current.some((notification) => notification.eventKey === draft.eventKey)) {
        return current;
      }

      const next = [makeNotificationRecord(draft), ...current];
      return sortNotifications(next, "newest").slice(0, MAX_STORED_NOTIFICATIONS);
    });
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications((current) => setNotificationReadState(current, notificationId, true));
  }, []);

  const markNotificationUnread = useCallback((notificationId: string) => {
    setNotifications((current) => setNotificationReadState(current, notificationId, false));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }, []);

  const list = useMemo(
    () => resolveNotificationList(notifications, category, sortOrder),
    [category, notifications, sortOrder],
  );
  const unreadCount = useMemo(() => getNotificationUnreadCount(notifications), [notifications]);

  const webhookUrlError = useMemo(() => {
    if (!preferences.webhook.enabled) {
      return null;
    }

    return validateWebhookUrl(preferences.webhook.endpointUrl);
  }, [preferences.webhook.enabled, preferences.webhook.endpointUrl]);

  const setEmailEnabled = useCallback((enabled: boolean) => {
    setPreferences((current) => setEmailPreferenceEnabled(current, enabled));
  }, []);

  const setEmailCategoryEnabled = useCallback((categoryName: NotificationCategory, enabled: boolean) => {
    setPreferences((current) => setEmailCategoryPreference(current, categoryName, enabled));
  }, []);

  const setWebhookEnabled = useCallback((enabled: boolean) => {
    setPreferences((current) => setWebhookPreferenceEnabled(current, enabled));
  }, []);

  const setWebhookEndpointUrl = useCallback((url: string) => {
    setPreferences((current) => setWebhookEndpointPreference(current, url));
  }, []);

  const setWebhookCategoryEnabled = useCallback((categoryName: NotificationCategory, enabled: boolean) => {
    setPreferences((current) => setWebhookCategoryPreference(current, categoryName, enabled));
  }, []);

  const contextValue = useMemo<NotificationCenterContextValue>(
    () => ({
      feedMode,
      preferenceMode,
      notifications,
      unreadCount,
      list,
      category,
      sortOrder,
      loading,
      error,
      preferences,
      preferencesLoading,
      preferencesError,
      webhookUrlError,
      panelOpen,
      addNotification,
      markNotificationRead,
      markNotificationUnread,
      markAllRead,
      setCategory,
      setSortOrder,
      setPanelOpen,
      setEmailEnabled,
      setEmailCategoryEnabled,
      setWebhookEnabled,
      setWebhookEndpointUrl,
      setWebhookCategoryEnabled,
    }),
    [
      addNotification,
      category,
      error,
      feedMode,
      list,
      loading,
      markAllRead,
      markNotificationRead,
      markNotificationUnread,
      notifications,
      panelOpen,
      preferenceMode,
      preferences,
      preferencesError,
      preferencesLoading,
      setEmailCategoryEnabled,
      setEmailEnabled,
      setWebhookCategoryEnabled,
      setWebhookEnabled,
      setWebhookEndpointUrl,
      sortOrder,
      unreadCount,
      webhookUrlError,
    ],
  );

  return <NotificationCenterContext.Provider value={contextValue}>{children}</NotificationCenterContext.Provider>;
}

export function useNotificationCenter(): NotificationCenterContextValue {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error("useNotificationCenter must be used within NotificationCenterProvider");
  }

  return context;
}

function NotificationFilters() {
  const { category, setCategory, sortOrder, setSortOrder, markAllRead, unreadCount } = useNotificationCenter();
  return (
    <div className="ryvra-notification-filters">
      <div className="ryvra-notification-tab-row" role="tablist" aria-label="Notification categories">
        {(["all", ...notificationCategories] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={category === entry}
            className={`ryvra-notification-tab ${category === entry ? "ryvra-notification-tab--active" : ""}`}
            onClick={() => setCategory(entry)}
          >
            {categoryLabels[entry]}
          </button>
        ))}
      </div>
      <div className="ryvra-notification-filter-actions">
        <label className="ryvra-notification-select-label">
          <span>Sort</span>
          <select
            className="ryvra-notification-select"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.currentTarget.value === "oldest" ? "oldest" : "newest")}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <button
          type="button"
          className="ryvra-notification-link-button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          aria-describedby={unreadCount === 0 ? "ryvra-notification-mark-all-hint" : undefined}
        >
          Mark all read
        </button>
      </div>
      {unreadCount === 0 ? (
        <p id="ryvra-notification-mark-all-hint" className="ryvra-notification-hint">
          All notifications are already read.
        </p>
      ) : null}
    </div>
  );
}

function NotificationList() {
  const { list, loading, error, markNotificationRead, markNotificationUnread } = useNotificationCenter();

  if (loading) {
    return (
      <div className="ryvra-notification-state" role="status" aria-live="polite">
        Loading notifications…
      </div>
    );
  }

  if (error) {
    return (
      <div className="ryvra-notification-state ryvra-notification-state--error" role="alert">
        {error}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="ryvra-notification-state" role="status" aria-live="polite">
        No notifications match the selected category.
      </div>
    );
  }

  return (
    <ul className="ryvra-notification-list">
      {list.map((notification) => (
        <li
          key={notification.id}
          className={`ryvra-notification-item ${notification.read ? "ryvra-notification-item--read" : "ryvra-notification-item--unread"}`}
        >
          <div className="ryvra-notification-item-meta">
            <span className={`ryvra-notification-severity ryvra-notification-severity--${notification.severity}`}>
              {severityLabels[notification.severity]}
            </span>
            <time dateTime={notification.timestamp}>{formatTimestamp(notification.timestamp)}</time>
          </div>
          <p className="ryvra-notification-item-title">{notification.title}</p>
          <p className="ryvra-notification-item-message">{notification.message}</p>

          {notification.references.length > 0 ? (
            <ul className="ryvra-notification-reference-list">
              {notification.references.map((reference) => (
                <li key={`${notification.id}:${reference.label}`}>
                  <span>{reference.label}</span>
                  <strong>{reference.snippet}</strong>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="ryvra-notification-item-actions">
            <button
              type="button"
              className="ryvra-notification-link-button"
              onClick={() => (notification.read ? markNotificationUnread(notification.id) : markNotificationRead(notification.id))}
            >
              {notification.read ? "Mark unread" : "Mark read"}
            </button>
            {notification.routeHref ? (
              <a className="ryvra-notification-action-link" href={notification.routeHref}>
                {notification.routeLabel ?? "Open context"}
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PreferencesPanel() {
  const {
    preferenceMode,
    preferences,
    preferencesLoading,
    preferencesError,
    webhookUrlError,
    setEmailEnabled,
    setEmailCategoryEnabled,
    setWebhookEnabled,
    setWebhookEndpointUrl,
    setWebhookCategoryEnabled,
  } = useNotificationCenter();

  if (preferencesLoading) {
    return (
      <div className="ryvra-notification-state" role="status" aria-live="polite">
        Loading preference settings…
      </div>
    );
  }

  if (preferencesError) {
    return (
      <div className="ryvra-notification-state ryvra-notification-state--error" role="alert">
        {preferencesError}
      </div>
    );
  }

  return (
    <div className="ryvra-notification-preferences">
      <p className="ryvra-notification-mode-label">
        Preference mode: <strong>{resolvePreferenceModeLabel(preferenceMode)}</strong>
      </p>

      <section className="ryvra-notification-preference-section" aria-labelledby="ryvra-email-preferences-title">
        <h4 id="ryvra-email-preferences-title">Email preferences</h4>
        <label className="ryvra-notification-checkbox-row">
          <input type="checkbox" checked={preferences.email.enabled} onChange={(event) => setEmailEnabled(event.currentTarget.checked)} />
          <span>Enable email notifications</span>
        </label>
        <fieldset disabled={!preferences.email.enabled} className="ryvra-notification-category-fieldset">
          <legend>Email categories</legend>
          {notificationCategories.map((category) => (
            <label key={`email-${category}`} className="ryvra-notification-checkbox-row">
              <input
                type="checkbox"
                checked={preferences.email.categories[category]}
                onChange={(event) => setEmailCategoryEnabled(category, event.currentTarget.checked)}
              />
              <span>{categoryLabels[category]}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="ryvra-notification-preference-section" aria-labelledby="ryvra-webhook-preferences-title">
        <h4 id="ryvra-webhook-preferences-title">Webhook preferences</h4>
        <label className="ryvra-notification-checkbox-row">
          <input type="checkbox" checked={preferences.webhook.enabled} onChange={(event) => setWebhookEnabled(event.currentTarget.checked)} />
          <span>Enable webhook notifications</span>
        </label>

        <label className="ryvra-notification-input-label">
          <span>Webhook endpoint URL</span>
          <input
            type="url"
            value={preferences.webhook.endpointUrl}
            onChange={(event) => setWebhookEndpointUrl(event.currentTarget.value)}
            className="ryvra-notification-input"
            placeholder="https://example.com/hooks/ryvra"
            aria-invalid={webhookUrlError ? "true" : "false"}
            aria-describedby="ryvra-webhook-url-help ryvra-webhook-ping-hint"
          />
        </label>
        <p id="ryvra-webhook-url-help" className="ryvra-notification-hint">
          Enter an HTTP(S) endpoint to receive webhook preview payloads.
        </p>
        {webhookUrlError ? (
          <p className="ryvra-notification-inline-error" role="alert">
            {webhookUrlError}
          </p>
        ) : null}

        <fieldset disabled={!preferences.webhook.enabled} className="ryvra-notification-category-fieldset">
          <legend>Webhook categories</legend>
          {notificationCategories.map((category) => (
            <label key={`webhook-${category}`} className="ryvra-notification-checkbox-row">
              <input
                type="checkbox"
                checked={preferences.webhook.categories[category]}
                onChange={(event) => setWebhookCategoryEnabled(category, event.currentTarget.checked)}
              />
              <span>{categoryLabels[category]}</span>
            </label>
          ))}
        </fieldset>

        <button type="button" className="ryvra-notification-link-button" disabled aria-describedby="ryvra-webhook-ping-hint">
          Send test ping
        </button>
        <p id="ryvra-webhook-ping-hint" className="ryvra-notification-hint">
          Test ping is disabled because remote webhook execution is not yet wired.
        </p>
      </section>

      <p className="ryvra-notification-mode-label">
        {preferenceMode === "local-preview"
          ? "Preferences are stored as local preview settings on this device only."
          : "Preferences are persisted to remote delivery settings."}
      </p>
    </div>
  );
}

export function NotificationCenterControl() {
  const { panelOpen, setPanelOpen, unreadCount, feedMode } = useNotificationCenter();
  const [view, setView] = useState<"notifications" | "preferences">("notifications");
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const viewTabRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!panelOpen) {
      if (wasOpenRef.current) {
        triggerRef.current?.focus();
      }
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    viewTabRef.current?.focus();

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [panelOpen, setPanelOpen]);

  return (
    <div className="ryvra-notification-root">
      <style>{`
        .ryvra-notification-root {
          position: relative;
        }

        .ryvra-notification-trigger {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: ${themeTokens.radius.md};
          border: 1px solid ${themeTokens.color.border};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
          cursor: pointer;
          transition: background-color ${themeTokens.motion.standard} ease, border-color ${themeTokens.motion.standard} ease, transform ${themeTokens.motion.fast} ease;
        }

        .ryvra-notification-trigger:hover {
          background: ${themeTokens.color.surfaceStrong};
          border-color: ${themeTokens.color.borderStrong};
        }

        .ryvra-notification-trigger:active {
          transform: translateY(1px);
        }

        .ryvra-notification-trigger:focus-visible,
        .ryvra-notification-close:focus-visible,
        .ryvra-notification-tab:focus-visible,
        .ryvra-notification-link-button:focus-visible,
        .ryvra-notification-action-link:focus-visible,
        .ryvra-notification-input:focus-visible,
        .ryvra-notification-select:focus-visible,
        .ryvra-notification-checkbox-row input:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }

        .ryvra-notification-badge {
          position: absolute;
          top: -0.2rem;
          right: -0.25rem;
          min-width: 1.25rem;
          min-height: 1.25rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: ${themeTokens.radius.pill};
          border: 1px solid ${themeTokens.color.surface};
          background: ${themeTokens.color.primary};
          color: ${themeTokens.color.textInverse};
          font-size: ${themeTokens.typography.size.xs};
          font-weight: ${themeTokens.typography.weight.bold};
          padding: 0 ${themeTokens.spacing.xs};
          line-height: 1;
        }

        .ryvra-notification-panel {
          position: absolute;
          right: 0;
          margin-top: ${themeTokens.spacing.sm};
          width: min(38rem, calc(100vw - 2rem));
          max-height: min(85vh, 42rem);
          overflow: auto;
          border-radius: ${themeTokens.radius.lg};
          border: 1px solid ${themeTokens.color.borderStrong};
          background: ${themeTokens.color.surface};
          box-shadow: ${themeTokens.shadow.lg};
          z-index: 70;
          padding: ${themeTokens.spacing.lg};
          display: grid;
          gap: ${themeTokens.spacing.md};
        }

        .ryvra-notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${themeTokens.spacing.sm};
        }

        .ryvra-notification-title {
          margin: 0;
          font-size: ${themeTokens.typography.size.lg};
        }

        .ryvra-notification-close {
          border: 1px solid ${themeTokens.color.border};
          background: ${themeTokens.color.surfaceMuted};
          color: ${themeTokens.color.text};
          border-radius: ${themeTokens.radius.md};
          min-width: 2rem;
          min-height: 2rem;
          cursor: pointer;
        }

        .ryvra-notification-mode-label {
          margin: 0;
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-notification-tab-row {
          display: flex;
          flex-wrap: wrap;
          gap: ${themeTokens.spacing.xs};
        }

        .ryvra-notification-tab {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
          padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
          font-size: ${themeTokens.typography.size.sm};
          cursor: pointer;
        }

        .ryvra-notification-tab--active {
          background: ${themeTokens.color.surfaceStrong};
          border-color: ${themeTokens.color.primary};
          color: ${themeTokens.color.primaryActive};
          font-weight: ${themeTokens.typography.weight.semibold};
        }

        .ryvra-notification-filters {
          display: grid;
          gap: ${themeTokens.spacing.sm};
        }

        .ryvra-notification-filter-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${themeTokens.spacing.md};
          flex-wrap: wrap;
        }

        .ryvra-notification-select-label,
        .ryvra-notification-input-label {
          display: grid;
          gap: ${themeTokens.spacing.xs};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-notification-select,
        .ryvra-notification-input {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
        }

        .ryvra-notification-link-button {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
          padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
          font-size: ${themeTokens.typography.size.sm};
          cursor: pointer;
        }

        .ryvra-notification-link-button:disabled {
          cursor: not-allowed;
          background: ${themeTokens.color.disabledBackground};
          color: ${themeTokens.color.disabledText};
        }

        .ryvra-notification-list,
        .ryvra-notification-reference-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .ryvra-notification-list {
          display: grid;
          gap: ${themeTokens.spacing.sm};
        }

        .ryvra-notification-item {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          background: ${themeTokens.color.surface};
          padding: ${themeTokens.spacing.md};
          display: grid;
          gap: ${themeTokens.spacing.xs};
        }

        .ryvra-notification-item--unread {
          border-left: 4px solid ${themeTokens.color.primary};
          background: ${themeTokens.color.surfaceStrong};
        }

        .ryvra-notification-item--read {
          border-left: 4px solid ${themeTokens.color.borderStrong};
        }

        .ryvra-notification-item-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${themeTokens.spacing.sm};
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.xs};
        }

        .ryvra-notification-item-title {
          margin: 0;
          font-weight: ${themeTokens.typography.weight.semibold};
        }

        .ryvra-notification-item-message {
          margin: 0;
          color: ${themeTokens.color.text};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-notification-reference-list {
          display: grid;
          gap: ${themeTokens.spacing.xxs};
          font-size: ${themeTokens.typography.size.xs};
        }

        .ryvra-notification-reference-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${themeTokens.spacing.sm};
          color: ${themeTokens.color.textMuted};
        }

        .ryvra-notification-item-actions {
          display: flex;
          align-items: center;
          gap: ${themeTokens.spacing.sm};
          flex-wrap: wrap;
        }

        .ryvra-notification-action-link {
          display: inline-flex;
          align-items: center;
          border-radius: ${themeTokens.radius.md};
          border: 1px solid ${themeTokens.color.primary};
          color: ${themeTokens.color.primary};
          text-decoration: none;
          padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.md};
          font-size: ${themeTokens.typography.size.sm};
          font-weight: ${themeTokens.typography.weight.medium};
        }

        .ryvra-notification-state {
          border: 1px dashed ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.md};
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-notification-state--error,
        .ryvra-notification-inline-error {
          color: ${themeTokens.color.danger};
          border-color: ${themeTokens.color.danger};
          background: ${themeTokens.color.dangerSurface};
        }

        .ryvra-notification-severity {
          border-radius: ${themeTokens.radius.pill};
          border: 1px solid ${themeTokens.color.borderStrong};
          padding: ${themeTokens.spacing.xxs} ${themeTokens.spacing.sm};
          font-weight: ${themeTokens.typography.weight.semibold};
          letter-spacing: 0.02em;
        }

        .ryvra-notification-severity--info {
          color: ${themeTokens.color.primaryActive};
          border-color: ${themeTokens.color.primary};
          background: ${themeTokens.color.surfaceStrong};
        }

        .ryvra-notification-severity--success {
          color: ${themeTokens.color.success};
          border-color: ${themeTokens.color.success};
          background: ${themeTokens.color.successSurface};
        }

        .ryvra-notification-severity--warn {
          color: ${themeTokens.color.warning};
          border-color: ${themeTokens.color.warning};
          background: ${themeTokens.color.warningSurface};
        }

        .ryvra-notification-severity--error {
          color: ${themeTokens.color.danger};
          border-color: ${themeTokens.color.danger};
          background: ${themeTokens.color.dangerSurface};
        }

        .ryvra-notification-hint {
          margin: 0;
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.xs};
        }

        .ryvra-notification-inline-error {
          margin: 0;
          border: 1px solid;
          border-radius: ${themeTokens.radius.sm};
          padding: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-notification-preferences {
          display: grid;
          gap: ${themeTokens.spacing.md};
        }

        .ryvra-notification-preference-section {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.md};
          display: grid;
          gap: ${themeTokens.spacing.sm};
          background: ${themeTokens.color.surfaceMuted};
        }

        .ryvra-notification-preference-section h4 {
          margin: 0;
          font-size: ${themeTokens.typography.size.md};
        }

        .ryvra-notification-checkbox-row {
          display: flex;
          align-items: center;
          gap: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-notification-category-fieldset {
          margin: 0;
          padding: ${themeTokens.spacing.sm};
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.sm};
          display: grid;
          gap: ${themeTokens.spacing.xs};
          background: ${themeTokens.color.surface};
        }

        .ryvra-notification-category-fieldset legend {
          padding: 0 ${themeTokens.spacing.xs};
          font-size: ${themeTokens.typography.size.xs};
          color: ${themeTokens.color.textMuted};
        }

        @media (max-width: 860px) {
          .ryvra-notification-panel {
            position: fixed;
            left: ${themeTokens.spacing.sm};
            right: ${themeTokens.spacing.sm};
            width: auto;
            top: 5.5rem;
            margin-top: 0;
          }
        }
      `}</style>
      <button
        ref={triggerRef}
        type="button"
        className="ryvra-notification-trigger"
        aria-label={unreadCount > 0 ? `Open notifications (${unreadCount} unread)` : "Open notifications"}
        aria-haspopup="dialog"
        aria-expanded={panelOpen}
        aria-controls={panelOpen ? panelId : undefined}
        onClick={() => setPanelOpen(toggleNotificationCenterOpen(panelOpen))}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M15 17h5l-1.4-1.5a2 2 0 0 1-.6-1.4V10a6 6 0 1 0-12 0v4.1a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M10 17a2 2 0 1 0 4 0" />
        </svg>
        {unreadCount > 0 ? (
          <span className="ryvra-notification-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {panelOpen ? (
        <section id={panelId} role="dialog" aria-modal="false" aria-label="Notifications and communication settings" className="ryvra-notification-panel">
          <div className="ryvra-notification-header">
            <h3 className="ryvra-notification-title">Notifications</h3>
            <button type="button" className="ryvra-notification-close" onClick={() => setPanelOpen(false)} aria-label="Close notification center">
              ×
            </button>
          </div>
          <p className="ryvra-notification-mode-label">
            Feed mode: <strong>{resolveFeedModeLabel(feedMode)}</strong>
          </p>
          <p className="ryvra-notification-mode-label">
            {feedMode === "local-preview"
              ? "Preview mode: notification history is local to this browser session scope."
              : "Connected to remote notifications feed."}
          </p>

          <div className="ryvra-notification-tab-row" role="tablist" aria-label="Notification center views">
            <button
              ref={viewTabRef}
              type="button"
              role="tab"
              aria-selected={view === "notifications"}
              className={`ryvra-notification-tab ${view === "notifications" ? "ryvra-notification-tab--active" : ""}`}
              onClick={() => setView("notifications")}
            >
              Notification center
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "preferences"}
              className={`ryvra-notification-tab ${view === "preferences" ? "ryvra-notification-tab--active" : ""}`}
              onClick={() => setView("preferences")}
            >
              Preferences
            </button>
          </div>

          {view === "notifications" ? (
            <>
              <NotificationFilters />
              <NotificationList />
            </>
          ) : (
            <PreferencesPanel />
          )}
        </section>
      ) : null}
    </div>
  );
}
