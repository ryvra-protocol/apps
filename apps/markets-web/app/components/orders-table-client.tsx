"use client";

import {
  marketOrderStatuses,
  marketOrderTypes,
  marketPolicyDecisions,
  marketSides,
  type MarketsPaginationMeta,
  type OrderDto,
} from "@ryvra/domain-markets";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useDeferredValue } from "react";
import { formatDateTime } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface OrdersTableClientProps {
  items: OrderDto[];
  pagination: MarketsPaginationMeta;
}

const statusOptions = ["ALL", ...marketOrderStatuses] as const;
const sideOptions = ["ALL", ...marketSides] as const;
const typeOptions = ["ALL", ...marketOrderTypes] as const;
const policyOptions = ["ALL", ...marketPolicyDecisions] as const;
const sortFieldOptions = [
  { value: "updated_at", label: "Updated time" },
  { value: "created_at", label: "Created time" },
  { value: "status", label: "Status" },
] as const;

export function OrdersTableClient({ items, pagination }: OrdersTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const statusParam = (searchParams.get("status") ?? "ALL").toLowerCase();
  const sideParam = (searchParams.get("side") ?? "ALL").toLowerCase();
  const typeParam = (searchParams.get("type") ?? "ALL").toLowerCase();
  const policyParam = (searchParams.get("policyDecision") ?? "ALL").toUpperCase();
  const referenceId = searchParams.get("referenceId") ?? searchParams.get("search") ?? "";
  const createdAfter = searchParams.get("createdAfter") ?? searchParams.get("from") ?? "";
  const createdBefore = searchParams.get("createdBefore") ?? searchParams.get("to") ?? "";
  const sortField = searchParams.get("sortBy") ?? "updated_at";
  const sortDirection = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const status = statusOptions.includes(statusParam as (typeof statusOptions)[number]) ? statusParam : "ALL";
  const side = sideOptions.includes(sideParam as (typeof sideOptions)[number]) ? sideParam : "ALL";
  const type = typeOptions.includes(typeParam as (typeof typeOptions)[number]) ? typeParam : "ALL";
  const policyDecision = policyOptions.includes(policyParam as (typeof policyOptions)[number]) ? policyParam : "ALL";

  const hasFilters =
    status !== "ALL" ||
    side !== "ALL" ||
    type !== "ALL" ||
    policyDecision !== "ALL" ||
    referenceId.length > 0 ||
    createdAfter.length > 0 ||
    createdBefore.length > 0 ||
    sortField !== "updated_at" ||
    sortDirection !== "desc";

  const deferredItems = useDeferredValue(items);
  const visibleRows = deferredItems;
  const rowsPending = deferredItems !== items;

  return (
    <section aria-labelledby="orders-table-title" style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .markets-filter-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
        }

        .markets-filter-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>

      <h3 id="orders-table-title" style={{ margin: 0, fontSize: themeTokens.typography.size.lg }}>
        Order feed
      </h3>

      <Card>
        <form
          aria-label="Order filters"
          onSubmit={(event) => event.preventDefault()}
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Status</span>
            <select
              className="markets-filter-control"
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
            <span>Side</span>
            <select className="markets-filter-control" value={side} onChange={(event) => updateQuery({ side: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}>
              {sideOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Type</span>
            <select className="markets-filter-control" value={type} onChange={(event) => updateQuery({ type: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}>
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Policy decision</span>
            <select
              className="markets-filter-control"
              value={policyDecision}
              onChange={(event) => updateQuery({ policyDecision: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {policyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Reference ID</span>
            <input
              className="markets-filter-control"
              type="search"
              value={referenceId}
              onChange={(event) => updateQuery({ referenceId: event.currentTarget.value || undefined })}
              placeholder="ref_123"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Created after</span>
            <input
              className="markets-filter-control"
              type="datetime-local"
              value={createdAfter}
              onChange={(event) => updateQuery({ createdAfter: event.currentTarget.value || undefined })}
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Created before</span>
            <input
              className="markets-filter-control"
              type="datetime-local"
              value={createdBefore}
              onChange={(event) => updateQuery({ createdBefore: event.currentTarget.value || undefined })}
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Sort by</span>
            <select className="markets-filter-control" value={sortField} onChange={(event) => updateQuery({ sortBy: event.currentTarget.value })}>
              {sortFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Direction</span>
            <select className="markets-filter-control" value={sortDirection} onChange={(event) => updateQuery({ sortOrder: event.currentTarget.value })}>
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
                  "side",
                  "type",
                  "policyDecision",
                  "referenceId",
                  "search",
                  "createdAfter",
                  "createdBefore",
                  "from",
                  "to",
                  "sortBy",
                  "sortOrder",
                  "cursor",
                  "page",
                ])
              }
              disabled={!hasFilters}
              aria-describedby={!hasFilters ? "orders-reset-hint" : undefined}
            >
              Reset filters
            </Button>
          </div>
        </form>
        {!hasFilters ? (
          <p id="orders-reset-hint" style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Reset is disabled because no filters are currently applied.
          </p>
        ) : null}
      </Card>

      <DataTable<OrderDto>
        caption="Orders"
        columns={[
          { key: "id", header: "Order id" },
          { key: "side", header: "Side", render: (value) => <StatusBadge status={String(value)} /> },
          { key: "type", header: "Type" },
          {
            key: "size",
            header: "Size / Avg price",
            render: (value, row) => `${value} / ${row.avgExecutionPrice ?? "n/a"}`,
          },
          {
            key: "policyDecision",
            header: "Policy",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          {
            key: "status",
            header: "Status",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          {
            key: "updatedAt",
            header: "Updated",
            render: (value) => formatDateTime(String(value)),
          },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.id}
        emptyMessage="No orders match the selected filters."
      />

      {rowsPending ? (
        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          Refreshing table rows…
        </p>
      ) : null}

      {visibleRows.length === 0 ? (
        <Card title="No orders found">
          <p style={{ marginTop: 0 }}>Try broadening filters or clearing the cursor/page context.</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => clearQuery(["status", "side", "type", "policyDecision", "referenceId", "createdAfter", "createdBefore", "cursor", "page"])}
          >
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Order pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Showing {visibleRows.length} orders • limit {pagination.limit}
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
