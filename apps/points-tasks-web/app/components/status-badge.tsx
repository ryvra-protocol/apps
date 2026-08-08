import { themeTokens } from "@ryvra/ui";

interface StatusBadgeProps {
  status: string;
}

const goodStatuses = new Set(["confirmed", "completed", "active", "ok", "pass", "eligible"]);
const warningStatuses = new Set(["pending", "in_progress", "queued", "under_review", "maintenance", "degraded"]);
const badStatuses = new Set(["failed", "rejected", "reversed", "canceled", "expired", "blocked", "down", "error", "deny"]);

function resolveStyles(status: string): { color: string; background: string; border: string } {
  const normalized = status.toLowerCase();
  if (goodStatuses.has(normalized)) {
    return {
      color: themeTokens.color.success,
      background: themeTokens.color.surfaceMuted,
      border: themeTokens.color.success,
    };
  }

  if (warningStatuses.has(normalized)) {
    return {
      color: themeTokens.color.warning,
      background: themeTokens.color.surfaceMuted,
      border: themeTokens.color.warning,
    };
  }

  if (badStatuses.has(normalized)) {
    return {
      color: themeTokens.color.danger,
      background: themeTokens.color.surfaceMuted,
      border: themeTokens.color.danger,
    };
  }

  return {
    color: themeTokens.color.textMuted,
    background: themeTokens.color.surfaceMuted,
    border: themeTokens.color.border,
  };
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = resolveStyles(status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: themeTokens.radius.pill,
        border: `1px solid ${styles.border}`,
        background: styles.background,
        color: styles.color,
        padding: `${themeTokens.spacing.xs} ${themeTokens.spacing.sm}`,
        fontSize: themeTokens.typography.size.xs,
        textTransform: "capitalize",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
