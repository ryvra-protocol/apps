import { ActionToolbar, Card, InlineStatusIndicators, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsSpotPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function MarketsSpotPage({ searchParams }: MarketsSpotPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:spot");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Classified Spot" description="Access-controlled classified spot trading surface.">
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
        <Section title="Classified Spot" description="Spot routing module for classified markets and curated books.">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
            <ModeBadge mode={runtime.config.mode} />
            <ActionToolbar
              ariaLabel="Classified Spot actions"
              items={[
                { id: "spot-send", label: "Send", href: withScope("/orders"), variant: "primary" },
                { id: "spot-receive", label: "Receive", href: withScope("/positions") },
                {
                  id: "spot-open",
                  label: "Open Spot",
                  disabled: true,
                  disabledReason: "Spot execution backend is not yet enabled in this environment.",
                },
                { id: "spot-history", label: "View History", href: withScope("/orders") },
              ]}
            />
          </div>

          <InlineStatusIndicators
            ariaLabel="Classified Spot status indicators"
            items={[
              { id: "spot-module-status", label: "Module", value: "Deferred", tone: "warning" },
              { id: "spot-account", label: "Account", value: accountId, tone: "brand" },
            ]}
          />

          <Card title="Classified Spot readiness" tone="highlight">
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.sm }}>
              Market discovery and navigation are available now. Trade execution is intentionally deferred until the
              classified spot matching service is enabled.
            </p>
            <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
              When enabled, this module will activate order placement and settlement actions with existing role and
              policy guardrails.
            </p>
          </Card>
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/spot", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Classified Spot" description="Spot routing module for classified markets and curated books.">
          <ErrorState
            title="Unable to load Classified Spot"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/spot", label: "Retry module" }}
          />
        </Section>
      </section>
    );
  }
}
