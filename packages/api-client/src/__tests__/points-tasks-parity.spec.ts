import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pointEntrySources,
  pointEntryStatuses,
  pointEntryTypes,
  type PointsListResponse,
} from "@ryvra/domain-points";
import {
  taskProgressStates,
  taskStatuses,
  taskTypes,
  type TasksListResponse,
} from "@ryvra/domain-tasks";
import { createApiClient } from "../client";
import { ApiClientError, normalizeApiError } from "../errors";
import {
  pointsCanonicalEntrySources,
  pointsCanonicalEntryStatuses,
  pointsCanonicalEntryTypes,
  pointsTasksCanonicalErrorCodes,
  pointsTasksCanonicalErrorSources,
  pointsTasksRouteMap,
  tasksCanonicalProgressStates,
  tasksCanonicalStatuses,
  tasksCanonicalTypes,
} from "../points-tasks-parity";
import { createFetchTransport } from "../transport";
import type { ApiRequest, ApiResult, Transport } from "../types";

const canonicalMeta = {
  api_version: "2026-08-08.v1",
  generated_at: "2026-08-08T06:00:00Z",
  scope: {
    account_id: "acct_123",
    user_id: "user_123",
    workspace_id: "ws_123",
  },
} as const;

const pointListPayload = {
  data: [
    {
      entry_id: "pt_1001",
      account_id: "acct_123",
      user_id: "user_123",
      workspace_id: "ws_123",
      task_id: "task_1001",
      ledger_event_id: "ledger_evt_1001",
      reference_id: "ref_1001",
      entry_type: "transaction_reward",
      entry_status: "confirmed",
      entry_source: "ledger_settlement",
      points_delta: 120,
      points_balance_after: 1120,
      occurred_at: "2026-08-08T05:41:22Z",
      created_at: "2026-08-08T05:41:22Z",
      metadata: {
        campaign: "loyalty",
      },
    },
  ],
  page: {
    limit: 50,
    has_more: false,
    next_cursor: null,
  },
  meta: canonicalMeta,
} as const;

const pointSummaryPayload = {
  summary: {
    account_id: "acct_123",
    window_start: "2026-08-01T00:00:00Z",
    window_end: "2026-08-08T00:00:00Z",
    total_points: 1120,
    available_points: 1080,
    pending_points: 20,
    reversed_points: 40,
    entry_count: 14,
    by_type: [
      {
        entry_type: "transaction_reward",
        entries: 8,
        points_total: 800,
      },
    ],
    by_status: [
      {
        entry_status: "confirmed",
        entries: 12,
        points_total: 1080,
      },
    ],
    by_source: [
      {
        entry_source: "ledger_settlement",
        entries: 7,
        points_total: 760,
      },
    ],
  },
  meta: canonicalMeta,
} as const;

const pointsOverviewPayload = {
  overview: {
    account_id: "acct_123",
    window_start: "2026-08-01T00:00:00Z",
    window_end: "2026-08-08T00:00:00Z",
    current_balance: 1120,
    lifetime_points: 3940,
    entries_last_24h: 3,
    points_last_24h: 180,
    trend: [
      {
        bucket_start: "2026-08-07T00:00:00Z",
        bucket_end: "2026-08-07T23:59:59Z",
        points_earned: 120,
        entries: 2,
      },
    ],
  },
  meta: canonicalMeta,
} as const;

const taskListPayload = {
  data: [
    {
      task_id: "task_1001",
      account_id: "acct_123",
      user_id: "user_123",
      workspace_id: "ws_123",
      task_type: "security",
      task_status: "in_progress",
      progress_state: "active",
      title: "Review payout anomaly",
      description: "Investigate policy flags",
      progress_percent: 45,
      points_reward: 80,
      due_at: "2026-08-09T00:00:00Z",
      started_at: "2026-08-07T01:00:00Z",
      completed_at: null,
      created_at: "2026-08-07T01:00:00Z",
      updated_at: "2026-08-08T05:55:00Z",
    },
  ],
  page: {
    limit: 50,
    has_more: false,
    next_cursor: null,
  },
  meta: canonicalMeta,
} as const;

