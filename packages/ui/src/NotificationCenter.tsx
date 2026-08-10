"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  countUnreadNotifications,
  createInitialNotificationPanelUiState,
  filterNotifications,
  isWebhookEndpointUrlValid,
  notificationCategories,
  resolveNotificationListState,
  sortNotifications,
  toggleNotificationPanelOpen,
  type NotificationCategory,
  type NotificationFilter,
} from "./notification-center-model";
import { useNotificationCenter } from "./NotificationCenterProvider";
import { useI18n } from "./I18nProvider";
import { formatLocalizedDateTime, formatLocalizedRelativeTime, type TranslationResolver } from "./i18n-runtime";

export interface NotificationCenterProps {
  defaultOpen?: boolean;
}

const tabOrder: NotificationFilter[] = ["all", ...notificationCategories];

function formatTimestamp(value: string, locale: string, timeZone: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  const absolute = formatLocalizedDateTime(new Date(parsed), {
    locale,
    timeZone,
  });
  const relative = formatLocalizedRelativeTime(new Date(parsed), {
    locale,
  });
  return `${absolute} (${relative})`;
}

function toTabIndex(currentFilter: NotificationFilter): number {
  const index = tabOrder.findIndex((tab) => tab === currentFilter);
  return index >= 0 ? index : 0;
}

function cycleFilter(currentFilter: NotificationFilter, direction: -1 | 1): NotificationFilter {
  const currentIndex = toTabIndex(currentFilter);
  const nextIndex = (currentIndex + direction + tabOrder.length) % tabOrder.length;
  return tabOrder[nextIndex] ?? "all";
}

function getNotificationTriggerLabel(unreadCount: number, t: TranslationResolver): string {
  if (unreadCount <= 0) {
    return t("notification.triggerOpen", "Open notification center");
  }

  return t("notification.triggerOpenUnread", "Open notification center ({count} unread)", { count: unreadCount });
}

