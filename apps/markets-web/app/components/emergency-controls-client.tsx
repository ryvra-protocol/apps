"use client";

import { Button, Card, InlineStatusIndicators, themeTokens } from "@ryvra/ui";
import { useState } from "react";
import {
  emergencyOperations,
  isHighTrustEmergencyOperation,
  type EmergencyOperation,
} from "../lib/finance-control";

interface EmergencyControlsClientProps {
  agentId: string;
  canRunHighTrust: boolean;
}

function operationLabel(operation: EmergencyOperation): string {
  switch (operation) {
    case "suspend_agent":
      return "Suspend agent";
    case "revoke_credentials":
      return "Revoke credentials";
    case "revoke_capability":
      return "Revoke capability";
    case "activate_kill_switch":
      return "Activate kill switch";
    case "deactivate_kill_switch":
      return "Deactivate kill switch";
    default:
      return operation;
  }
}

export function EmergencyControlsClient({ agentId, canRunHighTrust }: EmergencyControlsClientProps) {
  const [operation, setOperation] = useState<EmergencyOperation>("suspend_agent");
  const [reason, setReason] = useState("");
  const [capability, setCapability] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("Idle");
  const [submitting, setSubmitting] = useState(false);

  const needsHighTrust = isHighTrustEmergencyOperation(operation);
  const confirmationValue = `CONFIRM ${operation}`;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (reason.trim().length < 8) {
      setStatus("A detailed reason is required (minimum 8 characters).");
      return;
    }

    if (confirm.trim() !== confirmationValue) {
      setStatus(`Type '${confirmationValue}' to confirm impact.`);
      return;
    }

    if (needsHighTrust && !canRunHighTrust) {
      setStatus("High-trust flow required: admin authorization is missing.");
      return;
    }

    setSubmitting(true);
    setStatus("Submitting operation...");

    try {
      const response = await fetch(`/api/agents/${agentId}/controls`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation,
          reason,
          capability: operation === "revoke_capability" ? capability : undefined,
          confirmationText: confirm,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; data?: { auditReference?: string }; error?: { message?: string } };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Operation failed");
      }

      setStatus(`Operation accepted. Audit reference: ${payload.data?.auditReference ?? "unavailable"}`);
      setConfirm("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Emergency controls" tone="highlight">
      <form aria-label="Emergency controls form" onSubmit={onSubmit} style={{ display: "grid", gap: themeTokens.spacing.md }}>
        <InlineStatusIndicators
          ariaLabel="Emergency controls warnings"
          items={[
            { id: "impact-warning", label: "Impact", value: "Immediate operational effect", tone: "danger" },
            { id: "authority", label: "Authority", value: "Backend required", tone: "warning" },
          ]}
        />

        <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <span>Operation</span>
          <select className="emergency-control" value={operation} onChange={(event) => setOperation(event.currentTarget.value as EmergencyOperation)}>
            {emergencyOperations.map((item) => (
              <option key={item} value={item}>
                {operationLabel(item)}
              </option>
            ))}
          </select>
        </label>

        {operation === "revoke_capability" ? (
          <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
            <span>Capability to revoke</span>
            <input className="emergency-control" value={capability} onChange={(event) => setCapability(event.currentTarget.value)} />
          </label>
        ) : null}

        <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <span>Reason</span>
          <textarea
            className="emergency-control"
            aria-label="Emergency operation reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
        </label>

        <label style={{ display: "grid", gap: themeTokens.spacing.xs }}>
          <span>Confirmation text</span>
          <input
            className="emergency-control"
            aria-label="Emergency operation confirmation text"
            value={confirm}
            onChange={(event) => setConfirm(event.currentTarget.value)}
            placeholder={confirmationValue}
          />
        </label>

        <p style={{ margin: 0, color: themeTokens.color.textMuted }}>
          {needsHighTrust ? "High-trust operation: admin flow required." : "Standard emergency flow with backend authorization."}
        </p>

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit emergency operation"}
        </Button>

        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          {status}
        </p>
      </form>

      <style>{`
        .emergency-control {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
        }
        .emergency-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }
      `}</style>
    </Card>
  );
}