const taskSummaryPayload = {
  summary: {
    account_id: "acct_123",
    total_tasks: 24,
    completed_tasks: 10,
    in_progress_tasks: 8,
    overdue_tasks: 2,
    by_status: [
      {
        task_status: "completed",
        count: 10,
      },
      {
        task_status: "in_progress",
        count: 8,
      },
    ],
    by_progress_state: [
      {
        progress_state: "active",
        count: 8,
      },
      {
        progress_state: "done",
        count: 10,
      },
    ],
  },
  meta: canonicalMeta,
} as const;

const tasksOverviewPayload = {
  overview: {
    account_id: "acct_123",
    window_start: "2026-08-01T00:00:00Z",
    window_end: "2026-08-08T00:00:00Z",
    completion_rate: 41.67,
    tasks_created: 24,
    tasks_completed: 10,
    recently_completed: [
      {
        task_id: "task_1009",
        task_type: "onboarding",
        task_status: "completed",
        progress_state: "done",
        progress_percent: 100,
      },
    ],
    at_risk: [
      {
        task_id: "task_1011",
        task_type: "governance",
        task_status: "in_progress",
        progress_state: "blocked",
        progress_percent: 35,
      },
    ],
  },
  meta: canonicalMeta,
} as const;

const statusPayload = {
  service: "points-tasks",
  status: "ok",
  timestamp: "2026-08-08T06:00:00Z",
  api_version: "2026-08-08.v1",
  auth_required: true,
  components: [
    {
      name: "tasks-engine",
      status: "ok",
      checked_at: "2026-08-08T05:59:00Z",
      latency_ms: 12,
    },
  ],
} as const;

const healthPayload = {
  service: "points-tasks",
  status: "ok",
  timestamp: "2026-08-08T06:00:00Z",
  api_version: "2026-08-08.v1",
  uptime_seconds: 86400,
  checks: [
    {
      name: "tasks-engine",
      status: "ok",
      checked_at: "2026-08-08T05:59:00Z",
      latency_ms: 12,
    },
  ],
} as const;

function createCaptureTransport(handler: (request: ApiRequest) => ApiResult<unknown> | Promise<ApiResult<unknown>>): {
  transport: Transport;
  calls: ApiRequest[];
} {
  const calls: ApiRequest[] = [];

  return {
    calls,
    transport: {
      async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
        calls.push(request);
        const result = await handler(request);
        return result as ApiResult<T>;
      },
    },
  };
}

function canonicalRouteHandler(request: ApiRequest): ApiResult<unknown> {
  const pathname = new URL(request.path, "https://points-tasks.example").pathname;

  if (request.method === "GET" && pathname === pointsTasksRouteMap.listPointEntries) {
    return { ok: true, data: pointListPayload };
  }
  if (request.method === "GET" && pathname === pointsTasksRouteMap.getPointSummary) {
    return { ok: true, data: pointSummaryPayload };
  }
  if (request.method === "GET" && pathname === pointsTasksRouteMap.getPointsOverview) {
    return { ok: true, data: pointsOverviewPayload };
  }
  if (request.method === "GET" && pathname === pointsTasksRouteMap.listTasks) {
    return { ok: true, data: taskListPayload };
  }
  if (request.method === "GET" && pathname === pointsTasksRouteMap.getTaskSummary) {
    return { ok: true, data: taskSummaryPayload };
  }
  if (request.method === "GET" && pathname === pointsTasksRouteMap.getTasksOverview) {
    return { ok: true, data: tasksOverviewPayload };
  }
  if (request.method === "GET" && pathname === pointsTasksRouteMap.status) {
    return { ok: true, data: statusPayload };
  }
  if (request.method === "GET" && pathname === pointsTasksRouteMap.health) {
    return { ok: true, data: healthPayload };
  }

  return { ok: false, error: { code: "unhandled", message: "Unhandled route", retryable: false, source: "mock" } };
}

