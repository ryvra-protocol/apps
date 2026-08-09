export const notificationCategories = ["claims", "payouts", "tasks", "system"] as const;

export type NotificationCategory = (typeof notificationCategories)[number];

export const notificationSeverities = ["info", "success", "warn", "error"] as const;

export type NotificationSeverity = (typeof notificationSeverities)[number];

export const notificationSortOrders = ["newest", "oldest"] as const;

export type NotificationSortOrder = (typeof notificationSortOrders)[number];

export type NotificationFilter = "all" | NotificationCategory;

export interface NotificationCategoryToggles {
  claims: boolean;
  payouts: boolean;
  tasks: boolean;
  system: boolean;
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    categories: NotificationCategoryToggles;
  };
  webhook: {
    enabled: boolean;
    endpointUrl: string;
    categories: NotificationCategoryToggles;
  };
}

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  message: string;
  createdAt: string;
  read: boolean;
  href?: string;
  referenceLabel?: string;
  referenceValue?: string;
  dedupeKey?: string;
}

export interface NotificationDraft {
  id?: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  message: string;
  createdAt?: string;
  read?: boolean;
  href?: string;
  referenceLabel?: string;
  referenceValue?: string;
  dedupeKey?: string;
}

export interface NotificationPanelUiState {
  isOpen: boolean;
  filter: NotificationFilter;
  sortOrder: NotificationSortOrder;
}

export type NotificationListState = "loading" | "empty" | "error" | "success";

const notificationRedactedValue = "Redacted for security";

const sensitiveReferencePatterns = [
  /bearer\s+/i,
  /^[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+$/i,
  /(^|\b)(sk|rk|pk)_[a-z0-9_-]+/i,
  /token|secret|password|credential|authorization/i,
] as const;

function parseTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareByCreatedAt(left: NotificationItem, right: NotificationItem, order: NotificationSortOrder): number {
  const leftStamp = parseTimestamp(left.createdAt);
  const rightStamp = parseTimestamp(right.createdAt);

  if (leftStamp === rightStamp) {
    return left.id.localeCompare(right.id);
  }

  return order === "newest" ? rightStamp - leftStamp : leftStamp - rightStamp;
}

export function createDefaultCategoryToggles(value = true): NotificationCategoryToggles {
  return {
    claims: value,
    payouts: value,
    tasks: value,
    system: value,
  };
}

export function createDefaultNotificationPreferences(): NotificationPreferences {
  return {
    email: {
      enabled: true,
      categories: createDefaultCategoryToggles(true),
    },
    webhook: {
      enabled: false,
      endpointUrl: "",
      categories: createDefaultCategoryToggles(true),
    },
  };
}

export function createNotificationId(prefix = "notification"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function formatNotificationReferenceSnippet(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (sensitiveReferencePatterns.some((pattern) => pattern.test(trimmed))) {
    return notificationRedactedValue;
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

export function countUnreadNotifications(items: readonly NotificationItem[]): number {
  return items.reduce((total, item) => (item.read ? total : total + 1), 0);
}

export function sortNotifications(
  items: readonly NotificationItem[],
  sortOrder: NotificationSortOrder,
): NotificationItem[] {
  return [...items].sort((left, right) => compareByCreatedAt(left, right, sortOrder));
}

export function filterNotifications(items: readonly NotificationItem[], filter: NotificationFilter): NotificationItem[] {
  if (filter === "all") {
    return [...items];
  }

  return items.filter((item) => item.category === filter);
}

export function resolveNotificationListState(input: {
  loading: boolean;
  errorMessage?: string;
  items: readonly NotificationItem[];
}): NotificationListState {
  if (input.loading) {
    return "loading";
  }

  if (input.errorMessage) {
    return "error";
  }

  if (input.items.length === 0) {
    return "empty";
  }

  return "success";
}

export function markNotificationRead(
  items: readonly NotificationItem[],
  notificationId: string,
  read: boolean,
): NotificationItem[] {
  return items.map((item) => (item.id === notificationId ? { ...item, read } : item));
}

export function markAllNotificationsRead(items: readonly NotificationItem[]): NotificationItem[] {
  return items.map((item) => (item.read ? item : { ...item, read: true }));
}

export function upsertNotification(
  items: readonly NotificationItem[],
  draft: NotificationDraft,
  options: { maxItems?: number } = {},
): NotificationItem[] {
  if (draft.dedupeKey) {
    const duplicate = items.some((item) => item.dedupeKey === draft.dedupeKey);
    if (duplicate) {
      return [...items];
    }
  }

  const nextItem: NotificationItem = {
    id: draft.id ?? createNotificationId(),
    category: draft.category,
    severity: draft.severity,
    message: draft.message,
    createdAt: draft.createdAt ?? new Date().toISOString(),
    read: draft.read ?? false,
    ...(draft.href ? { href: draft.href } : {}),
    ...(draft.referenceLabel ? { referenceLabel: draft.referenceLabel } : {}),
    ...(draft.referenceValue
      ? { referenceValue: formatNotificationReferenceSnippet(draft.referenceValue) ?? draft.referenceValue }
      : {}),
    ...(draft.dedupeKey ? { dedupeKey: draft.dedupeKey } : {}),
  };

  const maxItems = Math.max(1, options.maxItems ?? 200);
  const nextItems = sortNotifications([nextItem, ...items], "newest");
  return nextItems.slice(0, maxItems);
}

export function createInitialNotificationPanelUiState(overrides: Partial<NotificationPanelUiState> = {}): NotificationPanelUiState {
  return {
    isOpen: false,
    filter: "all",
    sortOrder: "newest",
    ...overrides,
  };
}

export function toggleNotificationPanelOpen(
  state: NotificationPanelUiState,
  open = !state.isOpen,
): NotificationPanelUiState {
  return {
    ...state,
    isOpen: open,
  };
}

export function isWebhookEndpointUrlValid(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function mergeNotificationPreferences(
  base: NotificationPreferences,
  override: Partial<NotificationPreferences>,
): NotificationPreferences {
  const defaults = createDefaultCategoryToggles(true);

  return {
    email: {
      enabled: override.email?.enabled ?? base.email.enabled,
      categories: {
        claims: override.email?.categories?.claims ?? base.email.categories.claims ?? defaults.claims,
        payouts: override.email?.categories?.payouts ?? base.email.categories.payouts ?? defaults.payouts,
        tasks: override.email?.categories?.tasks ?? base.email.categories.tasks ?? defaults.tasks,
        system: override.email?.categories?.system ?? base.email.categories.system ?? defaults.system,
      },
    },
    webhook: {
      enabled: override.webhook?.enabled ?? base.webhook.enabled,
      endpointUrl: override.webhook?.endpointUrl ?? base.webhook.endpointUrl,
      categories: {
        claims: override.webhook?.categories?.claims ?? base.webhook.categories.claims ?? defaults.claims,
        payouts: override.webhook?.categories?.payouts ?? base.webhook.categories.payouts ?? defaults.payouts,
        tasks: override.webhook?.categories?.tasks ?? base.webhook.categories.tasks ?? defaults.tasks,
        system: override.webhook?.categories?.system ?? base.webhook.categories.system ?? defaults.system,
      },
    },
  };
}
