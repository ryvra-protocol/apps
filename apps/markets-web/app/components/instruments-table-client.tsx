"use client";

import {
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
const sortFieldOptions = [
  { value: "symbol", label: "Symbol" },
  { value: "name", label: "Name" },
  { value: "assetClass", label: "Class" },
  { value: "updatedAt", label: "Last updated" },
] as const;

export function InstrumentsTableClient({ items, pagination }: InstrumentsTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();

  const search = searchParams.get("search") ?? "";
  const assetClassParam = (searchParams.get("assetClass") ?? "ALL").toLowerCase();
  const statusParam = (searchParams.get("status") ?? "ALL").toLowerCase();
  const sortField = searchParams.get("sortField") ?? "symbol";
  const sortDirection = searchParams.get("sortDirection") === "asc" ? "asc" : "desc";

  const assetClass = classOptions.includes(assetClassParam as (typeof classOptions)[number]) ? assetClassParam : "ALL";
  const status = statusOptions.includes(statusParam as (typeof statusOptions)[number]) ? statusParam : "ALL";
  const hasFilters = search.length > 0 || assetClass !== "ALL" || status !== "ALL" || sortField !== "symbol" || sortDirection !== "desc";

  const visibleRows = useMemo(() => [...items], [items]);
  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

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
              onChange={(event) => updateQuery({ search: event.currentTarget.value || undefined })}
              placeholder="Symbol, name, id"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Class</span>
            <select
              className="markets-filter-control"
              value={assetClass}
              onChange={(event) =>
                updateQuery({
                  assetClass: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value,
                })
              }
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
            <select
              className="markets-filter-control"
              value={sortDirection}
              onChange={(event) => updateQuery({ sortDirection: event.currentTarget.value })}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["search", "assetClass", "status", "sortField", "sortDirection", "page"])}
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
          { key: "name", header: "Name" },
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
          <Button type="button" variant="secondary" onClick={() => clearQuery(["search", "assetClass", "status", "page"])}>
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Instrument pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Page {pagination.page} of {pagination.totalPages} • {pagination.total} total instruments
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