test("method→endpoint mapping uses canonical routes and headers", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://points-tasks.example",
    transport,
    pointsTasks: {
      authToken: "points-token",
      requestIdProvider: () => "request-fixed",
      correlationIdProvider: () => "correlation-fixed",
      defaultAccountId: "acct_123",
    },
  });

  await client.pointsTasks.listPointEntries({
    accountId: "acct_123",
    userId: "user_123",
    workspaceId: "ws_123",
    pagination: { limit: 25, cursor: "cursor-token", page: 7 },
    sort: { value: "occurred_at:desc" },
    filters: {
      entryStatus: "confirmed",
      entryType: "transaction_reward",
      entrySource: "ledger_settlement",
      dateRange: {
        occurredFrom: "2026-08-01T00:00:00Z",
        occurredTo: "2026-08-08T00:00:00Z",
      },
    },
  });

  await client.pointsTasks.getPointSummary({
    accountId: "acct_123",
    userId: "user_123",
    workspaceId: "ws_123",
    window: "30d",
    dateRange: {
      occurredFrom: "2026-08-01T00:00:00Z",
      occurredTo: "2026-08-08T00:00:00Z",
    },
  });

  await client.pointsTasks.getPointsOverview({
    accountId: "acct_123",
    userId: "user_123",
    workspaceId: "ws_123",
    window: "7d",
  });

  await client.pointsTasks.listTasks({
    accountId: "acct_123",
    userId: "user_123",
    workspaceId: "ws_123",
    pagination: { limit: 20, page: 3 },
    sort: { value: "updated_at:asc" },
    filters: {
      taskStatus: "in_progress",
      taskType: "security",
      progressState: "active",
      dateRange: {
        dueAfter: "2026-08-01T00:00:00Z",
        dueBefore: "2026-08-10T00:00:00Z",
      },
    },
  });

  await client.pointsTasks.getTaskSummary({ accountId: "acct_123", userId: "user_123", workspaceId: "ws_123" });
  await client.pointsTasks.getTasksOverview({ accountId: "acct_123", userId: "user_123", workspaceId: "ws_123", window: "24h" });
  await client.pointsTasks.getParityDiagnostics();

  assert.equal(calls[0]?.method, "GET");
  assert.equal(calls[0]?.path.startsWith(pointsTasksRouteMap.listPointEntries), true);
  assert.equal(calls[0]?.path.includes("account_id=acct_123"), true);
  assert.equal(calls[0]?.path.includes("user_id=user_123"), true);
  assert.equal(calls[0]?.path.includes("workspace_id=ws_123"), true);
  assert.equal(calls[0]?.path.includes("entry_status=confirmed"), true);
  assert.equal(calls[0]?.path.includes("entry_type=transaction_reward"), true);
  assert.equal(calls[0]?.path.includes("entry_source=ledger_settlement"), true);
  assert.equal(calls[0]?.path.includes("occurred_from=2026-08-01T00%3A00%3A00Z"), true);
  assert.equal(calls[0]?.path.includes("sort=occurred_at%3Adesc"), true);
  assert.equal(calls[0]?.path.includes("cursor=cursor-token"), true);
  assert.equal(calls[0]?.path.includes("page=7"), false);

  assert.equal(calls[1]?.path.startsWith(pointsTasksRouteMap.getPointSummary), true);
  assert.equal(calls[1]?.path.includes("window=30d"), true);

  assert.equal(calls[2]?.path.startsWith(pointsTasksRouteMap.getPointsOverview), true);
  assert.equal(calls[2]?.path.includes("window=7d"), true);

  assert.equal(calls[3]?.path.startsWith(pointsTasksRouteMap.listTasks), true);
  assert.equal(calls[3]?.path.includes("task_status=in_progress"), true);
  assert.equal(calls[3]?.path.includes("task_type=security"), true);
  assert.equal(calls[3]?.path.includes("progress_state=active"), true);
  assert.equal(calls[3]?.path.includes("due_after=2026-08-01T00%3A00%3A00Z"), true);
  assert.equal(calls[3]?.path.includes("sort=updated_at%3Aasc"), true);
  assert.equal(calls[3]?.path.includes("page=3"), true);

  assert.equal(calls[4]?.path.startsWith(pointsTasksRouteMap.getTaskSummary), true);
  assert.equal(calls[5]?.path.startsWith(pointsTasksRouteMap.getTasksOverview), true);
  assert.equal(calls[6]?.path, pointsTasksRouteMap.status);

  for (const call of calls) {
    assert.equal(call.headers?.["x-request-id"], "request-fixed");
    assert.equal(call.headers?.["x-correlation-id"], "correlation-fixed");
    assert.equal((call.headers?.authorization ?? "").startsWith("Bearer "), true);
  }
});

