import { ActionToolbar, Card, InlineStatusIndicators, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";

interface MarketsStakingPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

export default async function MarketsStakingPage({ searchParams }: MarketsStakingPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:staking");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Staking" description="Access-controlled staking and yield management surface.">
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
        <Section title="Staking" description="Staking module for lockups, yields, and governance participation.">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: themeTokens.spacing.sm }}>
            <ModeBadge mode={runtime.config.mode} />
            <ActionToolbar
              ariaLabel="Staking actions"
              items={[
                { id: "staking-send", label: "Send", href: withScope("/orders"), variant: "primary" },
                { id: "staking-receive", label: "Receive", href: withScope("/positions") },
                {
                  id: "staking-open",
                  label: "Stake Now",
                  disabled: true,
                  disabledReason: "Staking execution backend is not yet enabled in this environment.",
                },
                { id: "staking-history", label: "View History", href: withScope("/orders") },
              ]}
            />
          </div>

          <InlineStatusIndicators
            ariaLabel="Staking status indicators"
            items={[
              { id: "staking-module-status", label: "Module", value: "Deferred", tone: "warning" },
              { id: "staking-account", label: "Account", value: accountId, tone: "brand" },
            ]}
          />

          <Card title="Staking readiness" tone="highlight">
            <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.sm }}>
              Staking discovery and allocation guidance are available now. On-chain staking actions remain deferred
              until staking custody and validator integrations are enabled.
            </p>
            <p style={{ margin: 0, color: themeTokens.color.textMuted, fontSize: themeTokens.typography.size.sm }}>
              Existing permission and safety guards remain in place for future staking execution enablement.
            </p>
          </Card>
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/staking", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Staking" description="Staking module for lockups, yields, and governance participation.">
          <ErrorState
            title="Unable to load Staking"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/staking", label: "Retry module" }}
          />
        </Section>
      </section>
    );
  }
}
