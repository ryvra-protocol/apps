import { themeTokens } from "./theme";
import { formatNotificationReferenceSnippet } from "./notification-center-model";

export const delegationViewFilters = ["all", "mine", "delegated_to_me", "delegated_by_me"] as const;
export type DelegationViewFilter = (typeof delegationViewFilters)[number];

export interface DelegatedOperationContext {
  available: boolean;
  initiatedBy?: string;
  actingFor?: string;
  accountId?: string;
  workspaceId?: string;
  unavailableReason?: string;
}

function renderValue(value: string | undefined): string {
  return formatNotificationReferenceSnippet(value) ?? "Not available in current environment";
}

export function matchesDelegationView(
  context: DelegatedOperationContext,
  filter: DelegationViewFilter,
  currentUserId: string | undefined,
): boolean {
  if (filter === "all") {
    return true;
  }

  if (!context.available || !currentUserId) {
    return false;
  }

  const actor = context.initiatedBy;
  const target = context.actingFor;

  if (filter === "mine") {
    return actor === currentUserId || target === currentUserId;
  }

  if (filter === "delegated_to_me") {
    return target === currentUserId && Boolean(actor) && actor !== currentUserId;
  }

  if (filter === "delegated_by_me") {
    return actor === currentUserId && Boolean(target) && target !== currentUserId;
  }

  return false;
}

export function DelegationProvenanceChips({ context }: { context: DelegatedOperationContext }) {
  if (!context.available) {
    return (
      <div className="ryvra-delegation-chips" aria-label="Delegated operation provenance unavailable">
        <style>{`
          .ryvra-delegation-chips {
            display: inline-flex;
            flex-wrap: wrap;
            gap: ${themeTokens.spacing.xs};
          }

          .ryvra-delegation-chip {
            display: inline-flex;
            align-items: center;
            border-radius: ${themeTokens.radius.pill};
            border: 1px solid ${themeTokens.color.borderStrong};
            background: ${themeTokens.color.surfaceMuted};
            color: ${themeTokens.color.text};
            font-size: ${themeTokens.typography.size.xs};
            padding: ${themeTokens.spacing.xxs} ${themeTokens.spacing.sm};
          }

          .ryvra-delegation-chip--muted {
            color: ${themeTokens.color.textMuted};
          }
        `}</style>
        <span className="ryvra-delegation-chip ryvra-delegation-chip--muted">
          {context.unavailableReason ?? "Not available in current environment"}
        </span>
      </div>
    );
  }

  return (
    <div className="ryvra-delegation-chips" aria-label="Delegated operation provenance">
      <style>{`
        .ryvra-delegation-chips {
          display: inline-flex;
          flex-wrap: wrap;
          gap: ${themeTokens.spacing.xs};
        }

        .ryvra-delegation-chip {
          display: inline-flex;
          align-items: center;
          border-radius: ${themeTokens.radius.pill};
          border: 1px solid ${themeTokens.color.borderStrong};
          background: ${themeTokens.color.surfaceMuted};
          color: ${themeTokens.color.text};
          font-size: ${themeTokens.typography.size.xs};
          padding: ${themeTokens.spacing.xxs} ${themeTokens.spacing.sm};
        }
      `}</style>
      <span className="ryvra-delegation-chip">Initiated by: {renderValue(context.initiatedBy)}</span>
      <span className="ryvra-delegation-chip">Acting for: {renderValue(context.actingFor)}</span>
      <span className="ryvra-delegation-chip">Account: {renderValue(context.accountId)}</span>
      <span className="ryvra-delegation-chip">Workspace: {renderValue(context.workspaceId)}</span>
    </div>
  );
}
