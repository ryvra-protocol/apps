import { Card } from "./Card";
import { StatusBadge } from "./StatusBadge";
import { themeTokens } from "./theme";

export const TRUST_UNAVAILABLE_VALUE = "Not available in current environment";
export const TRUST_REDACTED_VALUE = "Redacted for security";

const sensitiveLabelKeywords = ["token", "secret", "password", "authorization", "credential", "private"] as const;
const sensitiveValuePatterns = [
  /^bearer\s+/i,
  /^[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+$/i,
  /^(sk|rk|pk)_[a-z0-9_-]+$/i,
] as const;

export type OperationTimelineState = "loading" | "empty" | "error" | "success";

export interface TrustReference {
  label: string;
  value?: string | null | undefined;
}

export interface OperationTimelineStage {
  id: string;
  label: string;
  status: string;
  timestamp?: string | null | undefined;
  note?: string | undefined;
  current?: boolean;
  references?: TrustReference[];
}

export interface OperationTimelineCardProps {
  title: string;
  state: OperationTimelineState;
  stages?: OperationTimelineStage[];
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
}

export interface ComplianceEvidencePanelProps {
  title?: string;
  summaryLabel?: string;
  sourceSystem?: string | null | undefined;
  retryable?: boolean | null;
  references?: TrustReference[];
  lastUpdated?: string | null | undefined;
}

export interface TrustDisclosureCardProps {
  title?: string;
  confirmationText: string;
  retryText: string;
  processingText: string;
}

export interface PolicyLinkItem {
  href: string;
  label: string;
}

export interface PolicyLinksCardProps {
  title?: string;
  description?: string;
  links: PolicyLinkItem[];
}

export interface ConfirmationReceiptCardProps {
  title?: string;
  operationLabel: string;
  status: string;
  confirmedAt?: string | null | undefined;
  references?: TrustReference[];
}

export interface ErrorTransparencySummaryProps {
  message: string;
  retryable: boolean;
  source?: string | undefined;
  retryActionLabel?: string | undefined;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function sanitizeTrustReferenceValue(label: string, value?: string | null): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return TRUST_UNAVAILABLE_VALUE;
  }

  const normalizedLabel = normalizeText(label);
  const normalizedValue = value.trim();

  if (sensitiveLabelKeywords.some((keyword) => normalizedLabel.includes(keyword))) {
    return TRUST_REDACTED_VALUE;
  }

  if (sensitiveValuePatterns.some((pattern) => pattern.test(normalizedValue))) {
    return TRUST_REDACTED_VALUE;
  }

  return normalizedValue;
}

export function formatTrustTimestamp(value?: string | null): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return TRUST_UNAVAILABLE_VALUE;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Date(parsed).toISOString();
}

export function buildRetrySafetyMessage(retryable: boolean): string {
  return retryable
    ? "Retry is safe after you confirm the same intent details."
    : "Retry is not safe automatically. Review scope, permissions, or policy decisions first.";
}

export function buildNextStepMessage(retryable: boolean, retryActionLabel?: string): string {
  if (retryable) {
    return retryActionLabel ? `Use \"${retryActionLabel}\" or check status diagnostics before retrying.` : "Check status diagnostics, then retry when ready.";
  }

  return "Review the operation details panel and policy guidance before taking a new action.";
}

