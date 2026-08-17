import { Section, themeTokens } from "@ryvra/ui";
import { canAccessWorkspaceCapability, describeWorkspaceCapabilityRequirement } from "@ryvra/auth";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { PayOverviewContent } from "../components/pay-overview-content";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../lib/runtime";
import { loadPayUnifiedBalanceCard } from "../lib/unified-balance";

interface PayOverviewPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function PayOverviewPage({ searchParams }: PayOverviewPageProps) {
  const runtime = createPayRuntimeContext("pay-web:overview");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Pay Overview" description="Access-controlled overview view.">
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
        route: "/overview",
        accountId,
      }),
    ]);

    runtime.logger.info("Loaded unified balance for pay overview", {
      accountId,
      state: unifiedBalanceCard.state,
    });

    runtime.logger.info("Loaded pay overview route", {
      mode: runtime.config.mode,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      activityCount: overview.recentActivity.length,
    });
    const canOperate = canAccessWorkspaceCapability(runtime.workspaceRole, "operate");
    const operateDeniedReason = describeWorkspaceCapabilityRequirement("operate", runtime.workspaceRole, "Claim actions");

    return (
      <PayOverviewContent
        title="Pay Overview"
        description="Same aggregate model as dashboard, kept as a stable global overview route."
        route="/overview"
        mode={runtime.config.mode}
        overview={overview}
        unifiedBalanceCard={unifiedBalanceCard}
        accountId={accountId}
        {...(workspaceId ? { workspaceId } : {})}
        roleLabel={runtime.workspaceRole.label}
        canOperate={canOperate}
        operateDeniedReason={operateDeniedReason}
      />
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/overview", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Pay Overview" description="Shared overview model for pay MVP routes.">
          <ErrorState
            title="Unable to load overview data"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/overview", label: "Retry overview" }}
          />
        </Section>
      </section>
    );
  }
}
