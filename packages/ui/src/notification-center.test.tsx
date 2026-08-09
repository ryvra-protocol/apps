import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  NotificationCenterControl,
  NotificationCenterProvider,
  createDefaultNotificationPreferences,
  filterNotificationsByCategory,
  getNotificationUnreadCount,
  mapClaimLifecycleNotification,
  mapPayoutStatusNotification,
  mapTaskStatusNotification,
  resolveFeedModeLabel,
  resolveNotificationList,
  resolvePreferenceModeLabel,
  setEmailCategoryPreference,
  setEmailPreferenceEnabled,
  setNotificationReadState,
  setWebhookCategoryPreference,
  setWebhookEndpointPreference,
  setWebhookPreferenceEnabled,
  sortNotifications,
  toggleNotificationCenterOpen,
  validateWebhookUrl,
  type NotificationRecord,
} from "./NotificationCenter";

function record(input: Partial<NotificationRecord> & Pick<NotificationRecord, "id" | "eventKey" | "category" | "severity" | "title" | "message" | "timestamp">): NotificationRecord {
  return {
    routeLabel: "Open context",
    references: [],
    read: false,
    ...input,
  };
}

test("notification center open/close and unread count behavior", () => {
  assert.equal(toggleNotificationCenterOpen(false), true);
  assert.equal(toggleNotificationCenterOpen(true), false);

  const notifications = [
    record({
      id: "n1",
      eventKey: "n1",
      category: "claims",
      severity: "info",
      title: "Claim submitted",
      message: "queued",
      timestamp: "2026-08-09T10:00:00.000Z",
      read: false,
    }),
    record({
      id: "n2",
      eventKey: "n2",
      category: "system",
      severity: "info",
      title: "System update",
      message: "stable",
      timestamp: "2026-08-09T10:01:00.000Z",
      read: true,
    }),
  ];

  assert.equal(getNotificationUnreadCount(notifications), 1);
});

test("notification list rendering states cover loading, empty, error, and success", () => {
  const loadingMarkup = renderToStaticMarkup(
    <NotificationCenterProvider appId="pay" disableStorage initialPanelOpen initialFeedLoading initialNotifications={[]}>
      <NotificationCenterControl />
    </NotificationCenterProvider>,
  );
  assert.match(loadingMarkup, /Loading notifications/);

  const emptyMarkup = renderToStaticMarkup(
    <NotificationCenterProvider appId="pay" disableStorage initialPanelOpen initialFeedLoading={false} initialNotifications={[]}>
      <NotificationCenterControl />
    </NotificationCenterProvider>,
  );
  assert.match(emptyMarkup, /No notifications match the selected category/);

  const errorMarkup = renderToStaticMarkup(
    <NotificationCenterProvider
      appId="pay"
      disableStorage
      initialPanelOpen
      initialFeedLoading={false}
      initialFeedError="Unable to load local preview notifications."
      initialNotifications={[]}
    >
      <NotificationCenterControl />
    </NotificationCenterProvider>,
  );
  assert.match(errorMarkup, /Unable to load local preview notifications/);

  const successMarkup = renderToStaticMarkup(
    <NotificationCenterProvider
      appId="pay"
      disableStorage
      initialPanelOpen
      initialFeedLoading={false}
      initialNotifications={[
        record({
          id: "n3",
          eventKey: "n3",
          category: "payouts",
          severity: "success",
          title: "Payout completed",
          message: "complete",
          timestamp: "2026-08-09T10:10:00.000Z",
          routeHref: "/payouts?status=COMPLETED",
        }),
      ]}
    >
      <NotificationCenterControl />
    </NotificationCenterProvider>,
  );
  assert.match(successMarkup, /Payout completed/);
});

test("category filtering and deterministic ordering", () => {
  const notifications = [
    record({
      id: "n10",
      eventKey: "n10",
      category: "claims",
      severity: "info",
      title: "Claim submitted",
      message: "queued",
      timestamp: "2026-08-09T11:00:00.000Z",
    }),
    record({
      id: "n11",
      eventKey: "n11",
      category: "tasks",
      severity: "success",
      title: "Task complete",
      message: "done",
      timestamp: "2026-08-09T11:02:00.000Z",
    }),
    record({
      id: "n12",
      eventKey: "n12",
      category: "claims",
      severity: "warn",
      title: "Claim failed",
      message: "retry",
      timestamp: "2026-08-09T11:01:00.000Z",
    }),
  ];

  const onlyClaims = filterNotificationsByCategory(notifications, "claims");
  assert.equal(onlyClaims.length, 2);

  const sortedNewest = sortNotifications(onlyClaims, "newest");
  assert.deepEqual(
    sortedNewest.map((item) => item.id),
    ["n12", "n10"],
  );

  const resolvedOldest = resolveNotificationList(notifications, "all", "oldest");
  assert.deepEqual(
    resolvedOldest.map((item) => item.id),
    ["n10", "n12", "n11"],
  );
});

