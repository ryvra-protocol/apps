import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pointEntrySources,
  pointEntryStatuses,
  pointEntryTypes,
  type PointsListResponse,
} from "@ryvra/domain-points";
import { taskStatuses, taskTypes, type TasksListResponse } from "@ryvra/domain-tasks";
import { createApiClient } from "../client";
import { ApiClientError, normalizeApiError } from "../errors";
import {
  pointsCanonicalEntrySources,
  pointsCanonicalEntryStatuses,
  pointsCanonicalEntryTypes,
  pointsTasksCanonicalErrorCodes,
  pointsTasksRouteMap,
  tasksCanonicalStatuses,
  tasksCanonicalTypes,
} from "../points-tasks-parity";
import { createFetchTransport } from "../transport";
import type { ApiRequest, ApiResult, Transport } from "../types";

const pointListPayload = {
  as_of: "2026-08-08T06:00:00Z",
  data: [
    {
      entry_id: "pt_1001",
      account_id: "acct_123",
      entry_type: "award",
      source: "task",
      amount_points: 120,
      running_balance: 1120,
      status: "posted",
      occurred_at: "2026-08-08T05:41:22Z",
      reference_id: "ref_1001",
      task_id: "task_1001",
    },
  ],
  pagination: {
    limit: 50,
    has_more: false,
  },
} as const;

const pointSummaryPayload = {
  as_of: "2026-08-08T06:00:00Z",
  account_id: "acct_123",
  total_points: 1120,
  earned_points: 820,
  spent_points: 120,
  adjusted_points: 40,
  pending_points: 10,
  by_status: {
    posted: 12,
    pending: 1,
    reversed: 0,
    failed: 0,
  },
} as const;

const pointsOverviewPayload = {
  as_of: "2026-08-08T06:00:00Z",
  account_id: "acct_123",
  summary: pointSummaryPayload,
  recent_entries: pointListPayload.data,
} as const;

const taskListPayload = {
  as_of: "2026-08-08T06:00:00Z",
  data: [
    {
      task_id: "task_1001",
      account_id: "acct_123",
      title: "Review payout anomaly",
      type: "review",
      owner_id: "ops_analyst",
      status: "in_progress",
      progress_percent: 45,
      created_at: "2026-08-07T01:00:00Z",
      updated_at: "2026-08-08T05:55:00Z",
      due_at: "2026-08-09T00:00:00Z",
    },
  ],
  pagination: {
    limit: 50,
    has_more: false,
  },
} as const;

const taskSummaryPayload = {
  as_of: "2026-08-08T06:00:00Z",
  account_id: "acct_123",
  total: 24,
  open: 4,
  in_progress: 8,
  done: 10,
  failed: 2,
  by_status: {
    open: 4,
    in_progress: 8,
    done: 10,
    failed: 2,
    blocked: 0,
    canceled: 0,
  },
} as const;

const tasksOverviewPayload = {
  as_of: "2026-08-08T06:00:00Z",
  account_id: "acct_123",
  summary: taskSummaryPayload,
  recent_tasks: taskListPayload.data,
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
  if (request.path.startsWith(pointsTasksRouteMap.listPointEntries)) {
    return { ok: true, data: pointListPayload };
  }
  if (request.path.startsWith(pointsTasksRouteMap.getPointSummary)) {
    return { ok: true, data: pointSummaryPayload };
  }
  if (request.path.startsWith(pointsTasksRouteMap.getPointsOverview)) {
    return { ok: true, data: pointsOverviewPayload };
  }
  if (request.path.startsWith(pointsTasksRouteMap.getTaskSummary)) {
    return { ok: true, data: taskSummaryPayload };
  }
  if (request.path.startsWith(pointsTasksRouteMap.getTasksOverview)) {
    return { ok: true, data: tasksOverviewPayload };
  }
  if (request.path.startsWith(pointsTasksRouteMap.listTasks)) {
    return { ok: true, data: taskListPayload };
  }
  if (request.path === pointsTasksRouteMap.status || request.path === pointsTasksRouteMap.getParityDiagnostics) {
    return {
      ok: true,
      data: {
        status: "ok",
        checks: [],
      },
    };
  }

  return { ok: false, error: { code: "unhandled", message: "Unhandled route", retryable: false, source: "mock" } };
}

