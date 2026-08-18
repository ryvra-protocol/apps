import { evaluateRoutePermission, resolveRoutePermissionMeta } from "@ryvra/config";
import { Section, themeTokens } from "@ryvra/ui";
import { ModeBadge } from "../../components/mode-badge";
import { ErrorState, PermissionDeniedState, UnauthorizedState } from "../../components/page-states";
import { P2pReceiveClient } from "../../components/p2p-receive-client";
import { parseAccountId, parseWorkspaceId, type RouteSearchParams } from "../../lib/search-params";
import { capturePayPageError, createPayRuntimeContext } from "../../lib/runtime";

interface P2pReceivePageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function P2pReceivePage({ searchParams }: P2pReceivePageProps) {
  const runtime = createPayRuntimeContext("pay-web:p2p-receive");

  if (!runtime.authDecision.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P Receive" description="Access-controlled receive surface.">
          <UnauthorizedState />
        </Section>
      </section>
    );
  }

  const routePermission = evaluateRoutePermission(resolveRoutePermissionMeta("pay", "/p2p/receive"), runtime.sessionRoleClaims);
  if (!routePermission.allowed) {
    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P Receive" description="Person-to-person receive and request surface.">
          <PermissionDeniedState message={routePermission.reason ?? "You do not have permission to view P2P receive."} />
        </Section>
      </section>
    );
  }

  try {
    const accountId = parseAccountId(searchParams as RouteSearchParams) ?? runtime.marketsAccountId ?? "acct-core-1";
    const workspaceId = parseWorkspaceId(searchParams as RouteSearchParams);

    runtime.logger.info("Loaded P2P receive route", {
      mode: runtime.config.mode,
      accountId,
      workspaceId: workspaceId ?? "workspace-core-1",
      role: runtime.workspaceRole.role,
    });

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P Receive" description="Receive handle guidance and request-payment preview controls.">
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <ModeBadge mode={runtime.config.mode} />
          </div>

          <P2pReceiveClient
            accountId={accountId}
            sessionUserId={runtime.sessionUserId}
            {...(workspaceId ? { workspaceId } : {})}
          />
        </Section>
      </section>
    );
  } catch (error) {
    const uiError = capturePayPageError(runtime.logger, "/p2p/receive", error);

    return (
      <section style={{ display: "grid", gap: themeTokens.spacing.lg }}>
        <Section title="P2P Receive" description="Person-to-person receive and request surface.">
          <ErrorState
            title="Unable to load P2P receive"
            message={uiError.message}
            source={uiError.source}
            retryable={uiError.retryable}
            retryLink={{ href: "/p2p/receive", label: "Retry receive" }}
          />
        </Section>
      </section>
    );
  }
}
