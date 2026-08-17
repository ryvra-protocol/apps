import { Section, themeTokens } from "@ryvra/ui";
import { ErrorState, UnauthorizedState } from "./components/page-states";
import { PayOverviewContent } from "./components/pay-overview-content";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "./lib/search-params";
import { createPayRuntimeContext, capturePayPageError } from "./lib/runtime";
import { loadPayUnifiedBalanceCard } from "./lib/unified-balance";

interface PayHomePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function PayHomePage({ searchParams }: PayHomePageProps) {
  const runtime = createPayRuntimeContext("pay-web:dashboard");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Pay Dashboard" description="Access-controlled pay data surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.marketsAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams);
    const [overview, unifiedBalanceCard] = await Promise.all([
      runtime.payClient.getPayOverview(),
      loadPayUnifiedBalanceCard({
        marketsClient: runtime.marketsClient,
        logger: runtime.logger,
        route: "/",
        accountId,
      }),
    ]);

    runtime.logger.info("Loaded unified balance for pay dashboard", {
      accountId,
      state: unifiedBalanceCard.state,
    });

    runtime.logger.info("Loaded pay dashboard overview", {
      mode: runtime.config.mode,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      activityCount: overview.recentActivity.length,
    });

    return (
      <PayOverviewContent
        title="Pay Dashboard"
        description="MVP finance metrics and recent invoice/payout/reconciliation activity."
        route="/"
        mode={runtime.config.mode}
        overview={overview}
        unifiedBalanceCard={unifiedBalanceCard}
        accountId={accountId}
        {...(workspaceId ? { workspaceId } : {})}
        roleLabel={runtime.workspaceRole.label}
      />
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Pay Dashboard" description="MVP finance metrics and recent activity.">
          <ErrorState
            title="Unable to load dashboard data"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/", label: "Retry dashboard" }}
          />
        </Section>
      </section>
    );
  }
}
