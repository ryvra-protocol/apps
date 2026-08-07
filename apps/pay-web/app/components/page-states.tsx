import { Card, themeTokens } from "@ryvra/ui";

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

export function UnauthorizedState() {
  return (
    <Card title="Access Required">
      <p style={{ margin: 0 }}>
        The Phase 7 route guard placeholder denied this request. Confirm the session role mapping and retry.
      </p>
    </Card>
  );
}

export function ErrorState({ title, message, retryLink, source, retryable }: ErrorStateProps) {
  return (
    <Card title={title}>
      <div role="alert" aria-live="assertive" style={{ display: "grid", gap: themeTokens.spacing.sm }}>
        <p style={{ margin: 0 }}>{message}</p>
        <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
          Source: {source ?? "runtime"} • Retryable: {retryable ? "Yes" : "No"}
        </p>
        <a
          href={retryLink.href}
          style={{
            display: "inline-flex",
            width: "fit-content",
            borderRadius: themeTokens.radius.md,
            border: `1px solid ${themeTokens.color.primary}`,
            padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.lg}`,
            color: themeTokens.color.primary,
            textDecoration: "none",
            fontWeight: themeTokens.typography.weight.medium,
          }}
        >
          {retryLink.label}
        </a>
      </div>
    </Card>
  );
}

export function EmptyState({ title, description, actionLink }: EmptyStateProps) {
  return (
    <Card title={title}>
      <p style={{ marginTop: 0, marginBottom: actionLink ? themeTokens.spacing.md : 0 }}>{description}</p>
      {actionLink ? (
        <a
          href={actionLink.href}
          style={{
            display: "inline-flex",
            width: "fit-content",
            borderRadius: themeTokens.radius.md,
            border: `1px solid ${themeTokens.color.borderStrong}`,
            padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.lg}`,
            color: themeTokens.color.text,
            textDecoration: "none",
            fontWeight: themeTokens.typography.weight.medium,
          }}
        >
          {actionLink.label}
        </a>
      ) : null}
    </Card>
  );
}

export function LoadingState({ title }: { title: string }) {
  return (
    <section aria-live="polite" role="status" style={{ display: "grid", gap: themeTokens.spacing.lg }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
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
