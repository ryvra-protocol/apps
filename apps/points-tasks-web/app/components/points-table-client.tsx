"use client";

import {
  pointEntrySources,
  pointEntryStatuses,
  pointEntryTypes,
  type PointEntryDto,
  type PointsPaginationMeta,
} from "@ryvra/domain-points";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useMemo } from "react";
import { formatDateTime, formatNumber, formatSignedPoints } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface PointsTableClientProps {
  items: PointEntryDto[];
  pagination: PointsPaginationMeta;
}

const statusOptions = ["ALL", ...pointEntryStatuses] as const;
const typeOptions = ["ALL", ...pointEntryTypes] as const;
const sourceOptions = ["ALL", ...pointEntrySources] as const;
const sortFieldOptions = [
  { value: "timestamp", label: "Timestamp" },
  { value: "amount", label: "Amount" },
  { value: "balance", label: "Balance" },
  { value: "status", label: "Status" },
] as const;

export function PointsTableClient({ items, pagination }: PointsTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const statusParam = (searchParams.get("status") ?? "ALL").toLowerCase();
  const typeParam = (searchParams.get("type") ?? searchParams.get("entryType") ?? "ALL").toLowerCase();
  const sourceParam = (searchParams.get("source") ?? "ALL").toLowerCase();
  const searchValue = searchParams.get("search") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sortField = searchParams.get("sortBy") ?? "timestamp";
  const sortDirection = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const status = statusOptions.includes(statusParam as (typeof statusOptions)[number]) ? statusParam : "ALL";
  const type = typeOptions.includes(typeParam as (typeof typeOptions)[number]) ? typeParam : "ALL";
  const source = sourceOptions.includes(sourceParam as (typeof sourceOptions)[number]) ? sourceParam : "ALL";

  const hasFilters =
    status !== "ALL" ||
    type !== "ALL" ||
    source !== "ALL" ||
    searchValue.length > 0 ||
    from.length > 0 ||
    to.length > 0 ||
    sortField !== "timestamp" ||
    sortDirection !== "desc";

  const visibleRows = useMemo(() => [...items], [items]);

  return (
    <section aria-labelledby="points-table-title" style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .points-filter-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
        }

        .points-filter-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>

      <h3 id="points-table-title" style={{ margin: 0, fontSize: themeTokens.typography.size.lg }}>
        Points ledger
      </h3>

      <Card>
        <form
          aria-label="Point entry filters"
          onSubmit={(event) => event.preventDefault()}
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Status</span>
            <select
              className="points-filter-control"
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
              className="points-filter-control"
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
            <span>Source</span>
            <select
              className="points-filter-control"
              value={source}
              onChange={(event) => updateQuery({ source: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Search</span>
            <input
              className="points-filter-control"
              type="search"
              value={searchValue}
              onChange={(event) => updateQuery({ search: event.currentTarget.value || undefined })}
              placeholder="entry id, reference, task"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>From</span>
            <input className="points-filter-control" type="date" value={from} onChange={(event) => updateQuery({ from: event.currentTarget.value || undefined })} />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>To</span>
            <input className="points-filter-control" type="date" value={to} onChange={(event) => updateQuery({ to: event.currentTarget.value || undefined })} />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Sort by</span>
            <select className="points-filter-control" value={sortField} onChange={(event) => updateQuery({ sortBy: event.currentTarget.value })}>
              {sortFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Direction</span>
            <select className="points-filter-control" value={sortDirection} onChange={(event) => updateQuery({ sortOrder: event.currentTarget.value })}>
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
                  "entryType",
                  "source",
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
              aria-describedby={!hasFilters ? "points-reset-hint" : undefined}
            >
              Reset filters
            </Button>
          </div>
        </form>
        {!hasFilters ? (
          <p id="points-reset-hint" style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Reset is disabled because no filters are currently applied.
          </p>
        ) : null}
      </Card>

      <DataTable<PointEntryDto>
        caption="Point entries"
        columns={[
          { key: "id", header: "Entry id" },
          { key: "type", header: "Type", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "source", header: "Source" },
          { key: "amount", header: "Amount", render: (value) => formatSignedPoints(Number(value)) },
          { key: "balance", header: "Balance", render: (value) => formatNumber(Number(value)) },
          {
            key: "timestamp",
            header: "Timestamp",
            render: (value) => formatDateTime(String(value)),
          },
          { key: "status", header: "Status", render: (value) => <StatusBadge status={String(value)} /> },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.id}
        emptyMessage="No points entries match the selected filters."
      />

      {visibleRows.length === 0 ? (
        <Card title="No points entries found">
          <p style={{ marginTop: 0 }}>Try broadening filters or clearing cursor/page context.</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => clearQuery(["status", "type", "entryType", "source", "search", "from", "to", "cursor", "page"])}
          >
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Points pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Showing {visibleRows.length} entries • limit {pagination.limit}
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
