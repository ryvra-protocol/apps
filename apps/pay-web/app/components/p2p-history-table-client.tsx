"use client";

import type { RuntimeMode } from "@ryvra/config";
import { ActionToolbar, Button, Card, DataTable, themeTokens } from "@ryvra/ui";
import { useMemo, useState } from "react";
import { filterP2pActivityRows, type P2pActivityRow } from "../lib/p2p";
import { formatCurrencyMinor, formatDateTime } from "../lib/format";
import { StatusBadge } from "./status-badge";

interface P2pHistoryTableClientProps {
  mode: RuntimeMode;
  accountId: string;
  workspaceId?: string;
  rows: P2pActivityRow[];
}

function buildScopeQuery(accountId: string, workspaceId?: string): string {
  const params = new URLSearchParams({ account_id: accountId });
  if (workspaceId) {
    params.set("workspace_id", workspaceId);
  }
  return params.toString();
}

export function P2pHistoryTableClient({ mode, accountId, workspaceId, rows }: P2pHistoryTableClientProps) {
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const scopeQuery = useMemo(() => buildScopeQuery(accountId, workspaceId), [accountId, workspaceId]);
  const withScope = (href: string): string => `${href}?${scopeQuery}`;

  const filteredRows = useMemo(
    () =>
      filterP2pActivityRows(rows, {
        status,
        search,
        from,
        to,
      }),
    [from, rows, search, status, to],
  );

  const statuses = useMemo(() => ["ALL", ...new Set(rows.map((item) => item.status.toUpperCase()))], [rows]);

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .p2p-history-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
        }

        .p2p-history-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
          box-shadow: ${themeTokens.color.focusRingShadow};
        }
      `}</style>

      <ActionToolbar
        ariaLabel="P2P history actions"
        items={[
          { id: "history-send", label: "Send", href: withScope("/p2p/send") },
          { id: "history-receive", label: "Receive", href: withScope("/p2p/receive") },
          { id: "history-request", label: "Request", href: withScope("/p2p/receive?action=request") },
          { id: "history-view", label: "View History", href: withScope("/p2p/history"), variant: "primary" },
        ]}
      />

      <Card title="P2P activity history">
        <div style={{ display: "grid", gap: themeTokens.spacing.md }}>
          <p style={{ margin: 0, color: themeTokens.color.textMuted }} role="status" aria-live="polite">
            {mode === "http"
              ? "History is sourced from active Pay rails in remote mode."
              : "Preview mode: history is derived from existing payout and invoice rails in this environment."}
          </p>

          <form
            aria-label="P2P history filters"
            onSubmit={(event) => event.preventDefault()}
            style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
          >
            <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
              <span>Status</span>
              <select
                className="p2p-history-control"
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
                className="p2p-history-control"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Reference or counterparty"
                aria-label="Search history"
              />
            </label>

            <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
              <span>From</span>
              <input
                className="p2p-history-control"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.currentTarget.value)}
                aria-label="From date"
              />
            </label>

            <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
              <span>To</span>
              <input
                className="p2p-history-control"
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

          <DataTable<P2pActivityRow>
            caption="P2P history"
            columns={[
              { key: "kind", header: "Type" },
              {
                key: "status",
                header: "Status",
                render: (value) => <StatusBadge status={String(value)} textTransform="capitalize" minWidth="7rem" />,
              },
              { key: "counterparty", header: "Counterparty" },
              {
                key: "amountMinor",
                header: "Amount",
                render: (value, row) => formatCurrencyMinor(value as number, row.currency),
              },
              {
                key: "createdAt",
                header: "Timestamp",
                render: (value) => formatDateTime(String(value)),
              },
              { key: "reference", header: "Reference" },
            ]}
            rows={filteredRows}
            getRowKey={(row) => row.id}
            emptyMessage="No P2P activity matches the selected filters."
          />

          {filteredRows.length === 0 ? (
            <p style={{ margin: 0, color: themeTokens.color.textMuted }} role="status" aria-live="polite">
              No matching activity is available for these filters.
            </p>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