function renderReferenceList(references: readonly TrustReference[] | undefined) {
  if (!references || references.length === 0) {
    return (
      <p style={{ margin: 0 }}>
        References: {TRUST_UNAVAILABLE_VALUE}
      </p>
    );
  }

  return (
    <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: themeTokens.spacing.xs }}>
      {references.map((reference) => {
        const value = sanitizeTrustReferenceValue(reference.label, reference.value);
        return (
          <li key={reference.label}>
            <strong>{reference.label}:</strong>{" "}
            <span aria-label={`${reference.label} reference value`}>{value}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function OperationTimelineCard({
  title,
  state,
  stages,
  loadingMessage = "Loading operation timeline.",
  emptyMessage = "No operation timeline is available.",
  errorMessage = "Unable to load operation timeline.",
}: OperationTimelineCardProps) {
  return (
    <Card title={title}>
      {state === "loading" ? (
        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          {loadingMessage}
        </p>
      ) : null}

      {state === "empty" ? (
        <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
          {emptyMessage}
        </p>
      ) : null}

      {state === "error" ? (
        <p role="alert" aria-live="assertive" style={{ margin: 0, color: themeTokens.color.danger }}>
          {errorMessage}
        </p>
      ) : null}

      {state === "success" ? (
        !stages || stages.length === 0 ? (
          <p role="status" aria-live="polite" style={{ margin: 0, color: themeTokens.color.textMuted }}>
            {emptyMessage}
          </p>
        ) : (
          <ol
            aria-label={`${title} timeline`}
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: themeTokens.spacing.md,
            }}
          >
            {stages.map((stage) => {
              const timestamp = formatTrustTimestamp(stage.timestamp);
              const hasTimestamp = timestamp !== TRUST_UNAVAILABLE_VALUE;
              return (
                <li
                  key={stage.id}
                  aria-current={stage.current ? "step" : undefined}
                  tabIndex={0}
                  style={{
                    borderRadius: themeTokens.radius.md,
                    border: `1px solid ${themeTokens.color.borderStrong}`,
                    background: themeTokens.color.surfaceMuted,
                    padding: themeTokens.spacing.md,
                    display: "grid",
                    gap: themeTokens.spacing.xs,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
                    <strong>{stage.label}</strong>
                    <span aria-label={`${stage.label} status ${stage.status}`}>
                      <StatusBadge status={stage.status} textTransform="capitalize" minWidth="6.25rem" />
                    </span>
                  </div>
                  <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
                    Time:{" "}
                    <time dateTime={hasTimestamp ? timestamp : undefined}>{timestamp}</time>
                  </p>
                  {stage.note ? <p style={{ margin: 0 }}>{stage.note}</p> : null}
                  {stage.references && stage.references.length > 0 ? (
                    <div style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{renderReferenceList(stage.references)}</div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )
      ) : null}
    </Card>
  );
}

export function ComplianceEvidencePanel({
  title = "Compliance details",
  summaryLabel = "Details",
  sourceSystem,
  retryable,
  references,
  lastUpdated,
}: ComplianceEvidencePanelProps) {
  return (
    <Card title={title}>
      <details>
        <summary
          style={{
            cursor: "pointer",
            color: themeTokens.color.primary,
            fontWeight: themeTokens.typography.weight.semibold,
          }}
        >
          {summaryLabel}
        </summary>
        <dl
          style={{
            margin: `${themeTokens.spacing.md} 0 0`,
            display: "grid",
            gap: themeTokens.spacing.sm,
          }}
        >
          <div>
            <dt style={{ fontWeight: themeTokens.typography.weight.semibold }}>Source system</dt>
            <dd style={{ margin: 0 }}>{sourceSystem?.trim() ? sourceSystem : TRUST_UNAVAILABLE_VALUE}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: themeTokens.typography.weight.semibold }}>Retryable</dt>
            <dd style={{ margin: 0 }}>
              {typeof retryable === "boolean" ? (retryable ? "Yes" : "No") : TRUST_UNAVAILABLE_VALUE}
            </dd>
          </div>
          <div>
            <dt style={{ fontWeight: themeTokens.typography.weight.semibold }}>Last updated</dt>
            <dd style={{ margin: 0 }}>{formatTrustTimestamp(lastUpdated)}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: themeTokens.typography.weight.semibold }}>References</dt>
            <dd style={{ margin: 0 }}>{renderReferenceList(references)}</dd>
          </div>
        </dl>
      </details>
    </Card>
  );
}

export function TrustDisclosureCard({
  title = "Trust and processing notice",
  confirmationText,
  retryText,
  processingText,
}: TrustDisclosureCardProps) {
  return (
    <Card title={title}>
      <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: themeTokens.spacing.sm }}>
        <li>{confirmationText}</li>
        <li>{retryText}</li>
        <li>{processingText}</li>
      </ul>
    </Card>
  );
}

export function PolicyLinksCard({ title = "Policy and help", description, links }: PolicyLinksCardProps) {
  return (
    <Card title={title}>
      {description ? <p style={{ marginTop: 0 }}>{description}</p> : null}
      <nav aria-label="Policy and help links">
        <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: themeTokens.spacing.xs }}>
          {links.map((link) => (
            <li key={`${link.href}:${link.label}`}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </Card>
  );
}

export function ConfirmationReceiptCard({
  title = "Confirmation receipt",
  operationLabel,
  status,
  confirmedAt,
  references,
}: ConfirmationReceiptCardProps) {
  return (
    <Card title={title}>
      <p style={{ margin: 0 }}>
        <strong>{operationLabel}</strong>
      </p>
      <p style={{ margin: 0 }}>
        Status: <StatusBadge status={status} textTransform="capitalize" minWidth="6.25rem" />
      </p>
      <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
        Confirmed at: {formatTrustTimestamp(confirmedAt)}
      </p>
      <div style={{ color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>{renderReferenceList(references)}</div>
    </Card>
  );
}

export function ErrorTransparencySummary({ message, retryable, source, retryActionLabel }: ErrorTransparencySummaryProps) {
  return (
    <div role="alert" aria-live="assertive" style={{ display: "grid", gap: themeTokens.spacing.xs }}>
      <p style={{ margin: 0 }}>
        <strong>What happened:</strong> {message}
      </p>
      <p style={{ margin: 0 }}>
        <strong>Retry safety:</strong> {buildRetrySafetyMessage(retryable)}
      </p>
      <p style={{ margin: 0 }}>
        <strong>What to do next:</strong> {buildNextStepMessage(retryable, retryActionLabel)}
      </p>
      <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
        Source: {source ?? "runtime"} • Retryable: {retryable ? "Yes" : "No"}
      </p>
    </div>
  );
}