test("required account_id scope is enforced for account-scoped Points/Tasks endpoints", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://points-tasks.example",
    transport,
    pointsTasks: {
      authToken: "points-token",
    },
  });

  await assert.rejects(
    async () =>
      client.pointsTasks.listPointEntries({
        accountId: "",
        pagination: { limit: 10 },
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
    },
  );

  await assert.rejects(
    async () =>
      client.pointsTasks.getPointsOverview({
        accountId: "",
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
    },
  );

  await assert.rejects(
    async () =>
      client.pointsTasks.listTasks({
        accountId: "",
        pagination: { limit: 10 },
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
    },
  );

  await assert.rejects(
    async () =>
      client.pointsTasks.getTaskSummary({
        accountId: "",
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      return error instanceof ApiClientError && error.code === "invalid_request" && error.message.includes("account_id");
    },
  );

  assert.equal(calls.length, 0);
});

test("auth/header enforcement keeps status auth-required while health is auth-optional", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://points-tasks.example",
    transport,
    pointsTasks: {
      requestIdProvider: () => "request-health",
      correlationIdProvider: () => "correlation-health",
      defaultAccountId: "acct_123",
    },
  });

  await assert.rejects(
    async () =>
      client.pointsTasks.listPointEntries({
        accountId: "acct_123",
        pagination: { limit: 10 },
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      return error instanceof ApiClientError && error.code === "unauthorized";
    },
  );

  assert.equal(calls.length, 0);

  const diagnostics = await client.pointsTasks.getParityDiagnostics();
  assert.equal(diagnostics.connectivity.ok, true);
  assert.equal(diagnostics.connectivity.path, pointsTasksRouteMap.health);
  assert.equal(calls[0]?.path, pointsTasksRouteMap.health);
  assert.equal(calls[0]?.headers?.authorization, undefined);
  assert.equal(calls[0]?.headers?.["x-request-id"], "request-health");
  assert.equal(calls[0]?.headers?.["x-correlation-id"], "correlation-health");
});

test("non-canonical /health probe does not bypass auth and falls back to canonical health route", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://points-tasks.example",
    transport,
    pointsTasks: {
      connectivityPath: "/health",
      requestIdProvider: () => "request-fallback",
      correlationIdProvider: () => "correlation-fallback",
      defaultAccountId: "acct_123",
    },
  });

  const diagnostics = await client.pointsTasks.getParityDiagnostics();

  assert.equal(diagnostics.connectivity.ok, true);
  assert.equal(diagnostics.connectivity.path, pointsTasksRouteMap.health);
  assert.equal(diagnostics.connectivity.message.includes("Primary probe failed"), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.path, pointsTasksRouteMap.health);
  assert.equal(calls[0]?.headers?.authorization, undefined);
  assert.equal(calls[0]?.headers?.["x-request-id"], "request-fallback");
  assert.equal(calls[0]?.headers?.["x-correlation-id"], "correlation-fallback");
});

