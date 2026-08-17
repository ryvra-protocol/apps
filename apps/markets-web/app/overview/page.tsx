import { Section, themeTokens } from "@ryvra/ui";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { MarketsOverviewContent } from "../components/markets-overview-content";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "../lib/runtime";
import { loadMarketsUnifiedBalanceCard } from "../lib/unified-balance";

interface MarketsOverviewPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function MarketsOverviewPage({ searchParams }: MarketsOverviewPageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:overview");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Markets Overview" description="Access-controlled markets overview surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.defaultAccountId ?? "";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams);
    if (!accountId) {
      return (
        <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
          <Section title="Markets Overview" description="Shared overview route with dashboard-consistent market metrics and activity.">
            <ErrorState
              title="Account scope is required"
              message="Set account_id in the URL or configure RYVRA_MARKETS_ACCOUNT_ID before loading the unified balance and markets overview."
              source="runtime"
              retryable={false}
              retryLink={{ href: "/overview", label: "Retry overview" }}
            />
          </Section>
        </section>
      );
    }

    const [overview, unifiedBalanceCard] = await Promise.all([
      runtime.marketsClient.getMarketsOverview({
        accountId,
      }),
      loadMarketsUnifiedBalanceCard({
        marketsClient: runtime.marketsClient,
        logger: runtime.logger,
        accountId,
        route: "/overview",
      }),
    ]);

    runtime.logger.info("Loaded unified balance for markets overview", {
      accountId,
      state: unifiedBalanceCard.state,
    });

    runtime.logger.info("Loaded markets overview route", {
      mode: runtime.config.mode,
      accountId: overview.accountId,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      totalOrders: overview.orders.totalOrders,
    });

    return (
      <MarketsOverviewContent
        title="Markets Overview"
        description="Shared overview route with dashboard-consistent market metrics and activity."
        route="/overview"
        mode={runtime.config.mode}
        overview={overview}
        unifiedBalanceCard={unifiedBalanceCard}
        {...(workspaceId ? { workspaceId } : {})}
        roleLabel={runtime.workspaceRole.label}
      />
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/overview", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Markets Overview" description="Shared overview route with dashboard-consistent market metrics and activity.">
          <ErrorState
            title="Unable to load markets overview"
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
