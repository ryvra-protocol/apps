import { ActionToolbar, Card, InlineStatusIndicators, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsPerpsPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function MarketsPerpsPage({ searchParams }: MarketsPerpsPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:perps");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Perps Trading" description="Access-controlled perpetual trading surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.defaultAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams);
    const scopeSearchParams = new URLSearchParams({
      account_id: accountId,
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
    });
    const scopeQuery = scopeSearchParams.toString();
    const withScope = (href: string): string => (scopeQuery.length > 0 ? `${href}?${scopeQuery}` : href);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Perps Trading" description="Perpetual trading module for leveraged exposure management.">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
            <ModeBadge mode={runtime.config.mode} />
            <ActionToolbar
              ariaLabel="Perps Trading actions"
              items={[
                { id: "perps-send", label: "Send", href: withScope("/orders"), variant: "primary" },
                { id: "perps-receive", label: "Receive", href: withScope("/positions") },
                {
                  id: "perps-open",
                  label: "Open Perps",
                  disabled: true,
                  disabledReason: "Perps execution backend is not yet enabled in this environment.",
                },
                { id: "perps-history", label: "View History", href: withScope("/orders") },
              ]}
            />
          </div>

          <InlineStatusIndicators
            ariaLabel="Perps Trading status indicators"
            items={[
              { id: "perps-module-status", label: "Module", value: "Deferred", tone: "warning" },
              { id: "perps-account", label: "Account", value: accountId, tone: "brand" },
            ]}
          />

          <Card title="Perps Trading readiness" tone="highlight">
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.sm }}>
              Position analytics and route entry are available now. Leveraged order execution remains deferred until the
              derivatives execution backend is enabled.
            </p>
            <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
              Existing permission checks and risk controls remain active and will be reused when execution is enabled.
            </p>
          </Card>
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/perps", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Perps Trading" description="Perpetual trading module for leveraged exposure management.">
          <ErrorState
            title="Unable to load Perps Trading"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/perps", label: "Retry module" }}
          />
        </Section>
      </section>
    );
  }
}