test("request serialization uses canonical filter/sort keys and pagination rules", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://points-tasks.example",
    transport,
    pointsTasks: {
      authToken: "points-token",
      defaultAccountId: "acct_123",
    },
  });

  await client.pointsTasks.listPointEntries({
    accountId: "acct_123",
    filters: {
      entryType: "manual_adjustment",
      entryStatus: "pending",
      entrySource: "admin_console",
      dateRange: { occurredFrom: "2026-08-01T00:00:00Z", occurredTo: "2026-08-08T00:00:00Z" },
    },
    pagination: {
      limit: 30,
      page: 4,
    },
    sort: {
      value: "created_at:asc",
    },
  });

  await client.pointsTasks.listTasks({
    accountId: "acct_123",
    filters: {
      taskStatus: "in_progress",
      taskType: "security",
      progressState: "active",
      dateRange: { dueAfter: "2026-08-02T00:00:00Z", dueBefore: "2026-08-09T00:00:00Z" },
    },
    pagination: {
      limit: 15,
      cursor: "cursor-15",
      page: 2,
    },
    sort: {
      value: "due_at:desc",
    },
  });

  const pointsUrl = new URL(calls[0]?.path ?? "", "https://points-tasks.example");
  assert.equal(pointsUrl.searchParams.get("entry_type"), "manual_adjustment");
  assert.equal(pointsUrl.searchParams.get("entry_status"), "pending");
  assert.equal(pointsUrl.searchParams.get("entry_source"), "admin_console");
  assert.equal(pointsUrl.searchParams.get("occurred_from"), "2026-08-01T00:00:00Z");
  assert.equal(pointsUrl.searchParams.get("occurred_to"), "2026-08-08T00:00:00Z");
  assert.equal(pointsUrl.searchParams.get("sort"), "created_at:asc");
  assert.equal(pointsUrl.searchParams.get("page"), "4");
  assert.equal(pointsUrl.searchParams.has("status"), false);
  assert.equal(pointsUrl.searchParams.has("type"), false);
  assert.equal(pointsUrl.searchParams.has("source"), false);
  assert.equal(pointsUrl.searchParams.has("sort_by"), false);
  assert.equal(pointsUrl.searchParams.has("sort_order"), false);

  const tasksUrl = new URL(calls[1]?.path ?? "", "https://points-tasks.example");
  assert.equal(tasksUrl.searchParams.get("task_status"), "in_progress");
  assert.equal(tasksUrl.searchParams.get("task_type"), "security");
  assert.equal(tasksUrl.searchParams.get("progress_state"), "active");
  assert.equal(tasksUrl.searchParams.get("due_after"), "2026-08-02T00:00:00Z");
  assert.equal(tasksUrl.searchParams.get("due_before"), "2026-08-09T00:00:00Z");
  assert.equal(tasksUrl.searchParams.get("sort"), "due_at:desc");
  assert.equal(tasksUrl.searchParams.get("cursor"), "cursor-15");
  assert.equal(tasksUrl.searchParams.has("page"), false);
  assert.equal(tasksUrl.searchParams.has("owner_id"), false);
  assert.equal(tasksUrl.searchParams.has("search"), false);
});

test("DTO decode validates canonical fixtures and rejects invalid enums", async () => {
  const { transport } = createCaptureTransport((request) => {
    const pathname = new URL(request.path, "https://points-tasks.example").pathname;

    if (pathname === pointsTasksRouteMap.listTasks) {
      return {
        ok: true,
        data: {
          ...taskListPayload,
          data: [{ ...taskListPayload.data[0], task_status: "INVALID" }],
        },
      };
    }

    return canonicalRouteHandler(request);
  });

  const client = createApiClient({
    mode: "http",
    baseUrl: "https://points-tasks.example",
    transport,
    pointsTasks: {
      authToken: "points-token",
      defaultAccountId: "acct_123",
    },
  });

  const points = await client.pointsTasks.listPointEntries({
    accountId: "acct_123",
    pagination: { limit: 10 },
  });

  assert.equal(points.items[0]?.entryType, "transaction_reward");
  assert.equal(points.items[0]?.entrySource, "ledger_settlement");
  assert.equal(points.meta.apiVersion, "2026-08-08.v1");

  const summary = await client.pointsTasks.getPointSummary({ accountId: "acct_123" });
  assert.equal(summary.totalPoints, 1120);
  assert.equal(summary.byStatus[0]?.entryStatus, "confirmed");

  const overview = await client.pointsTasks.getPointsOverview({ accountId: "acct_123" });
  assert.equal(overview.currentBalance, 1120);
  assert.equal(overview.trend.length, 1);

  await assert.rejects(
    async () =>
      client.pointsTasks.listTasks({
        accountId: "acct_123",
        pagination: { limit: 10 },
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApiClientError, true);
      return error instanceof ApiClientError && error.code === "points_tasks_payload_validation_failed";
    },
  );
});

