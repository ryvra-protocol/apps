"use client";

import {
  pointEntrySources,
  pointEntryStatuses,
  pointEntryTypes,
  type PointEntryDto,
  type PointsPaginationMeta,
} from "@ryvra/domain-points";
import {
  Button,
  Card,
  DataTable,
  DelegationProvenanceChips,
  delegationViewFilters,
  matchesDelegationView,
  themeTokens,
} from "@ryvra/ui";
import { useDeferredValue } from "react";
import { buildPointEntryDelegationContext, supportsPointsDelegationVisibility } from "../lib/delegation-context";
import { formatDateTime, formatNumber, formatSignedPoints } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface PointsTableClientProps {
  items: PointEntryDto[];
  pagination: PointsPaginationMeta;
  currentUserId?: string;
}

const statusOptions = ["ALL", ...pointEntryStatuses] as const;
const typeOptions = ["ALL", ...pointEntryTypes] as const;
const sourceOptions = ["ALL", ...pointEntrySources] as const;
const sortFieldOptions = [
  { value: "occurred_at", label: "Occurred time" },
  { value: "created_at", label: "Created time" },
] as const;

function parseSortParam(sortValue: string | null): { field: "occurred_at" | "created_at"; direction: "asc" | "desc" } {
  const [field, direction] = (sortValue ?? "occurred_at:desc").split(":");
  const normalizedField = field === "created_at" ? "created_at" : "occurred_at";
  const normalizedDirection = direction === "asc" ? "asc" : "desc";

  return {
    field: normalizedField,
    direction: normalizedDirection,
  };
}

export function PointsTableClient({ items, pagination, currentUserId }: PointsTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const statusParam = (searchParams.get("entry_status") ?? searchParams.get("status") ?? "ALL").toLowerCase();
  const typeParam = (searchParams.get("entry_type") ?? searchParams.get("type") ?? "ALL").toLowerCase();
  const sourceParam = (searchParams.get("entry_source") ?? searchParams.get("source") ?? "ALL").toLowerCase();
  const occurredFrom = searchParams.get("occurred_from") ?? "";
  const occurredTo = searchParams.get("occurred_to") ?? "";
  const sort = parseSortParam(searchParams.get("sort"));
  const delegationParam = (searchParams.get("delegation") ?? "all").toLowerCase();

  const status = statusOptions.includes(statusParam as (typeof statusOptions)[number]) ? statusParam : "ALL";
  const type = typeOptions.includes(typeParam as (typeof typeOptions)[number]) ? typeParam : "ALL";
  const source = sourceOptions.includes(sourceParam as (typeof sourceOptions)[number]) ? sourceParam : "ALL";
  const delegationFilter = delegationViewFilters.includes(delegationParam as (typeof delegationViewFilters)[number])
    ? (delegationParam as (typeof delegationViewFilters)[number])
    : "all";
  const delegationAvailable = supportsPointsDelegationVisibility(items);
  const appliedDelegationFilter = delegationAvailable ? delegationFilter : "all";

  const hasFilters =
    status !== "ALL" ||
    type !== "ALL" ||
    source !== "ALL" ||
    occurredFrom.length > 0 ||
    occurredTo.length > 0 ||
    sort.field !== "occurred_at" ||
    sort.direction !== "desc" ||
    delegationFilter !== "all";

  const deferredItems = useDeferredValue(items);
  const visibleRows = deferredItems.filter((item) =>
    matchesDelegationView(buildPointEntryDelegationContext(item), appliedDelegationFilter, currentUserId),
  );
  const rowsPending = deferredItems !== items;

  const updateSort = (field: string, direction: string) => {
    const normalizedField = field === "created_at" ? "created_at" : "occurred_at";
    const normalizedDirection = direction === "asc" ? "asc" : "desc";
    updateQuery({ sort: `${normalizedField}:${normalizedDirection}`, sortBy: undefined, sortOrder: undefined, sortField: undefined, sortDirection: undefined });
  };

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
              onChange={(event) => updateQuery({ entry_status: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value, status: undefined })}
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
              onChange={(event) => updateQuery({ entry_type: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value, type: undefined })}
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
              onChange={(event) =>
                updateQuery({ entry_source: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value, source: undefined })
              }
            >
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Occurred from</span>
            <input
              className="points-filter-control"
              type="date"
              value={occurredFrom}
              onChange={(event) => updateQuery({ occurred_from: event.currentTarget.value || undefined, from: undefined })}
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Occurred to</span>
            <input
              className="points-filter-control"
              type="date"
              value={occurredTo}
              onChange={(event) => updateQuery({ occurred_to: event.currentTarget.value || undefined, to: undefined })}
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Sort by</span>
            <select
              className="points-filter-control"
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
            <select className="points-filter-control" value={sort.direction} onChange={(event) => updateSort(sort.field, event.currentTarget.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Delegation view</span>
            <select
              className="points-filter-control"
              value={delegationFilter}
              aria-label="Delegation filter"
              disabled={!delegationAvailable}
              onChange={(event) => updateQuery({ delegation: event.currentTarget.value === "all" ? undefined : event.currentTarget.value })}
            >
              <option value="all">All operations</option>
              <option value="mine">Mine</option>
              <option value="delegated_to_me">Delegated to me</option>
              <option value="delegated_by_me">Delegated by me</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                clearQuery([
                  "entry_status",
                  "status",
                  "entry_type",
                  "type",
                  "entry_source",
                  "source",
                  "occurred_from",
                  "occurred_to",
                  "from",
                  "to",
                  "sort",
                  "sortBy",
                  "sortOrder",
                  "sortField",
                  "sortDirection",
                  "delegation",
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
        {!delegationAvailable ? (
          <p style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Delegated actor metadata: Not available in current environment.
          </p>
        ) : null}
      </Card>

      <DataTable<PointEntryDto>
        caption="Point entries"
        columns={[
          { key: "entryId", header: "Entry id" },
          { key: "entryType", header: "Type", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "entrySource", header: "Source", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "pointsDelta", header: "Points delta", render: (value) => formatSignedPoints(Number(value)) },
          {
            key: "pointsBalanceAfter",
            header: "Balance after",
            render: (value) => (typeof value === "number" ? formatNumber(Number(value)) : "n/a"),
          },
          {
            key: "occurredAt",
            header: "Occurred",
            render: (value) => formatDateTime(String(value)),
          },
          {
            key: "createdAt",
            header: "Created",
            render: (value) => formatDateTime(String(value)),
          },
          { key: "entryStatus", header: "Status", render: (value) => <StatusBadge status={String(value)} /> },
          {
            key: "entryId",
            header: "Provenance",
            render: (_value, row) => <DelegationProvenanceChips context={buildPointEntryDelegationContext(row)} />,
          },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.entryId}
        emptyMessage="No points entries match the selected filters."
      />

      {rowsPending ? (
        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          Refreshing table rows…
        </p>
      ) : null}

      {visibleRows.length === 0 ? (
        <Card title="No points entries found">
          <p style={{ marginTop: 0 }}>Try broadening filters or clearing cursor/page context.</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              clearQuery(["entry_status", "entry_type", "entry_source", "occurred_from", "occurred_to", "delegation", "cursor", "page"])
            }
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
