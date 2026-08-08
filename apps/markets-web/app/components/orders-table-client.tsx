"use client";

import {
  marketOrderStatuses,
  marketOrderTypes,
  marketSides,
  type MarketsPaginationMeta,
  type OrderDto,
} from "@ryvra/domain-markets";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useMemo } from "react";
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
const sortFieldOptions = [
  { value: "createdAt", label: "Created time" },
  { value: "updatedAt", label: "Updated time" },
  { value: "status", label: "Status" },
  { value: "symbol", label: "Symbol" },
] as const;

export function OrdersTableClient({ items, pagination }: OrdersTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const statusParam = (searchParams.get("status") ?? "ALL").toLowerCase();
  const sideParam = (searchParams.get("side") ?? "ALL").toLowerCase();
  const typeParam = (searchParams.get("type") ?? "ALL").toLowerCase();
  const search = searchParams.get("search") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const sortField = searchParams.get("sortField") ?? "createdAt";
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";

  const status = statusOptions.includes(statusParam as (typeof statusOptions)[number]) ? statusParam : "ALL";
  const side = sideOptions.includes(sideParam as (typeof sideOptions)[number]) ? sideParam : "ALL";
  const type = typeOptions.includes(typeParam as (typeof typeOptions)[number]) ? typeParam : "ALL";

  const hasFilters =
    status !== "ALL" ||
    side !== "ALL" ||
    type !== "ALL" ||
    search.length > 0 ||
    from.length > 0 ||
    to.length > 0 ||
    sortField !== "createdAt" ||
    sortDirection !== "desc";

  const visibleRows = useMemo(() => [...items], [items]);
  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

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
            <span>Search</span>
            <input
              className="markets-filter-control"
              type="search"
              value={search}
              onChange={(event) => updateQuery({ search: event.currentTarget.value || undefined })}
              placeholder="Order id, reference, symbol"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>From date</span>
            <input className="markets-filter-control" type="date" value={from} onChange={(event) => updateQuery({ from: event.currentTarget.value || undefined })} />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>To date</span>
            <input className="markets-filter-control" type="date" value={to} onChange={(event) => updateQuery({ to: event.currentTarget.value || undefined })} />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Sort by</span>
            <select className="markets-filter-control" value={sortField} onChange={(event) => updateQuery({ sortField: event.currentTarget.value })}>
              {sortFieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Direction</span>
            <select className="markets-filter-control" value={sortDirection} onChange={(event) => updateQuery({ sortDirection: event.currentTarget.value })}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["status", "side", "type", "search", "from", "to", "sortField", "sortDirection", "page"])}
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
            key: "quantity",
            header: "Qty / Notional",
            render: (value, row) => `${value} / ${row.notionalValue}`,
          },
          {
            key: "status",
            header: "Status",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          {
            key: "createdAt",
            header: "Timestamp",
            render: (value) => formatDateTime(String(value)),
          },
        ]}
        rows={visibleRows}
        getRowKey={(row) => row.id}
        emptyMessage="No orders match the selected filters."
      />

      {visibleRows.length === 0 ? (
        <Card title="No orders found">
          <p style={{ marginTop: 0 }}>Try broadening the date range or clearing side/type filters.</p>
          <Button type="button" variant="secondary" onClick={() => clearQuery(["status", "side", "type", "search", "from", "to", "page"])}>
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Order pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Page {pagination.page} of {pagination.totalPages} • {pagination.total} total orders
        </span>
        {canGoPrev ? (
          <Button type="button" variant="secondary" onClick={() => updateQuery({ page: String(pagination.page - 1) }, { resetPage: false })}>
            Previous
          </Button>
        ) : (
          <span style={{ color: themeTokens.color.textMuted }}>Previous page unavailable on first page.</span>
        )}
        {canGoNext ? (
          <Button type="button" variant="secondary" onClick={() => updateQuery({ page: String(pagination.page + 1) }, { resetPage: false })}>
            Next
          </Button>
        ) : (
          <span style={{ color: themeTokens.color.textMuted }}>No further pages available.</span>
        )}
      </div>
    </section>
  );
}
