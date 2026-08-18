"use client";

import type { RuntimeMode } from "@ryvra/config";
import { ActionToolbar, Button, Card, DataTable, InlineStatusIndicators, themeTokens } from "@ryvra/ui";
import { useMemo, useState } from "react";
import {
  buildMerchantKpis,
  filterMerchantTransactions,
  resolveMerchantActionAvailability,
  type MerchantFilterInput,
  type MerchantKpiModel,
  type MerchantTransactionRow,
} from "../lib/merchant-dashboard";
import { formatCurrencyMinor, formatDateTime } from "../lib/format";
import { StatusBadge } from "./status-badge";

interface MerchantDashboardClientProps {
  mode: RuntimeMode;
  accountId: string;
  workspaceId?: string;
  roleLabel: string;
  rows: MerchantTransactionRow[];
  settlementSummary: {
    scheduledCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
    totalAmountMinor: number;
    currency: string;
  };
}

function buildScopeQuery(accountId: string, workspaceId?: string): string {
  const params = new URLSearchParams({ account_id: accountId });
  if (workspaceId) {
    params.set("workspace_id", workspaceId);
  }
  return params.toString();
}

function createCsv(rows: readonly MerchantTransactionRow[]): string {
  const header = ["type", "status", "amount_minor", "currency", "payer", "payee", "timestamp", "reference"];
  const lines = rows.map((row) => [
    row.type,
    row.status,
    String(row.amountMinor),
    row.currency,
    row.payer,
    row.payee,
    row.timestamp,
    row.reference,
  ]);

  return [header, ...lines]
    .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function MerchantDashboardClient({
  mode,
  accountId,
  workspaceId,
  roleLabel,
  rows,
  settlementSummary,
}: MerchantDashboardClientProps) {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scopeQuery = useMemo(() => buildScopeQuery(accountId, workspaceId), [accountId, workspaceId]);
  const withScope = (href: string): string => `${href}?${scopeQuery}`;

  const filters: MerchantFilterInput = { status, search, from, to };
  const filteredRows = useMemo(() => filterMerchantTransactions(rows, filters), [filters, rows]);
  const kpis: MerchantKpiModel = useMemo(() => buildMerchantKpis(filteredRows), [filteredRows]);

  const statuses = useMemo(() => ["ALL", ...new Set(rows.map((row) => row.status.toUpperCase()))], [rows]);
  const actionAvailability = useMemo(
    () =>
      resolveMerchantActionAvailability({
        mode,
        hasRows: filteredRows.length > 0,
        hasFailedRows: filteredRows.some((row) => row.retrySupported),
      }),
    [filteredRows, mode],
  );

  const dataSourceMode = mode === "http" ? "remote" : "preview";

  const exportCsv = () => {
    if (!actionAvailability.exportTransactions.enabled || filteredRows.length === 0 || typeof window === "undefined") {
      return;
    }

    const blob = new Blob([createCsv(filteredRows)], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `merchant-transactions-${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .merchant-filter-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          color: ${themeTokens.color.text};
          background: ${themeTokens.color.surface};
        }

        .merchant-filter-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
          box-shadow: ${themeTokens.color.focusRingShadow};
        }
      `}</style>

      <ActionToolbar
        ariaLabel="Merchant dashboard quick actions"
        items={[
          {
            id: "merchant-create-link",
            label: "Create payment link",
            disabled: !actionAvailability.createPaymentLink.enabled,
            variant: "primary",
            ...(actionAvailability.createPaymentLink.enabled
              ? { href: withScope("/p2p/receive?action=request") }
              : {}),
            ...(actionAvailability.createPaymentLink.reason
              ? { disabledReason: actionAvailability.createPaymentLink.reason }
              : {}),
          },
          { id: "merchant-send", label: "Send", href: withScope("/p2p/send") },
          { id: "merchant-receive", label: "Receive", href: withScope("/p2p/receive") },
          { id: "merchant-history", label: "View history", href: withScope("/p2p/history") },
        ]}
      />

      <InlineStatusIndicators
        ariaLabel="Merchant context indicators"
        items={[
          { id: "merchant-mode", label: "Data mode", value: dataSourceMode, tone: dataSourceMode === "remote" ? "success" : "warning" },
          { id: "merchant-account", label: "Account", value: accountId, tone: "brand" },
          { id: "merchant-role", label: "Access", value: roleLabel, tone: "neutral" },
        ]}
      />

      <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <Card title="Total volume">
          <p style={{ margin: 0 }}>{formatCurrencyMinor(kpis.totalVolumeMinor, kpis.currency)}</p>
        </Card>
        <Card title="Successful payments">
          <p style={{ margin: 0 }}>{kpis.successfulCount}</p>
          <p style={{ margin: 0, color: themeTokens.color.textMuted }}>
            {(kpis.successfulRate * 100).toFixed(1)}% success rate
          </p>
        </Card>
        <Card title="Pending / processing">
          <p style={{ margin: 0 }}>{kpis.pendingCount}</p>
        </Card>
        <Card title="Failed">
          <p style={{ margin: 0 }}>{kpis.failedCount}</p>
        </Card>
      </div>

      <Card title="Settlement and payout summary">
        <div style={{ display: "grid", gap: themeTokens.spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <p style={{ margin: 0 }}>Scheduled: <strong>{settlementSummary.scheduledCount}</strong></p>
          <p style={{ margin: 0 }}>Processing: <strong>{settlementSummary.processingCount}</strong></p>
          <p style={{ margin: 0 }}>Completed: <strong>{settlementSummary.completedCount}</strong></p>
          <p style={{ margin: 0 }}>Failed: <strong>{settlementSummary.failedCount}</strong></p>
          <p style={{ margin: 0 }}>
            Amount: <strong>{formatCurrencyMinor(settlementSummary.totalAmountMinor, settlementSummary.currency)}</strong>
          </p>
        </div>
      </Card>

      <Card title="Merchant actions">
        <div style={{ display: "flex", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
          <Button
            type="button"
            variant="secondary"
            disabled={!actionAvailability.exportTransactions.enabled}
            onClick={exportCsv}
            aria-label="Export current merchant transaction view"
          >
            Export transactions
          </Button>
          <Button
            type="button"
            disabled
            aria-label="Retry failed transactions (deferred)"
            title={actionAvailability.retryFailed.reason}
          >
            Retry failed
          </Button>
        </div>
        <ul style={{ marginBottom: 0, color: themeTokens.color.textMuted }}>
          <li>{actionAvailability.createPaymentLink.reason}</li>
          <li>{actionAvailability.retryFailed.reason}</li>
        </ul>
      </Card>

      <Card title="Transactions">
        <form
          aria-label="Merchant transaction filters"
          onSubmit={(event) => event.preventDefault()}
          style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Status</span>
            <select
              className="merchant-filter-control"
              value={status}
              onChange={(event) => setStatus(event.currentTarget.value)}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Search</span>
            <input
              className="merchant-filter-control"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Reference, payer, payee"
              aria-label="Search merchant transactions"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>From</span>
            <input
              className="merchant-filter-control"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.currentTarget.value)}
              aria-label="From date"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>To</span>
            <input
              className="merchant-filter-control"
              type="date"
              value={to}
              onChange={(event) => setTo(event.currentTarget.value)}
              aria-label="To date"
            />
          </label>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStatus("ALL");
                setSearch("");
                setFrom("");
                setTo("");
              }}
            >
              Reset filters
            </Button>
          </div>
        </form>

        <div style={{ marginTop: themeTokens.spacing.md }}>
          <DataTable<MerchantTransactionRow>
            caption="Merchant transactions"
            columns={[
              { key: "type", header: "Type" },
              {
                key: "status",
                header: "Status",
                render: (value) => <StatusBadge status={String(value)} textTransform="capitalize" minWidth="7rem" />,
              },
              {
                key: "amountMinor",
                header: "Amount",
                render: (value, row) => formatCurrencyMinor(value as number, row.currency),
              },
              { key: "payer", header: "Payer" },
              { key: "payee", header: "Payee" },
              {
                key: "timestamp",
                header: "Timestamp",
                render: (value) => formatDateTime(String(value)),
              },
              { key: "reference", header: "Reference" },
            ]}
            rows={filteredRows}
            getRowKey={(row) => row.id}
            rowLabel={(row) => `Transaction ${row.reference}`}
            onRowClick={(row) => setExpandedId((current) => (current === row.id ? null : row.id))}
            isRowExpanded={(row) => expandedId === row.id}
            renderExpandedRow={(row) => (
              <div style={{ display: "grid", gap: themeTokens.spacing.xs }}>
                <p style={{ margin: 0 }}>
                  <strong>View details:</strong> {row.reference}
                </p>
                <p style={{ margin: 0, color: themeTokens.color.textMuted }}>
                  Retry supported: {row.retrySupported ? "Preview only (endpoint deferred)" : "No"}
                </p>
              </div>
            )}
            emptyMessage="No merchant transactions match these filters."
          />
        </div>
      </Card>

      <Card title="Refunds and disputes">
        <p style={{ margin: 0, color: themeTokens.color.textMuted }}>
          Not available in current environment: refund/dispute backend fields and actions are deferred.
        </p>
      </Card>
    </section>
  );
}
