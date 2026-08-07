"use client";

import { invoiceStatuses, type InvoiceDto, type PayPaginationMeta } from "@ryvra/domain-payments";
import { Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useMemo, useState } from "react";
import { formatCurrencyMinor, formatDateTime } from "../lib/format";
import { StatusBadge } from "./status-badge";
import { useQueryFilters } from "./use-query-filters";

interface InvoicesTableClientProps {
  items: InvoiceDto[];
  pagination: PayPaginationMeta;
}

const invoiceStatusOptions = ["ALL", ...invoiceStatuses] as const;

export function InvoicesTableClient({ items, pagination }: InvoicesTableClientProps) {
  const { searchParams, updateQuery, clearQuery } = useQueryFilters();
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const statusParam = (searchParams.get("status") ?? "ALL").toUpperCase();
  const status = invoiceStatusOptions.includes(statusParam as (typeof invoiceStatusOptions)[number])
    ? statusParam
    : "ALL";
  const search = searchParams.get("search") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const hasFilters = status !== "ALL" || search.length > 0 || from.length > 0 || to.length > 0;

  const sortedItems = useMemo(() => {
    return [...items].sort((left, right) => (left.issuedAt < right.issuedAt ? 1 : -1));
  }, [items]);

  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

  return (
    <section aria-labelledby="invoices-table-title" style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .pay-filter-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
        }

        .pay-filter-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>

      <h3 id="invoices-table-title" style={{ margin: 0, fontSize: themeTokens.typography.size.lg }}>
        Invoice list
      </h3>

      <Card>
        <form
          aria-label="Invoice filters"
          onSubmit={(event) => event.preventDefault()}
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Status</span>
            <select
              className="pay-filter-control"
              value={status}
              onChange={(event) => updateQuery({ status: event.currentTarget.value === "ALL" ? undefined : event.currentTarget.value })}
            >
              {invoiceStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Search</span>
            <input
              className="pay-filter-control"
              type="search"
              value={search}
              onChange={(event) => updateQuery({ search: event.currentTarget.value || undefined })}
              placeholder="Invoice, customer, id"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>From date</span>
            <input
              className="pay-filter-control"
              type="date"
              value={from}
              onChange={(event) => updateQuery({ from: event.currentTarget.value || undefined })}
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>To date</span>
            <input
              className="pay-filter-control"
              type="date"
              value={to}
              onChange={(event) => updateQuery({ to: event.currentTarget.value || undefined })}
            />
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => clearQuery(["status", "search", "from", "to", "page"])}
              disabled={!hasFilters}
              aria-describedby={!hasFilters ? "invoice-reset-hint" : undefined}
            >
              Reset filters
            </Button>
          </div>
        </form>
        {!hasFilters ? (
          <p id="invoice-reset-hint" style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
            Reset is disabled because no filters are currently applied.
          </p>
        ) : null}
      </Card>

      <DataTable<InvoiceDto>
        caption="Invoices sorted by issue date"
        columns={[
          { key: "invoiceNumber", header: "Invoice" },
          { key: "customerName", header: "Customer" },
          {
            key: "amountMinor",
            header: "Amount",
            render: (value, row) => formatCurrencyMinor(value as number, row.currency),
          },
          {
            key: "status",
            header: "Status",
            render: (value) => <StatusBadge status={String(value)} />,
          },
          {
            key: "issuedAt",
            header: "Issued",
            render: (value) => formatDateTime(String(value)),
          },
        ]}
        rows={sortedItems}
        getRowKey={(row) => row.id}
        rowLabel={(row) => `Invoice ${row.invoiceNumber}`}
        onRowClick={(row) => {
          setExpandedInvoiceId((current) => (current === row.id ? null : row.id));
        }}
        isRowExpanded={(row) => expandedInvoiceId === row.id}
        renderExpandedRow={(row) => (
          <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
            <strong>{row.invoiceNumber}</strong>
            <span>Customer: {row.customerName}</span>
            <span>Due: {formatDateTime(row.dueAt)}</span>
            {row.description ? <span>Description: {row.description}</span> : null}
            {row.paidAt ? <span>Paid at: {formatDateTime(row.paidAt)}</span> : null}
            {row.failedAt ? <span>Failed at: {formatDateTime(row.failedAt)}</span> : null}
          </div>
        )}
        emptyMessage="No invoices match the selected filters."
      />

      {sortedItems.length === 0 ? (
        <Card title="No invoices found">
          <p style={{ marginTop: 0 }}>Try changing filters or clearing the date range to broaden results.</p>
          <Button type="button" variant="secondary" onClick={() => clearQuery(["status", "search", "from", "to", "page"])}>
            Clear filters
          </Button>
        </Card>
      ) : null}

      <div aria-label="Invoice pagination" style={{ display: "flex", alignItems: "center", gap: themeTokens.spacing.md, flexWrap: "wrap" }}>
        <span style={{ color: themeTokens.color.textMuted }}>
          Page {pagination.page} of {pagination.totalPages} • {pagination.total} total invoices
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
