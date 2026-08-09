"use client";

import {
  taskProgressStates,
  taskStatuses,
  taskTypes,
  type TaskDto,
  type TasksPaginationMeta,
} from "@ryvra/domain-tasks";
import { Button, Card, DataTable, useNotificationCenter, themeTokens } from "@ryvra/ui";
import { useDeferredValue, useEffect } from "react";
import { formatDateTime, formatNumber } from "../lib/format";
import { buildTaskStatusNotification } from "../lib/notification-comms";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface TasksTableClientProps {
  items: TaskDto[];
  pagination: TasksPaginationMeta;
}

const statusOptions = ["ALL", ...taskStatuses] as const;
const typeOptions = ["ALL", ...taskTypes] as const;
const progressStateOptions = ["ALL", ...taskProgressStates] as const;
const sortFieldOptions = [
  { value: "updated_at", label: "Updated time" },
  { value: "created_at", label: "Created time" },
  { value: "due_at", label: "Due time" },
] as const;

function parseSortParam(sortValue: string | null): { field: "updated_at" | "created_at" | "due_at"; direction: "asc" | "desc" } {
  const [field, direction] = (sortValue ?? "updated_at:desc").split(":");
  const normalizedField = field === "created_at" || field === "due_at" ? field : "updated_at";
  const normalizedDirection = direction === "asc" ? "asc" : "desc";

  return {
    field: normalizedField,
    direction: normalizedDirection,
  };
}

export function TasksTableClient({ items, pagination }: TasksTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();
  const { addNotification } = useNotificationCenter();

  const statusParam = (searchParams.get("task_status") ?? searchParams.get("status") ?? "ALL").toLowerCase();
  const typeParam = (searchParams.get("task_type") ?? searchParams.get("type") ?? "ALL").toLowerCase();
  const progressStateParam = (searchParams.get("progress_state") ?? "ALL").toLowerCase();
  const dueAfter = searchParams.get("due_after") ?? "";
  const dueBefore = searchParams.get("due_before") ?? "";
  const sort = parseSortParam(searchParams.get("sort"));

  const status = statusOptions.includes(statusParam as (typeof statusOptions)[number]) ? statusParam : "ALL";
  const type = typeOptions.includes(typeParam as (typeof typeOptions)[number]) ? typeParam : "ALL";
  const progressState = progressStateOptions.includes(progressStateParam as (typeof progressStateOptions)[number])
    ? progressStateParam
    : "ALL";

  const hasFilters =
    status !== "ALL" ||
    type !== "ALL" ||
    progressState !== "ALL" ||
    dueAfter.length > 0 ||
    dueBefore.length > 0 ||
    sort.field !== "updated_at" ||
    sort.direction !== "desc";

  const deferredItems = useDeferredValue(items);
  const visibleRows = deferredItems;
  const rowsPending = deferredItems !== items;

  useEffect(() => {
    for (const task of items.slice(0, 25)) {
      addNotification(buildTaskStatusNotification(task));
    }
  }, [addNotification, items]);

  const updateSort = (field: string, direction: string) => {
    const normalizedField = field === "created_at" || field === "due_at" ? field : "updated_at";
    const normalizedDirection = direction === "asc" ? "asc" : "desc";
    updateQuery({ sort: `${normalizedField}:${normalizedDirection}`, sortBy: undefined, sortOrder: undefined, sortField: undefined, sortDirection: undefined });
  };

  return (
    <section aria-labelledby="tasks-table-title" style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .tasks-filter-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
        }

        .tasks-filter-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>

      <h3 id="tasks-table-title" style={{ margin: 0, fontSize: themeTokens.typography.size.lg }}>
        Task feed
      </h3>

      <Card>
        <form
          aria-label="Task filters"
          onSubmit={(event) => event.preventDefault()}
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Status</span>
            <select
              className="tasks-filter-control"
              value={status}
              onChange={(event) => updateQuery({ task_status: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value, status: undefined })}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Type</span>
            <select
              className="tasks-filter-control"
              value={type}
              onChange={(event) => updateQuery({ task_type: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value, type: undefined })}
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Progress state</span>
            <select
              className="tasks-filter-control"
              value={progressState}
              onChange={(event) =>
                updateQuery({ progress_state: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })
              }
            >
              {progressStateOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Due after</span>
            <input
              className="tasks-filter-control"
              type="date"
              value={dueAfter}
              onChange={(event) => updateQuery({ due_after: event.currentTarget.value || undefined, from: undefined })}
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Due before</span>
            <input
              className="tasks-filter-control"
              type="date"
              value={dueBefore}
              onChange={(event) => updateQuery({ due_before: event.currentTarget.value || undefined, to: undefined })}
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Sort by</span>
            <select
              className="tasks-filter-control"
              value={sort.field}
              onChange={(event) => updateSort(event.currentTarget.value, sort.direction)}
            >
              {sortFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Direction</span>
            <select className="tasks-filter-control" value={sort.direction} onChange={(event) => updateSort(sort.field, event.currentTarget.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                clearQuery([
                  "task_status",
                  "status",
                  "task_type",
                  "type",
                  "progress_state",
                  "due_after",
                  "due_before",
                  "from",
                  "to",
                  "sort",
                  "sortBy",
                  "sortOrder",
                  "sortField",
                  "sortDirection",
                  "cursor",
                  "page",
                ])
              }
              disabled={!hasFilters}
              aria-describedby={!hasFilters ? "tasks-reset-hint" : undefined}
            >
              Reset filters
            </Button>
          </div>
        </form>
        {!hasFilters ? (
          <p id="tasks-reset-hint" style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Reset is disabled because no filters are currently applied.
          </p>
        ) : null}
      </Card>

      <DataTable<TaskDto>
        caption="Tasks"
        columns={[
          { key: "taskId", header: "Task id" },
          { key: "title", header: "Title" },
          { key: "taskType", header: "Type", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "taskStatus", header: "Status", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "progressState", header: "Progress state", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "progressPercent", header: "Progress", render: (value) => `${formatNumber(Number(value), 0)}%` },
          { key: "pointsReward", header: "Points reward", render: (value) => formatNumber(Number(value)) },
          { key: "dueAt", header: "Due", render: (value) => (value ? formatDateTime(String(value)) : "n/a") },
          { key: "completedAt", header: "Completed", render: (value) => (value ? formatDateTime(String(value)) : "n/a") },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.taskId}
        emptyMessage="No tasks match the selected filters."
      />

      {rowsPending ? (
        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          Refreshing table rows…
        </p>
      ) : null}

      {visibleRows.length === 0 ? (
        <Card title="No tasks found">
          <p style={{ marginTop: 0 }}>Try broadening filters or clearing cursor/page context.</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => clearQuery(["task_status", "task_type", "progress_state", "due_after", "due_before", "cursor", "page"])}
          >
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Tasks pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Showing {visibleRows.length} tasks • limit {pagination.limit}
        </span>
        {pagination.hasMore && pagination.nextCursor ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => updateQuery({ cursor: pagination.nextCursor, page: undefined }, { resetPagination: false })}
          >
            Next
          </Button>
        ) : (
          <span style={{ color: themeTokens.color.textMuted }}>No further cursor pages available.</span>
        )}
      </div>
    </section>
  );
}
