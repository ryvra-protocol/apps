"use client";

import { taskStatuses, taskTypes, type TaskDto, type TasksPaginationMeta } from "@ryvra/domain-tasks";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useMemo } from "react";
import { formatDateTime, formatNumber } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface TasksTableClientProps {
  items: TaskDto[];
  pagination: TasksPaginationMeta;
}

const statusOptions = ["ALL", ...taskStatuses] as const;
const typeOptions = ["ALL", ...taskTypes] as const;
const sortFieldOptions = [
  { value: "updated_at", label: "Updated time" },
  { value: "due_at", label: "Due time" },
  { value: "progress_percent", label: "Progress" },
  { value: "status", label: "Status" },
] as const;

export function TasksTableClient({ items, pagination }: TasksTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const statusParam = (searchParams.get("status") ?? "ALL").toLowerCase();
  const typeParam = (searchParams.get("type") ?? "ALL").toLowerCase();
  const ownerId = searchParams.get("ownerId") ?? searchParams.get("owner") ?? "";
  const searchValue = searchParams.get("search") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sortField = searchParams.get("sortBy") ?? "updated_at";
  const sortDirection = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const status = statusOptions.includes(statusParam as (typeof statusOptions)[number]) ? statusParam : "ALL";
  const type = typeOptions.includes(typeParam as (typeof typeOptions)[number]) ? typeParam : "ALL";

  const hasFilters =
    status !== "ALL" ||
    type !== "ALL" ||
    ownerId.length > 0 ||
    searchValue.length > 0 ||
    from.length > 0 ||
    to.length > 0 ||
    sortField !== "updated_at" ||
    sortDirection !== "desc";

  const visibleRows = useMemo(() => [...items], [items]);

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
              onChange={(event) => updateQuery({ status: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
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
              onChange={(event) => updateQuery({ type: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Owner</span>
            <input
              className="tasks-filter-control"
              type="search"
              value={ownerId}
              onChange={(event) => updateQuery({ ownerId: event.currentTarget.value || undefined, owner: undefined })}
              placeholder="owner id"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Search</span>
            <input
              className="tasks-filter-control"
              type="search"
              value={searchValue}
              onChange={(event) => updateQuery({ search: event.currentTarget.value || undefined })}
              placeholder="task id or title"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>From</span>
            <input className="tasks-filter-control" type="date" value={from} onChange={(event) => updateQuery({ from: event.currentTarget.value || undefined })} />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>To</span>
            <input className="tasks-filter-control" type="date" value={to} onChange={(event) => updateQuery({ to: event.currentTarget.value || undefined })} />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Sort by</span>
            <select className="tasks-filter-control" value={sortField} onChange={(event) => updateQuery({ sortBy: event.currentTarget.value })}>
              {sortFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Direction</span>
            <select className="tasks-filter-control" value={sortDirection} onChange={(event) => updateQuery({ sortOrder: event.currentTarget.value })}>
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
                  "status",
                  "type",
                  "owner",
                  "ownerId",
                  "search",
                  "from",
                  "to",
                  "sortBy",
                  "sortOrder",
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
          { key: "id", header: "Task id" },
          { key: "title", header: "Title" },
          { key: "type", header: "Type", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "ownerId", header: "Owner" },
          { key: "status", header: "Status", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "progressPercent", header: "Progress", render: (value) => `${formatNumber(Number(value), 0)}%` },
          { key: "dueAt", header: "Due", render: (value) => (value ? formatDateTime(String(value)) : "n/a") },
          { key: "completedAt", header: "Completed", render: (value) => (value ? formatDateTime(String(value)) : "n/a") },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.id}
        emptyMessage="No tasks match the selected filters."
      />

      {visibleRows.length === 0 ? (
        <Card title="No tasks found">
          <p style={{ marginTop: 0 }}>Try broadening filters or clearing cursor/page context.</p>
          <Button type="button" variant="secondary" onClick={() => clearQuery(["status", "type", "owner", "ownerId", "search", "from", "to", "cursor", "page"])}>
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