test("deprecated page compatibility is supported only when cursor is absent", async () => {
  const { transport, calls } = createCaptureTransport((request) => {
    const pathname = new URL(request.path, "https://points-tasks.example").pathname;

    if (pathname === pointsTasksRouteMap.listPointEntries) {
      const url = new URL(request.path, "https://points-tasks.example");
      const page = url.searchParams.get("page");

      if (page) {
        return {
          ok: true,
          data: {
            ...pointListPayload,
            meta: {
              ...canonicalMeta,
              deprecated_page: {
                page: Number(page),
                translated_to_cursor: "mk_MjA",
                removal_not_before: "2027-02-04",
              },
            },
          },
        };
      }
    }

    return canonicalRouteHandler(request);
  });

  const client = createApiClient({
    mode: "http",
    baseUrl: "https://points-tasks.example",
    transport,
    pointsTasks: {
      authToken: "points-token",
      defaultAccountId: "acct_123",
    },
  });

  const pageResult = await client.pointsTasks.listPointEntries({
    accountId: "acct_123",
    pagination: { limit: 20, page: 2 },
  });

  await client.pointsTasks.listPointEntries({
    accountId: "acct_123",
    pagination: { limit: 20, page: 2, cursor: "cursor-20" },
  });

  assert.equal(calls[0]?.path.includes("page=2"), true);
  assert.equal(calls[1]?.path.includes("page=2"), false);
  assert.equal(pageResult.meta.deprecatedPage?.page, 2);
  assert.equal(pageResult.meta.deprecatedPage?.removalNotBefore, "2027-02-04");
});

test("canonical error normalization preserves points/tasks envelope", async () => {
  const normalized = normalizeApiError({
    status: 403,
    code: "http_request_failed",
    message: "Forbidden",
    details: {
      code: "forbidden",
      message: "points scope denied",
      retryable: false,
      source: "points_tasks_api",
      details: {
        reason_codes: ["scope_denied"],
      },
    },
  });

  assert.equal(normalized.code, "forbidden");
  assert.equal(normalized.message, "points scope denied");
  assert.equal(normalized.retryable, false);
  assert.equal(normalized.source, "points_tasks_api");
  assert.equal(normalized.status, 403);

  const inferredRetryable = normalizeApiError({
    status: 503,
    code: "http_request_failed",
    message: "Service Unavailable",
    details: {
      code: "upstream_unavailable",
      message: "tasks engine unavailable",
      source: "tasks_engine",
    },
  });

  assert.equal(inferredRetryable.code, "upstream_unavailable");
  assert.equal(inferredRetryable.message, "tasks engine unavailable");
  assert.equal(inferredRetryable.retryable, true);
  assert.equal(inferredRetryable.source, "tasks_engine");
  assert.equal(inferredRetryable.status, 503);

  const transport = createFetchTransport({
    baseUrl: "https://points-tasks.example",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          code: "upstream_unavailable",
          message: "tasks engine unavailable",
          retryable: true,
          source: "tasks_engine",
          details: {
            dependency: "tasks-engine",
          },
        }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await transport.request<unknown>({ method: "GET", path: pointsTasksRouteMap.listTasks });
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "upstream_unavailable");
    assert.equal(response.error.retryable, true);
    assert.equal(response.error.source, "tasks_engine");
  }
});

