"use client";

import {
  marketInstrumentAvailabilities,
  marketInstrumentClasses,
  marketInstrumentStatuses,
  type InstrumentDto,
  type MarketsPaginationMeta,
} from "@ryvra/domain-markets";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useMemo } from "react";
import { formatDateTime } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface InstrumentsTableClientProps {
  items: InstrumentDto[];
  pagination: MarketsPaginationMeta;
}

const classOptions = ["ALL", ...marketInstrumentClasses] as const;
const statusOptions = ["ALL", ...marketInstrumentStatuses] as const;
const availabilityOptions = ["ALL", ...marketInstrumentAvailabilities] as const;
const sortFieldOptions = [
  { value: "updated_at", label: "Updated" },
  { value: "symbol", label: "Symbol" },
  { value: "asset_class", label: "Asset class" },
] as const;

export function InstrumentsTableClient({ items, pagination }: InstrumentsTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const search = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const assetClassParam = (searchParams.get("assetClass") ?? "ALL").toLowerCase();
  const statusParam = (searchParams.get("status") ?? "ALL").toLowerCase();
  const availabilityParam = (searchParams.get("availability") ?? "ALL").toLowerCase();
  const sortField = searchParams.get("sortBy") ?? "updated_at";
  const sortDirection = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const assetClass = classOptions.includes(assetClassParam as (typeof classOptions)[number]) ? assetClassParam : "ALL";
  const status = statusOptions.includes(statusParam as (typeof statusOptions)[number]) ? statusParam : "ALL";
  const availability = availabilityOptions.includes(availabilityParam as (typeof availabilityOptions)[number])
    ? availabilityParam
    : "ALL";
  const hasFilters =
    search.length > 0 ||
    assetClass !== "ALL" ||
    status !== "ALL" ||
    availability !== "ALL" ||
    sortField !== "updated_at" ||
    sortDirection !== "desc";

  const visibleRows = useMemo(() => [...items], [items]);

  return (
    <section aria-labelledby="instruments-table-title" style={{ display: "grid", gap: themeTokens.spacing.md }}>
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

      <h3 id="instruments-table-title" style={{ margin: 0, fontSize: themeTokens.typography.size.lg }}>
        Instrument catalog
      </h3>

      <Card>
        <form
          aria-label="Instrument filters"
          onSubmit={(event) => event.preventDefault()}
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Search</span>
            <input
              className="markets-filter-control"
              type="search"
              value={search}
              onChange={(event) => updateQuery({ q: event.currentTarget.value || undefined })}
              placeholder="symbol, base, quote"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Class</span>
            <select
              className="markets-filter-control"
              value={assetClass}
              onChange={(event) => updateQuery({ assetClass: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

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
            <span>Availability</span>
            <select
              className="markets-filter-control"
              value={availability}
              onChange={(event) => updateQuery({ availability: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {availabilityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
            <span>Order</span>
            <select className="markets-filter-control" value={sortDirection} onChange={(event) => updateQuery({ sortOrder: event.currentTarget.value })}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["q", "search", "assetClass", "status", "availability", "sortBy", "sortOrder", "cursor", "page"])}
              disabled={!hasFilters}
              aria-describedby={!hasFilters ? "instruments-reset-hint" : undefined}
            >
              Reset filters
            </Button>
          </div>
        </form>

        {!hasFilters ? (
          <p id="instruments-reset-hint" style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Reset is disabled because no filters are currently applied.
          </p>
        ) : null}
      </Card>

      <DataTable<InstrumentDto>
        caption="Instruments"
        columns={[
          { key: "symbol", header: "Symbol" },
          {
            key: "baseAsset",
            header: "Pair",
            render: (_, row) => `${row.baseAsset.toUpperCase()} / ${row.quoteAsset.toUpperCase()}`,
          },
          { key: "assetClass", header: "Class" },
          { key: "availability", header: "Availability" },
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
        emptyMessage="No instruments match the selected filters."
      />

      {visibleRows.length === 0 ? (
        <Card title="No instruments found">
          <p style={{ marginTop: 0 }}>Adjust filters or clear search criteria to broaden the catalog.</p>
          <Button type="button" variant="secondary" onClick={() => clearQuery(["q", "search", "assetClass", "status", "availability", "cursor", "page"])}>
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Instrument pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Showing {visibleRows.length} items • limit {pagination.limit}
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
