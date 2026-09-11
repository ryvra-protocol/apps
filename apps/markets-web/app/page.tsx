import { Section, themeTokens } from "@ryvra/ui";
import { ErrorState, UnauthorizedState } from "./components/page-states";
import { MarketsOverviewContent } from "./components/markets-overview-content";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "./lib/search-params";
import { captureMarketsPageError, createMarketsRuntimeContext } from "./lib/runtime";
import { loadMarketsUnifiedBalanceCard } from "./lib/unified-balance";

interface MarketsHomePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function MarketsHomePage({ searchParams }: MarketsHomePageProps) {
  const runtime = createMarketsRuntimeContext("markets-web:dashboard");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Markets dashboard" description="Your trading workspace summary with access-aware data.">
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
          <Section title="Markets dashboard" description="Track live-ready market metrics and execution signals.">
            <ErrorState
              title="Choose an account to continue"
              message="Add account_id to the URL or set RYVRA_MARKETS_ACCOUNT_ID before loading market overview data."
              source="runtime"
              retryable={false}
              retryLink={{ href: "/", label: "Try again" }}
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
        route: "/",
      }),
    ]);

    runtime.logger.info("Loaded unified balance for markets dashboard", {
      accountId,
      state: unifiedBalanceCard.state,
    });

    runtime.logger.info("Loaded markets dashboard overview", {
      mode: runtime.config.mode,
      accountId: overview.accountId,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      totalOrders: overview.orders.totalOrders,
    });

    return (
      <MarketsOverviewContent
        title="Markets dashboard"
        description="Track execution, exposure, and system health from one place."
        route="/"
        mode={runtime.config.mode}
        overview={overview}
        unifiedBalanceCard={unifiedBalanceCard}
        {...(workspaceId ? { workspaceId } : {})}
      />
    );
  } catch (error) {
    const uiError = captureMarketsPageError(runtime.logger, "/", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Markets dashboard" description="Track live-ready market metrics and execution signals.">
          <ErrorState
            title="We couldn't load your markets dashboard"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/", label: "Try again" }}
          />
        </Section>
      </section>
    );
  }
}