test("enum parity keeps canonical points/tasks constants aligned", () => {
  assert.deepEqual(pointsCanonicalEntryTypes, [
    "transaction_reward",
    "task_completion_bonus",
    "referral_bonus",
    "manual_adjustment",
    "penalty",
    "reversal",
  ]);
  assert.deepEqual(pointsCanonicalEntryStatuses, ["pending", "confirmed", "rejected", "reversed", "expired"]);
  assert.deepEqual(pointsCanonicalEntrySources, [
    "ledger_settlement",
    "policy_risk",
    "tasks_engine",
    "admin_console",
    "system_migration",
  ]);
  assert.deepEqual(tasksCanonicalTypes, ["onboarding", "transaction_volume", "referral", "governance", "security", "ecosystem", "custom"]);
  assert.deepEqual(tasksCanonicalStatuses, ["not_started", "eligible", "in_progress", "completed", "failed", "expired", "canceled"]);
  assert.deepEqual(tasksCanonicalProgressStates, ["queued", "active", "blocked", "under_review", "done"]);
  assert.deepEqual(pointsTasksCanonicalErrorCodes, [
    "invalid_request",
    "unauthorized",
    "forbidden",
    "not_found",
    "conflict",
    "rate_limited",
    "upstream_unavailable",
    "internal_error",
  ]);
  assert.deepEqual(pointsTasksCanonicalErrorSources, [
    "points_tasks_api",
    "tasks_engine",
    "policy_risk",
    "ledger_settlement",
    "pay",
    "governance",
    "unknown",
  ]);

  assert.deepEqual(pointEntryTypes, [
    "transaction_reward",
    "task_completion_bonus",
    "referral_bonus",
    "manual_adjustment",
    "penalty",
    "reversal",
  ]);
  assert.deepEqual(pointEntryStatuses, ["pending", "confirmed", "rejected", "reversed", "expired"]);
  assert.deepEqual(pointEntrySources, [
    "ledger_settlement",
    "policy_risk",
    "tasks_engine",
    "admin_console",
    "system_migration",
  ]);
  assert.deepEqual(taskTypes, ["onboarding", "transaction_volume", "referral", "governance", "security", "ecosystem", "custom"]);
  assert.deepEqual(taskStatuses, ["not_started", "eligible", "in_progress", "completed", "failed", "expired", "canceled"]);
  assert.deepEqual(taskProgressStates, ["queued", "active", "blocked", "under_review", "done"]);
});

test(
  "optional points/tasks connectivity smoke probe",
  {
    skip: !process.env.RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_URL,
  },
  async () => {
    const baseUrl = process.env.RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_URL as string;
    const path = process.env.RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_PATH ?? pointsTasksRouteMap.health;
    const client = createApiClient({
      mode: "http",
      baseUrl,
      pointsTasks: {
        ...(process.env.RYVRA_POINTS_TASKS_AUTH_TOKEN ? { authToken: process.env.RYVRA_POINTS_TASKS_AUTH_TOKEN } : {}),
        connectivityPath: path,
        ...(process.env.RYVRA_POINTS_TASKS_ACCOUNT_ID ? { defaultAccountId: process.env.RYVRA_POINTS_TASKS_ACCOUNT_ID } : {}),
      },
    });

    const diagnostics = await client.pointsTasks.getParityDiagnostics();
    assert.equal(diagnostics.connectivity.ok, true);
  },
);

test("decode list response shape keeps canonical items, page, and meta keys", () => {
  const decodedPoints = {
    items: [...pointListPayload.data],
    pagination: {
      limit: pointListPayload.page.limit,
      hasMore: pointListPayload.page.has_more,
    },
    meta: {
      apiVersion: pointListPayload.meta.api_version,
      generatedAt: pointListPayload.meta.generated_at,
      scope: {
        accountId: pointListPayload.meta.scope.account_id,
      },
    },
  } satisfies PointsListResponse<unknown>;

  const decodedTasks = {
    items: [...taskListPayload.data],
    pagination: {
      limit: taskListPayload.page.limit,
      hasMore: taskListPayload.page.has_more,
    },
    meta: {
      apiVersion: taskListPayload.meta.api_version,
      generatedAt: taskListPayload.meta.generated_at,
      scope: {
        accountId: taskListPayload.meta.scope.account_id,
      },
    },
  } satisfies TasksListResponse<unknown>;

  assert.equal(Array.isArray(decodedPoints.items), true);
  assert.equal(typeof decodedPoints.pagination.limit, "number");
  assert.equal(typeof decodedPoints.meta.apiVersion, "string");
  assert.equal(Array.isArray(decodedTasks.items), true);
  assert.equal(typeof decodedTasks.pagination.limit, "number");
  assert.equal(typeof decodedTasks.meta.apiVersion, "string");
});