test("method to endpoint mapping uses canonical paths and required headers", async () => {
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
    pagination: { limit: 25, cursor: "cursor-token", page: 7 },
    sort: { field: "timestamp", direction: "desc" },
    filters: {
      status: "posted",
      type: "award",
      source: "task",
      search: "ref_1001",
      dateRange: {
        from: "2026-08-01",
        to: "2026-08-08",
      },
    },
  });

  await client.pointsTasks.getPointSummary({
    accountId: "acct_123",
    filters: {
      status: "posted",
    },
  });

  await client.pointsTasks.getPointsOverview({ accountId: "acct_123" });

  await client.pointsTasks.listTasks({
    accountId: "acct_123",
    pagination: { limit: 20, page: 3 },
    sort: { field: "updated_at", direction: "asc" },
    filters: {
      status: "in_progress",
      type: "review",
      ownerId: "ops_analyst",
      search: "anomaly",
      dateRange: {
        from: "2026-08-01",
        to: "2026-08-10",
      },
    },
  });

  await client.pointsTasks.getTaskSummary({ accountId: "acct_123", filters: { status: "in_progress" } });
  await client.pointsTasks.getTasksOverview({ accountId: "acct_123" });
  await client.pointsTasks.getParityDiagnostics();

  assert.equal(calls[0]?.method, "GET");
  assert.equal(calls[0]?.path.startsWith(pointsTasksRouteMap.listPointEntries), true);
  assert.equal(calls[0]?.path.includes("account_id=acct_123"), true);
  assert.equal(calls[0]?.path.includes("cursor=cursor-token"), true);
  assert.equal(calls[0]?.path.includes("page=7"), false);

  assert.equal(calls[3]?.path.startsWith(pointsTasksRouteMap.listTasks), true);
  assert.equal(calls[3]?.path.includes("account_id=acct_123"), true);
  assert.equal(calls[3]?.path.includes("page=3"), true);

  assert.equal(calls[6]?.path, pointsTasksRouteMap.status);

  for (const call of calls) {
    assert.equal(call.headers?.["x-request-id"], "request-fixed");
    assert.equal(call.headers?.["x-correlation-id"], "correlation-fixed");
  }

  for (const call of calls.filter((entry) => !entry.path.startsWith(pointsTasksRouteMap.status))) {
    assert.equal((call.headers?.authorization ?? "").startsWith("Bearer "), true);
  }
});

test("required account_id is enforced for account-scoped points/tasks endpoints", async () => {
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

  assert.equal(calls.length, 0);
});

