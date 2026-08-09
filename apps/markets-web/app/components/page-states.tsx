import { Card, ErrorTransparencySummary, themeTokens } from "@ryvra/ui";

interface RetryLinkProps {
  href: string;
  label: string;
}

interface ErrorStateProps {
  title: string;
  message: string;
  retryLink: RetryLinkProps;
  source?: string;
  retryable: boolean;
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLink?: RetryLinkProps;
}

function ActionLink({ href, label, primary }: RetryLinkProps & { primary?: boolean }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        width: "fit-content",
        borderRadius: themeTokens.radius.md,
        border: `1px solid ${primary ? themeTokens.color.primary : themeTokens.color.borderStrong}`,
        padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.lg}`,
        color: primary ? themeTokens.color.primary : themeTokens.color.text,
        textDecoration: "none",
        fontWeight: themeTokens.typography.weight.medium,
      }}
    >
      {label}
    </a>
  );
}

export function UnauthorizedState() {
  return (
    <Card title="Access required">
      <p style={{ margin: 0 }}>You do not have permission to view this page. Confirm your workspace role and try again.</p>
    </Card>
  );
}

export function ErrorState({ title, message, retryLink, source, retryable }: ErrorStateProps) {
  return (
    <Card title={title}>
      <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        <ErrorTransparencySummary message={message} source={source} retryable={retryable} retryActionLabel={retryLink.label} />
        <ActionLink href={retryLink.href} label={retryLink.label} primary />
      </div>
    </Card>
  );
}

export function EmptyState({ title, description, actionLink }: EmptyStateProps) {
  return (
    <Card title={title}>
      <p style={{ marginTop: 0, marginBottom: actionLink ? themeTokens.spacing.md : 0 }}>{description}</p>
      {actionLink ? <ActionLink href={actionLink.href} label={actionLink.label} /> : null}
    </Card>
  );
}

export function LoadingState({ title }: { title: string }) {
  return (
    <section aria-live="polite" role="status" style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <h2 style={{ margin: 0, fontSize: themeTokens.typography.size.xl }}>{title}</h2>
      <Card>
        <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
          <div style={{ height: "1rem", width: "40%", background: themeTokens.color.surfaceMuted, borderRadius: themeTokens.radius.sm }} />
          <div style={{ height: "1rem", width: "70%", background: themeTokens.color.surfaceMuted, borderRadius: themeTokens.radius.sm }} />
          <div style={{ height: "8rem", width: "100%", background: themeTokens.color.surfaceMuted, borderRadius: themeTokens.radius.sm }} />
        </div>
      </Card>
    </section>
  );
}
