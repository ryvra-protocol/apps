import { evaluateRoutePermission, resolveRoutePermissionMeta } from "@ryvra/config";
import { canAccessWorkspaceCapability } from "@ryvra/auth";
import { Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../components/mode-badge";
import { ErrorState, PermissionDeniedState, UnauthorizedState } from "../../components/page-states";
import { P2pSendFlowClient } from "../../components/p2p-send-flow-client";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../../lib/runtime";

interface P2pSendPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function getOptionalEnvValue(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export default async function P2pSendPage({ searchParams }: P2pSendPageProps) {
  const runtime = createPayRuntimeContext("pay-web:p2p-send");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P Send" description="Access-controlled send surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const routePermission = evaluateRoutePermission(resolveRoutePermissionMeta("pay", "/p2p/send"), runtime.sessionRoleClaims);
  if (!routePermission.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P Send" description="Person-to-person transfer confirmation flow.">
          <PermissionDeniedState message={routePermission.reason ?? "You do not have permission to send P2P transfers."} />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.marketsAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams);
    const canOperate = canAccessWorkspaceCapability(runtime.workspaceRole, "operate");

    runtime.logger.info("Loaded P2P send route", {
      mode: runtime.config.mode,
      accountId,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
      canOperate,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P Send" description="Review, confirm, and submit person-to-person transfers with idempotent safety.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <P2pSendFlowClient
            mode={runtime.config.mode}
            accountId={accountId}
            {...(workspaceId ? { workspaceId } : {})}
            canOperate={canOperate}
            hasAuthToken={Boolean(getOptionalEnvValue("RYVRA_PAY_AUTH_TOKEN"))}
            {...(canOperate ? {} : { operateDeniedReason: "P2P send requires Operator or Admin workspace access." })}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/p2p/send", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P Send" description="Person-to-person transfer confirmation flow.">
          <ErrorState
            title="Unable to load P2P send"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/p2p/send", label: "Retry send" }}
          />
        </Section>
      </section>
    );
  }
}