test("mark read/unread actions update notification state", () => {
  const notifications = [
    record({
      id: "n20",
      eventKey: "n20",
      category: "tasks",
      severity: "info",
      title: "Task update",
      message: "processing",
      timestamp: "2026-08-09T12:00:00.000Z",
      read: false,
    }),
  ];

  const readState = setNotificationReadState(notifications, "n20", true);
  assert.equal(readState[0]?.read, true);

  const unreadState = setNotificationReadState(readState, "n20", false);
  assert.equal(unreadState[0]?.read, false);
});

test("deep-link action renders for notification items", () => {
  const markup = renderToStaticMarkup(
    <NotificationCenterProvider
      appId="points"
      disableStorage
      initialPanelOpen
      initialFeedLoading={false}
      initialNotifications={[
        record({
          id: "n30",
          eventKey: "n30",
          category: "tasks",
          severity: "info",
          title: "Task assigned",
          message: "ready",
          timestamp: "2026-08-09T12:30:00.000Z",
          routeHref: "/tasks?task_status=eligible&ref=notification&entity=task",
          routeLabel: "Open task context",
        }),
      ]}
    >
      <NotificationCenterControl />
    </NotificationCenterProvider>,
  );

  assert.match(markup, /href="\/tasks\?task_status=eligible&amp;ref=notification&amp;entity=task"/);
  assert.match(markup, /Open task context/);
});

test("claim, payout, and task status mapping produces user-facing notifications", () => {
  const claim = mapClaimLifecycleNotification({
    stage: "failed",
    retryable: true,
    eventKey: "claim:1:failed",
    references: [{ label: "Request ID", value: "req_1234567890" }],
  });
  assert.equal(claim.category, "claims");
  assert.equal(claim.severity, "warn");

  const payout = mapPayoutStatusNotification({
    payoutId: "pay_abc123",
    status: "SCHEDULED",
    eventKey: "payout:scheduled",
  });
  assert.equal(payout?.title, "Payout queued");

  const task = mapTaskStatusNotification({
    taskId: "task_123",
    status: "completed",
    progressState: "done",
    progressPercent: 100,
    eventKey: "task:completed",
  });
  assert.equal(task?.title, "Task completed");
});

test("preferences toggles and webhook URL validation work for preview settings", () => {
  let preferences = createDefaultNotificationPreferences();
  preferences = setEmailPreferenceEnabled(preferences, true);
  preferences = setEmailCategoryPreference(preferences, "system", false);
  preferences = setWebhookPreferenceEnabled(preferences, true);
  preferences = setWebhookCategoryPreference(preferences, "claims", false);
  preferences = setWebhookEndpointPreference(preferences, "invalid-url");

  assert.equal(preferences.email.enabled, true);
  assert.equal(preferences.email.categories.system, false);
  assert.equal(preferences.webhook.enabled, true);
  assert.equal(preferences.webhook.categories.claims, false);
  assert.equal(validateWebhookUrl(preferences.webhook.endpointUrl), "Enter a valid webhook URL.");
  assert.equal(validateWebhookUrl("https://hooks.example.com/ryvra"), null);
});

test("local-preview and remote mode labeling is explicit", () => {
  assert.equal(resolveFeedModeLabel("local-preview"), "Local preview feed");
  assert.equal(resolveFeedModeLabel("remote"), "Remote feed active");
  assert.equal(resolvePreferenceModeLabel("local-preview"), "Local preview settings");
  assert.equal(resolvePreferenceModeLabel("remote"), "Remote preference persistence");
});

test("notification center includes keyboard and aria accessibility hooks", () => {
  const markup = renderToStaticMarkup(
    <NotificationCenterProvider
      appId="markets"
      disableStorage
      initialPanelOpen
      initialFeedLoading={false}
      initialNotifications={[
        record({
          id: "n40",
          eventKey: "n40",
          category: "system",
          severity: "info",
          title: "Preview",
          message: "local mode",
          timestamp: "2026-08-09T12:50:00.000Z",
        }),
      ]}
    >
      <NotificationCenterControl />
    </NotificationCenterProvider>,
  );

  assert.match(markup, /aria-haspopup="dialog"/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /role="tablist"/);
  assert.match(markup, /type="button"/);
  assert.match(markup, /aria-label="Open notifications \(1 unread\)"/);
});
