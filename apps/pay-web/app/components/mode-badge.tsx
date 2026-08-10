import type { RuntimeMode } from "@ryvra/config";
import { themeTokens, translateRuntime } from "@ryvra/ui";

interface ModeBadgeProps {
  mode: RuntimeMode;
}

export function ModeBadge({ mode }: ModeBadgeProps) {
  const label = mode === "mock" ? translateRuntime("mode.mock", "Mock data mode") : translateRuntime("mode.http", "HTTP mode");

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: themeTokens.radius.pill,
        padding: `${themeTokens.spacing.xs} ${themeTokens.spacing.sm}`,
        fontSize: themeTokens.typography.size.xs,
        fontWeight: themeTokens.typography.weight.semibold,
        color: themeTokens.color.textMuted,
        background: themeTokens.color.surfaceMuted,
        border: `1px solid ${themeTokens.color.border}`,
      }}
    >
      {label}
    </span>
  );
}
