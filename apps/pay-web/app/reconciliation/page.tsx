import type { PayListRequest, ReconciliationFilters } from "@ryvra/domain-payments";
import { Card, Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../components/mode-badge";
import { ErrorState, UnauthorizedState } from "../components/page-states";
import { ReconciliationTableClient } from "../components/reconciliation-table-client";
import { formatDateTime } from "../lib/format";
import {
  parseDateRange,
  parseExceptionOnly,
  parsePage,
  parsePageSize,
  parseReconciliationStatus,
  parseSortDirection,
  type RouteSearchParams,
} from "../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../lib/runtime";

interface PayReconciliationPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export const dynamic = "force-dynamic";

function buildReconciliationRequest(searchParams: RouteSearchParams): PayListRequest<ReconciliationFilters> {
  const status = parseReconciliationStatus(searchParams);
  const dateRange = parseDateRange(searchParams);
  const exceptionOnly = parseExceptionOnly(searchParams);

  const filters: ReconciliationFilters = {
    ...(status ? { status } : {}),
    ...(dateRange ? { dateRange } : {}),
    ...(exceptionOnly ? { exceptionOnly: true } : {}),
  };

  return {
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    pagination: {
      page: parsePage(searchParams),
      pageSize: parsePageSize(searchParams, 20),
    },
    sort: {
      field: "updatedAt",
      direction: parseSortDirection(searchParams),
    },
  };
}

export default async function PayReconciliationPage({ searchParams }: PayReconciliationPageProps) {
  const runtime = createPayRuntimeContext("pay-web:reconciliation");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Reconciliation" description="Access-controlled reconciliation view.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  try {
    const request = buildReconciliationRequest(searchParams);
    const [reconciliationList, summary] = await Promise.all([
      runtime.payClient.listReconciliationItems(request),
      runtime.payClient.getReconciliationSummary(),
    ]);

    runtime.logger.info("Loaded reconciliation data", {
      mode: runtime.config.mode,
      itemCount: reconciliationList.items.length,
      mismatchCount: summary.mismatchCount,
      exceptionCount: summary.exceptionCount,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Reconciliation" description="Batch and exception tracking for settlements and payouts.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <div style={{ display: "grid", gap: themeTokens.spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <Card title="Runs">
              <p style={{ margin: 0 }}>{summary.runCount}</p>
            </Card>
            <Card title="Matched">
              <p style={{ margin: 0 }}>{summary.matchedCount}</p>
            </Card>
            <Card title="Mismatch exceptions">
              <p style={{ margin: 0 }}>{summary.mismatchCount}</p>
            </Card>
            <Card title="Failed rows">
              <p style={{ margin: 0 }}>{summary.failedCount}</p>
            </Card>
            <Card title="Total exceptions">
              <p style={{ margin: 0 }}>{summary.exceptionCount}</p>
            </Card>
            <Card title="Last run status">
              <p style={{ marginTop: 0, marginBottom: themeTokens.spacing.xs }}>{summary.lastRunStatus}</p>
              <p style={{ margin: 0, color: themeTokens.color.textMuted }}>{formatDateTime(summary.lastRunAt)}</p>
            </Card>
          </div>

          <ReconciliationTableClient items={reconciliationList.items} pagination={reconciliationList.pagination} />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/reconciliation", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="Reconciliation" description="Batch and exception tracking for settlements and payouts.">
          <ErrorState
            title="Unable to load reconciliation data"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/reconciliation", label: "Retry reconciliation" }}
          />
        </Section>
      </section>
    );
  }
}