test("non-status routes require bearer auth while status route remains auth-optional", async () => {
  const { transport, calls } = createCaptureTransport((request) => canonicalRouteHandler(request));
  const client = createApiClient({
    mode: "http",
    baseUrl: "https://points-tasks.example",
    transport,
    pointsTasks: {
      requestIdProvider: () => "request-health",
      correlationIdProvider: () => "correlation-health",
      defaultAccountId: "acct_123",
      connectivityPath: pointsTasksRouteMap.status,
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
  assert.equal(calls[0]?.path, pointsTasksRouteMap.status);
  assert.equal(calls[0]?.headers?.authorization, undefined);
  assert.equal(calls[0]?.headers?.["x-request-id"], "request-health");
  assert.equal(calls[0]?.headers?.["x-correlation-id"], "correlation-health");
});

test("request serialization keeps canonical filters/sort and cursor-first pagination", async () => {
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
      type: "award",
      status: "posted",
      source: "task",
      search: "ref-123",
      dateRange: { from: "2026-08-01", to: "2026-08-08" },
    },
    pagination: {
      limit: 30,
      cursor: "cursor-100",
      page: 4,
    },
    sort: {
      field: "balance",
      direction: "asc",
    },
  });

  await client.pointsTasks.listTasks({
    accountId: "acct_123",
    filters: {
      status: "in_progress",
      type: "review",
      ownerId: "ops_analyst",
      search: "queue",
      dateRange: { from: "2026-08-02", to: "2026-08-09" },
    },
    pagination: {
      limit: 15,
      page: 2,
    },
    sort: {
      field: "due_at",
      direction: "desc",
    },
  });

  assert.equal(calls[0]?.path.includes("type=award"), true);
  assert.equal(calls[0]?.path.includes("status=posted"), true);
  assert.equal(calls[0]?.path.includes("source=task"), true);
  assert.equal(calls[0]?.path.includes("search=ref-123"), true);
  assert.equal(calls[0]?.path.includes("from=2026-08-01"), true);
  assert.equal(calls[0]?.path.includes("to=2026-08-08"), true);
  assert.equal(calls[0]?.path.includes("sort_by=balance"), true);
  assert.equal(calls[0]?.path.includes("sort_order=asc"), true);
  assert.equal(calls[0]?.path.includes("cursor=cursor-100"), true);
  assert.equal(calls[0]?.path.includes("page=4"), false);

  assert.equal(calls[1]?.path.includes("status=in_progress"), true);
  assert.equal(calls[1]?.path.includes("type=review"), true);
  assert.equal(calls[1]?.path.includes("owner_id=ops_analyst"), true);
  assert.equal(calls[1]?.path.includes("search=queue"), true);
  assert.equal(calls[1]?.path.includes("due_from=2026-08-02"), true);
  assert.equal(calls[1]?.path.includes("due_to=2026-08-09"), true);
  assert.equal(calls[1]?.path.includes("sort_by=due_at"), true);
  assert.equal(calls[1]?.path.includes("sort_order=desc"), true);
  assert.equal(calls[1]?.path.includes("page=2"), true);
});

