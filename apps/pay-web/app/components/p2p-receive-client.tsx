"use client";

import { ActionToolbar, Button, Card, themeTokens } from "@ryvra/ui";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { redactIdentifier } from "../lib/privacy";

interface P2pReceiveClientProps {
  accountId: string;
  workspaceId?: string;
  sessionUserId: string;
}

function buildScopeQuery(accountId: string, workspaceId?: string): string {
  const params = new URLSearchParams({ account_id: accountId });
  if (workspaceId) {
    params.set("workspace_id", workspaceId);
  }
  return params.toString();
}

export function P2pReceiveClient({ accountId, workspaceId, sessionUserId }: P2pReceiveClientProps) {
  const searchParams = useSearchParams();
  const [requestFrom, setRequestFrom] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestMemo, setRequestMemo] = useState("");
  const [requestNotice, setRequestNotice] = useState<string | null>(null);

  const scopeQuery = useMemo(() => buildScopeQuery(accountId, workspaceId), [accountId, workspaceId]);
  const withScope = (href: string): string => `${href}?${scopeQuery}`;
  const preferredAction = (searchParams.get("action") ?? "").toLowerCase();
  const receiveHandle = `@${sessionUserId}-${accountId}`;

  return (
    <section style={{ display: "grid", gap: themeTokens.spacing.md }}>
      <style>{`
        .p2p-receive-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
        }

        .p2p-receive-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
          box-shadow: ${themeTokens.color.focusRingShadow};
        }
      `}</style>

      <ActionToolbar
        ariaLabel="P2P receive actions"
        items={[
          { id: "receive-send", label: "Send", href: withScope("/p2p/send") },
          { id: "receive-receive", label: "Receive", href: withScope("/p2p/receive"), variant: "primary" },
          { id: "receive-request", label: "Request", href: withScope("/p2p/receive?action=request") },
          { id: "receive-history", label: "View History", href: withScope("/p2p/history") },
        ]}
      />

      <Card title="Receive money (P2P)">
        <div style={{ display: "grid", gap: themeTokens.spacing.md }}>
          <p style={{ margin: 0 }}>
            Share this receive handle with trusted payers:
            <strong> {receiveHandle}</strong>
          </p>
          <p style={{ margin: 0, color: themeTokens.color.textMuted }}>
            Shared identifiers are redacted in activity logs as {redactIdentifier(receiveHandle, 3, 3)}.
          </p>
          <p style={{ margin: 0, color: themeTokens.color.textMuted }}>
            Incoming settlement confirmations are driven by existing Pay status rails. No new receive endpoint is introduced in this phase.
          </p>
        </div>
      </Card>

      <Card title="Request a payment">
        <form
          aria-label="Request payment form"
          onSubmit={(event) => {
            event.preventDefault();
            setRequestNotice("Not available in current environment: request-payment backend endpoint is deferred.");
          }}
          style={{ display: "grid", gap: themeTokens.spacing.md }}
        >
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Request from handle</span>
            <input
              className="p2p-receive-control"
              type="text"
              value={requestFrom}
              onChange={(event) => setRequestFrom(event.currentTarget.value)}
              placeholder="@payer"
              aria-label="Request from handle"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Amount (USD)</span>
            <input
              className="p2p-receive-control"
              type="text"
              inputMode="decimal"
              value={requestAmount}
              onChange={(event) => setRequestAmount(event.currentTarget.value)}
              placeholder="0.00"
              aria-label="Requested amount"
            />
          </label>

          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Memo (optional)</span>
            <input
              className="p2p-receive-control"
              type="text"
              value={requestMemo}
              onChange={(event) => setRequestMemo(event.currentTarget.value)}
              placeholder="Context"
              aria-label="Request memo"
            />
          </label>

          <div style={{ display: "flex", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
            <Button type="submit" disabled aria-label="Create request (currently unavailable)">
              Create request
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRequestFrom("");
                setRequestAmount("");
                setRequestMemo("");
                setRequestNotice(null);
              }}
            >
              Clear
            </Button>
          </div>

          {preferredAction === "request" ? (
            <p style={{ margin: 0, color: themeTokens.color.textMuted }} role="status" aria-live="polite">
              Request mode is active.
            </p>
          ) : null}

          {requestNotice ? (
            <p style={{ margin: 0, color: themeTokens.color.warning }} role="status" aria-live="polite">
              {requestNotice}
            </p>
          ) : (
            <p style={{ margin: 0, color: themeTokens.color.textMuted }} role="status" aria-live="polite">
              Request payment is currently preview-only and does not persist remotely.
            </p>
          )}
        </form>
      </Card>
    </section>
  );
}
