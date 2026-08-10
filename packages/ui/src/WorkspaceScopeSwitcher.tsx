import { themeTokens } from "./theme";
import type { WorkspaceScopeOption, WorkspaceScopeSelection } from "./workspace-scope";
import { useI18n } from "./I18nProvider";

export interface WorkspaceScopeSwitcherProps {
  scope: WorkspaceScopeSelection;
  accountOptions: readonly WorkspaceScopeOption[];
  workspaceOptions: readonly WorkspaceScopeOption[];
  userOptions?: readonly WorkspaceScopeOption[];
  includeUserScope?: boolean;
  roleLabel: string;
  roleAriaLabel?: string;
  notices?: readonly string[];
  onScopeChange: (next: WorkspaceScopeSelection) => void;
}

function ensureOptions(currentValue: string | undefined, options: readonly WorkspaceScopeOption[]): WorkspaceScopeOption[] {
  const normalized = [...options];
  if (!currentValue || normalized.some((option) => option.value === currentValue)) {
    return normalized;
  }

  return [{ value: currentValue, label: currentValue }, ...normalized];
}

export function WorkspaceScopeSwitcher({
  scope,
  accountOptions,
  workspaceOptions,
  userOptions = [],
  includeUserScope = false,
  roleLabel,
  roleAriaLabel,
  notices = [],
  onScopeChange,
}: WorkspaceScopeSwitcherProps) {
  const { t } = useI18n();
  const resolvedAccountOptions = ensureOptions(scope.accountId, accountOptions);
  const resolvedWorkspaceOptions = ensureOptions(scope.workspaceId, workspaceOptions);
  const resolvedUserOptions = ensureOptions(scope.userId, userOptions);
  const accountLabel = scope.accountId;
  const workspaceLabel = scope.workspaceId ?? "workspace-unset";
  const accountText = t("shell.scopeAccount", "Account");
  const workspaceText = t("shell.scopeWorkspace", "Workspace");
  const userText = t("shell.scopeUser", "User");

  return (
    <div className="ryvra-scope-switcher" aria-live="polite">
      <style>{`
        .ryvra-scope-switcher {
          display: grid;
          gap: ${themeTokens.spacing.sm};
          min-width: min(46rem, 100%);
        }

        .ryvra-scope-header {
          display: flex;
          align-items: center;
          gap: ${themeTokens.spacing.sm};
          flex-wrap: wrap;
        }

        .ryvra-role-badge {
          display: inline-flex;
          align-items: center;
          border-radius: ${themeTokens.radius.pill};
          border: 1px solid ${themeTokens.color.borderStrong};
          background: ${themeTokens.color.surfaceMuted};
          color: ${themeTokens.color.text};
          padding: ${themeTokens.spacing.xxs} ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.xs};
          font-weight: ${themeTokens.typography.weight.semibold};
        }

        .ryvra-scope-summary {
          margin: 0;
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-scope-controls {
          display: grid;
          gap: ${themeTokens.spacing.sm};
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }

        .ryvra-scope-field {
          display: grid;
          gap: ${themeTokens.spacing.xxs};
          min-width: 0;
        }

        .ryvra-scope-field-label {
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.xs};
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .ryvra-scope-select {
          border: 1px solid ${themeTokens.color.borderStrong};
          border-radius: ${themeTokens.radius.md};
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
          min-height: 2.2rem;
          padding: 0 ${themeTokens.spacing.sm};
          font-size: ${themeTokens.typography.size.sm};
        }

        .ryvra-scope-select:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }

        .ryvra-scope-notices {
          margin: 0;
          padding-left: 1rem;
          color: ${themeTokens.color.warning};
          display: grid;
          gap: ${themeTokens.spacing.xxs};
          font-size: ${themeTokens.typography.size.sm};
        }
      `}</style>

      <div className="ryvra-scope-header">
        <span className="ryvra-role-badge" aria-label={roleAriaLabel ?? `Current workspace role ${roleLabel}`}>
          {roleLabel}
        </span>
        <p className="ryvra-scope-summary">
          {t("shell.scope", "Scope")}: <strong>{accountLabel}</strong> • <strong>{workspaceLabel}</strong>
        </p>
      </div>

      <div className="ryvra-scope-controls">
        <label className="ryvra-scope-field">
          <span className="ryvra-scope-field-label">{accountText}</span>
          <select
            className="ryvra-scope-select"
            value={scope.accountId}
            aria-label={t("shell.scopeAccountSelector", "Account scope selector")}
            onChange={(event) =>
              onScopeChange({
                ...scope,
                accountId: event.currentTarget.value,
              })
            }
          >
            {resolvedAccountOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="ryvra-scope-field">
          <span className="ryvra-scope-field-label">{workspaceText}</span>
          <select
            className="ryvra-scope-select"
            value={scope.workspaceId ?? ""}
            aria-label={t("shell.scopeWorkspaceSelector", "Workspace scope selector")}
            onChange={(event) => {
              const workspaceId = event.currentTarget.value || undefined;
              onScopeChange({
                accountId: scope.accountId,
                ...(workspaceId ? { workspaceId } : {}),
                ...(scope.userId ? { userId: scope.userId } : {}),
              });
            }}
          >
            {resolvedWorkspaceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {includeUserScope ? (
          <label className="ryvra-scope-field">
            <span className="ryvra-scope-field-label">{userText}</span>
            <select
              className="ryvra-scope-select"
              value={scope.userId ?? ""}
              aria-label={t("shell.scopeUserSelector", "User scope selector")}
              onChange={(event) => {
                const userId = event.currentTarget.value || undefined;
                onScopeChange({
                  accountId: scope.accountId,
                  ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
                  ...(userId ? { userId } : {}),
                });
              }}
            >
              {resolvedUserOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {notices.length > 0 ? (
        <ul className="ryvra-scope-notices" aria-label={t("shell.scopeValidationNotices", "Scope validation notices")}>
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