test("DTO decoding validates canonical fixtures and rejects invalid enums", async () => {
  const { transport } = createCaptureTransport((request) => {
    if (request.path.startsWith(pointsTasksRouteMap.listTasks)) {
      return {
        ok: true,
        data: {
          ...taskListPayload,
          data: [{ ...taskListPayload.data[0], status: "INVALID" }],
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

  assert.equal(points.items[0]?.type, "award");
  assert.equal(points.items[0]?.source, "task");

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

test("deprecated field compatibility normalizes point balance and task progress", async () => {
  const { transport } = createCaptureTransport((request) => {
    if (request.path.startsWith(pointsTasksRouteMap.listPointEntries)) {
      return {
        ok: true,
        data: {
          as_of: "2026-08-08T06:00:00Z",
          data: [
            {
              entry_id: "pt_legacy_1",
              account_id: "acct_123",
              entry_type: "adjustment",
              source: "manual",
              amount_points: 5,
              balance_after: 1005,
              status: "pending",
              occurred_at: "2026-08-08T05:00:00Z",
            },
          ],
          pagination: { limit: 10, has_more: false },
        },
      };
    }

    if (request.path.startsWith(pointsTasksRouteMap.listTasks)) {
      return {
        ok: true,
        data: {
          as_of: "2026-08-08T06:00:00Z",
          data: [
            {
              task_id: "task_legacy_1",
              account_id: "acct_123",
              title: "Legacy progress source",
              type: "operations",
              owner: "ops_legacy",
              status: "open",
              progress: 33,
              created_at: "2026-08-07T01:00:00Z",
              updated_at: "2026-08-08T05:55:00Z",
            },
          ],
          pagination: { limit: 10, has_more: false },
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
  const tasks = await client.pointsTasks.listTasks({
    accountId: "acct_123",
    pagination: { limit: 10 },
  });

  assert.equal(points.items[0]?.balance, 1005);
  assert.equal(points.items[0]?.balanceAfter, 1005);
  assert.equal(tasks.items[0]?.progressPercent, 33);
  assert.equal(tasks.items[0]?.progress, 33);
});

test("canonical error normalization preserves points/tasks error envelope", async () => {
  const normalized = normalizeApiError({
    status: 403,
    code: "http_request_failed",
    message: "Forbidden",
    details: {
      code: "forbidden",
      message: "points scope denied",
      retryable: false,
      source: "points-tasks-api",
      details: {
        reason_codes: ["scope_denied"],
      },
    },
  });

  assert.equal(normalized.code, "forbidden");
  assert.equal(normalized.message, "points scope denied");
  assert.equal(normalized.retryable, false);
  assert.equal(normalized.source, "points-tasks-api");
  assert.equal(normalized.status, 403);

  const transport = createFetchTransport({
    baseUrl: "https://points-tasks.example",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          code: "unauthorized",
          message: "bearer token is required",
          retryable: false,
          source: "points-tasks-api",
          details: {
            parameter: "authorization",
          },
        }),
        {
          status: 401,
          statusText: "Unauthorized",
          headers: { "content-type": "application/json" },
        },
      ),
  });

  const response = await transport.request<unknown>({ method: "GET", path: pointsTasksRouteMap.listTasks });
  assert.equal(response.ok, false);
  if (!response.ok) {
    assert.equal(response.error.code, "unauthorized");
    assert.equal(response.error.retryable, false);
    assert.equal(response.error.source, "points-tasks-api");
  }
});

test("enum parity keeps canonical points/tasks constants aligned", () => {
  assert.deepEqual(pointsCanonicalEntryTypes, ["award", "spend", "adjustment", "reversal"]);
  assert.deepEqual(pointsCanonicalEntryStatuses, ["posted", "pending", "reversed", "failed"]);
  assert.deepEqual(pointsCanonicalEntrySources, ["ledger", "task", "manual", "bonus"]);
  assert.deepEqual(tasksCanonicalTypes, ["verification", "review", "reward", "operations"]);
  assert.deepEqual(tasksCanonicalStatuses, ["open", "in_progress", "done", "failed", "blocked", "canceled"]);
  assert.deepEqual(pointsTasksCanonicalErrorCodes, [
    "invalid_request",
    "unauthorized",
    "forbidden",
    "not_found",
    "rate_limited",
    "service_unavailable",
    "internal_error",
  ]);

  assert.deepEqual(pointEntryTypes, ["award", "spend", "adjustment", "reversal"]);
  assert.deepEqual(pointEntryStatuses, ["posted", "pending", "reversed", "failed"]);
  assert.deepEqual(pointEntrySources, ["ledger", "task", "manual", "bonus"]);
  assert.deepEqual(taskTypes, ["verification", "review", "reward", "operations"]);
  assert.deepEqual(taskStatuses, ["open", "in_progress", "done", "failed", "blocked", "canceled"]);
});

test(
  "optional points/tasks connectivity smoke probe",
  {
    skip: !process.env.RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_URL,
  },
  async () => {
    const baseUrl = process.env.RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_URL as string;
    const path = process.env.RYVRA_POINTS_TASKS_CONNECTIVITY_SMOKE_PATH ?? pointsTasksRouteMap.status;
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

test("decode list response shape keeps canonical items and pagination keys", () => {
  const decodedPoints = {
    asOf: pointListPayload.as_of,
    items: [...pointListPayload.data],
    pagination: {
      limit: pointListPayload.pagination.limit,
      hasMore: pointListPayload.pagination.has_more,
    },
  } satisfies PointsListResponse<unknown>;

  const decodedTasks = {
    asOf: taskListPayload.as_of,
    items: [...taskListPayload.data],
    pagination: {
      limit: taskListPayload.pagination.limit,
      hasMore: taskListPayload.pagination.has_more,
    },
  } satisfies TasksListResponse<unknown>;

  assert.equal(typeof decodedPoints.asOf, "string");
  assert.equal(Array.isArray(decodedPoints.items), true);
  assert.equal(typeof decodedPoints.pagination.limit, "number");
  assert.equal(typeof decodedTasks.asOf, "string");
  assert.equal(Array.isArray(decodedTasks.items), true);
  assert.equal(typeof decodedTasks.pagination.limit, "number");
});