export function NotificationCenter({ defaultOpen = false }: NotificationCenterProps) {
  const { locale, direction, resolvedTimeZone, t } = useI18n();
  const {
    mode,
    status,
    errorMessage,
    notifications,
    preferences,
    markAllRead,
    markAsRead,
    markAsUnread,
    updatePreferences,
    reloadFromStorage,
    supportsWebhookTestPing,
    webhookTestPingReason,
  } = useNotificationCenter();

  const filterLabels: Record<NotificationFilter, string> = useMemo(
    () => ({
      all: t("notification.filter.all", "All"),
      claims: t("notification.filter.claims", "Claims"),
      payouts: t("notification.filter.payouts", "Payouts"),
      tasks: t("notification.filter.tasks", "Tasks"),
      system: t("notification.filter.system", "System"),
    }),
    [t],
  );

  const severityLabels: Record<string, string> = useMemo(
    () => ({
      info: t("notification.severity.info", "Info"),
      success: t("notification.severity.success", "Success"),
      warn: t("notification.severity.warn", "Warning"),
      error: t("notification.severity.error", "Error"),
    }),
    [t],
  );

  const panelId = useId();
  const panelTitleId = `${panelId}-title`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelTitleRef = useRef<HTMLHeadingElement | null>(null);
  const wasOpenRef = useRef(defaultOpen);
  const [uiState, setUiState] = useState(() =>
    createInitialNotificationPanelUiState({
      isOpen: defaultOpen,
    }),
  );
  const [webhookTouched, setWebhookTouched] = useState(false);

  const visibleNotifications = useMemo(() => {
    const filtered = filterNotifications(notifications, uiState.filter);
    return sortNotifications(filtered, uiState.sortOrder);
  }, [notifications, uiState.filter, uiState.sortOrder]);

  const unreadCount = useMemo(() => countUnreadNotifications(notifications), [notifications]);

  const listState = resolveNotificationListState({
    loading: status === "loading",
    ...(status === "error" ? { errorMessage: errorMessage ?? t("notification.errorFallback", "Notifications could not be loaded.") } : {}),
    items: visibleNotifications,
  });

  const webhookUrl = preferences.webhook.endpointUrl;
  const webhookUrlTrimmed = webhookUrl.trim();
  const webhookUrlValid = webhookUrlTrimmed.length === 0 ? false : isWebhookEndpointUrlValid(webhookUrlTrimmed);
  const webhookValidationError =
    webhookTouched && preferences.webhook.enabled && !webhookUrlValid
      ? t(
          "notification.webhookValidationError",
          "Enter a valid http:// or https:// webhook URL before enabling delivery.",
        )
      : undefined;

  const hasLocalPreviewMode = mode === "local-preview";

  useEffect(() => {
    if (uiState.isOpen && !wasOpenRef.current) {
      panelTitleRef.current?.focus();
    }

    if (!uiState.isOpen && wasOpenRef.current) {
      triggerRef.current?.focus();
    }

    wasOpenRef.current = uiState.isOpen;
  }, [uiState.isOpen]);

  useEffect(() => {
    if (!uiState.isOpen || typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }

      setUiState((current) => toggleNotificationPanelOpen(current, false));
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [uiState.isOpen]);

  function setCategoryPreference(channel: "email" | "webhook", category: NotificationCategory, enabled: boolean) {
    updatePreferences((current) => ({
      ...current,
      [channel]: {
        ...current[channel],
        categories: {
          ...current[channel].categories,
          [category]: enabled,
        },
      },
    }));
  }

  function handleTabKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const moveForward = direction === "rtl" ? event.key === "ArrowLeft" : event.key === "ArrowRight";
    setUiState((current) => ({
      ...current,
      filter: cycleFilter(current.filter, moveForward ? 1 : -1),
    }));
  }

  function handlePanelKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setUiState((current) => toggleNotificationPanelOpen(current, false));
    }
  }

  return (
    <div className="ryvra-notification-center">
      <button
        ref={triggerRef}
        type="button"
        className="ryvra-command-trigger ryvra-notification-trigger"
        aria-label={getNotificationTriggerLabel(unreadCount, t)}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-expanded={uiState.isOpen}
        onClick={() => {
          setUiState((current) => toggleNotificationPanelOpen(current));
        }}
      >
        <span aria-hidden="true">🔔</span>
        <span className="ryvra-notification-trigger-label">{t("notification.trigger", "Notifications")}</span>
        <span
          className="ryvra-notification-badge"
          aria-live="polite"
          aria-label={t("notification.unreadCount", "{count} unread notifications", { count: unreadCount })}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      </button>

      {uiState.isOpen ? (
        <div
          id={panelId}
          className="ryvra-notification-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={panelTitleId}
          ref={panelRef}
          onKeyDown={handlePanelKeyboard}
        >
          <div className="ryvra-notification-panel-header">
            <h2 id={panelTitleId} tabIndex={-1} ref={panelTitleRef} style={{ margin: 0 }}>
              {t("notification.title", "Notification center")}
            </h2>
            <button
              type="button"
              className="ryvra-notification-inline-button"
              aria-label={t("notification.closeAria", "Close notification center")}
              onClick={() => {
                setUiState((current) => toggleNotificationPanelOpen(current, false));
              }}
            >
              {t("notification.close", "Close")}
            </button>
          </div>

          <p className="ryvra-notification-mode-note">
            {t("notification.deliveryMode", "Delivery mode: {mode}", {
              mode: hasLocalPreviewMode
                ? t("notification.mode.local", "Local preview settings")
                : t("notification.mode.remote", "Remote synced settings"),
            })}
          </p>
          {hasLocalPreviewMode ? (
            <p className="ryvra-notification-mode-note">
              {t(
                "notification.mode.localNotice",
                "Remote notifications and communication preference persistence are not configured in this phase.",
              )}
            </p>
          ) : null}

          <div className="ryvra-notification-toolbar">
            <div
              role="tablist"
              aria-label={t("notification.categories", "Notification categories")}
              className="ryvra-notification-tablist"
            >
              {tabOrder.map((tab) => {
                const selected = uiState.filter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    className="ryvra-notification-tab"
                    aria-selected={selected}
                    onKeyDown={handleTabKeyboard}
                    onClick={() => {
                      setUiState((current) => ({
                        ...current,
                        filter: tab,
                      }));
                    }}
                  >
                    {filterLabels[tab]}
                  </button>
                );
              })}
            </div>

            <label className="ryvra-notification-sort-label">
              <span>{t("notification.sort", "Sort")}</span>
              <select
                className="ryvra-notification-select"
                value={uiState.sortOrder}
                onChange={(event) => {
                  setUiState((current) => ({
                    ...current,
                    sortOrder: event.currentTarget.value === "oldest" ? "oldest" : "newest",
                  }));
                }}
              >
                <option value="newest">{t("notification.sort.newest", "Newest first")}</option>
                <option value="oldest">{t("notification.sort.oldest", "Oldest first")}</option>
              </select>
            </label>
          </div>

          <div className="ryvra-notification-list-shell">
            {unreadCount > 0 ? (
              <button type="button" className="ryvra-notification-inline-button" onClick={markAllRead}>
                {t("notification.markAllRead", "Mark all as read")}
              </button>
            ) : null}

            {listState === "loading" ? (
              <p role="status" aria-live="polite" className="ryvra-notification-state">
                {t("notification.loading", "Loading notifications…")}
              </p>
            ) : null}

            {listState === "error" ? (
              <div role="alert" className="ryvra-notification-state">
                <p style={{ margin: 0 }}>{errorMessage ?? t("notification.errorFallback", "Notifications could not be loaded.")}</p>
                <button type="button" className="ryvra-notification-inline-button" onClick={reloadFromStorage}>
                  {t("notification.retry", "Retry")}
                </button>
              </div>
            ) : null}

            {listState === "empty" ? (
              <p className="ryvra-notification-state">{t("notification.empty", "No notifications available for this filter.")}</p>
            ) : null}

            {listState === "success" ? (
              <ul className="ryvra-notification-list" aria-label={t("notification.items", "Notification items")}>
                {visibleNotifications.map((item) => (
                  <li
                    key={item.id}
                    className={item.read ? "ryvra-notification-item" : "ryvra-notification-item ryvra-notification-item--unread"}
                  >
                    <div className="ryvra-notification-item-row">
                      <span className={`ryvra-notification-severity ryvra-notification-severity--${item.severity}`}>
                        {severityLabels[item.severity] ?? t("notification.severity.info", "Info")}
                      </span>
                      {!item.read ? <span className="ryvra-notification-unread-pill">{t("notification.unread", "Unread")}</span> : null}
                    </div>

                    <p className="ryvra-notification-message">{item.message}</p>

                    <p className="ryvra-notification-meta">
                      <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt, locale, resolvedTimeZone)}</time>
                      {item.referenceLabel && item.referenceValue
                        ? ` • ${item.referenceLabel}: ${item.referenceValue}`
                        : null}
                    </p>

                    <div className="ryvra-notification-actions">
                      <button
                        type="button"
                        className="ryvra-notification-inline-button"
                        onClick={() => {
                          if (item.read) {
                            markAsUnread(item.id);
                            return;
                          }

                          markAsRead(item.id);
                        }}
                      >
                        {item.read ? t("notification.markUnread", "Mark unread") : t("notification.markRead", "Mark read")}
                      </button>

                      {item.href ? (
                        <a
                          href={item.href}
                          className="ryvra-notification-link"
                          onClick={() => {
                            markAsRead(item.id);
                          }}
                        >
                          {t("notification.openContext", "Open context")}
                        </a>
                      ) : (
                        <span className="ryvra-notification-muted">{t("notification.noLinkedRoute", "No linked route")}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <section className="ryvra-notification-preferences" aria-label={t("notification.preferences", "Notification preferences")}>
            <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
              {t("notification.communicationPreferences", "Communication preferences")}
            </h3>

            <fieldset className="ryvra-notification-fieldset">
              <legend>{t("notification.emailUpdates", "Email updates")}</legend>
              <label className="ryvra-notification-checkbox-row">
                <input
                  type="checkbox"
                  checked={preferences.email.enabled}
                  onChange={(event) => {
                    updatePreferences((current) => ({
                      ...current,
                      email: {
                        ...current.email,
                        enabled: event.currentTarget.checked,
                      },
                    }));
                  }}
                />
                <span>{t("notification.enableEmail", "Enable email notifications")}</span>
              </label>

              <div className="ryvra-notification-grid">
                {notificationCategories.map((category) => (
                  <label key={`email-${category}`} className="ryvra-notification-checkbox-row">
                    <input
                      type="checkbox"
                      checked={preferences.email.categories[category]}
                      onChange={(event) => {
                        setCategoryPreference("email", category, event.currentTarget.checked);
                      }}
                    />
                    <span>{t("notification.emailCategory", "Email {category}", { category: filterLabels[category] })}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="ryvra-notification-fieldset">
              <legend>{t("notification.webhookUpdates", "Webhook updates")}</legend>
              <label className="ryvra-notification-checkbox-row">
                <input
                  type="checkbox"
                  checked={preferences.webhook.enabled}
                  onChange={(event) => {
                    updatePreferences((current) => ({
                      ...current,
                      webhook: {
                        ...current.webhook,
                        enabled: event.currentTarget.checked,
                      },
                    }));
                  }}
                />
                <span>{t("notification.enableWebhook", "Enable webhook delivery")}</span>
              </label>

              <label className="ryvra-notification-input-row">
                <span>{t("notification.webhookEndpointUrl", "Webhook endpoint URL")}</span>
                <input
                  type="url"
                  className="ryvra-notification-input"
                  value={webhookUrl}
                  onBlur={() => {
                    setWebhookTouched(true);
                  }}
                  onChange={(event) => {
                    setWebhookTouched(true);
                    updatePreferences((current) => ({
                      ...current,
                      webhook: {
                        ...current.webhook,
                        endpointUrl: event.currentTarget.value,
                      },
                    }));
                  }}
                  placeholder={t("notification.webhookPlaceholder", "https://example.com/notifications")}
                  aria-invalid={webhookValidationError ? "true" : "false"}
                  aria-describedby={webhookValidationError ? `${panelId}-webhook-error` : undefined}
                />
              </label>

              {webhookValidationError ? (
                <p id={`${panelId}-webhook-error`} role="alert" className="ryvra-notification-input-error">
                  {webhookValidationError}
                </p>
              ) : null}

              <div className="ryvra-notification-grid">
                {notificationCategories.map((category) => (
                  <label key={`webhook-${category}`} className="ryvra-notification-checkbox-row">
                    <input
                      type="checkbox"
                      checked={preferences.webhook.categories[category]}
                      onChange={(event) => {
                        setCategoryPreference("webhook", category, event.currentTarget.checked);
                      }}
                    />
                    <span>{t("notification.webhookCategory", "Webhook {category}", { category: filterLabels[category] })}</span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="ryvra-notification-inline-button"
                disabled={!supportsWebhookTestPing}
                aria-describedby={!supportsWebhookTestPing ? `${panelId}-webhook-test-disabled` : undefined}
              >
                {t("notification.sendTestPing", "Send test ping")}
              </button>
              {!supportsWebhookTestPing ? (
                <p id={`${panelId}-webhook-test-disabled`} className="ryvra-notification-mode-note">
                  {t(
                    "notification.webhookTestPingDeferred",
                    webhookTestPingReason,
                  )}
                </p>
              ) : null}
            </fieldset>
          </section>
        </div>
      ) : null}
    </div>
  );
}
