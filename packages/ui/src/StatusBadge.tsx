import { themeTokens } from "./theme";
import { translateRuntime } from "./i18n-runtime";

type StatusTone = "success" | "warning" | "danger" | "neutral";

const successKeywords = [
  "paid",
  "completed",
  "confirmed",
  "matched",
  "settled",
  "active",
  "pass",
  "open",
  "eligible",
  "tradable",
  "available",
];
const warningKeywords = ["pending", "scheduled", "processing", "queued", "running", "review", "created", "routed", "degraded", "medium", "high"];
const dangerKeywords = ["failed", "mismatch", "void", "rejected", "reversed", "blocked", "error", "deny", "halted", "suspended"];

function includesKeyword(candidate: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => candidate.includes(keyword));
}

export function resolveStatusTone(status: string): StatusTone {
  const normalized = status.trim().toLowerCase();

  if (includesKeyword(normalized, successKeywords)) {
    return "success";
  }

  if (includesKeyword(normalized, dangerKeywords)) {
    return "danger";
  }

  if (includesKeyword(normalized, warningKeywords)) {
    return "warning";
  }

  return "neutral";
}

function resolvePalette(tone: StatusTone): { background: string; border: string; color: string } {
  if (tone === "success") {
    return {
      background: themeTokens.color.successSurface,
      border: themeTokens.color.success,
      color: themeTokens.color.textPrimary,
    };
  }

  if (tone === "warning") {
    return {
      background: themeTokens.color.warningSurface,
      border: themeTokens.color.warning,
      color: themeTokens.color.textPrimary,
    };
  }

  if (tone === "danger") {
    return {
      background: themeTokens.color.dangerSurface,
      border: themeTokens.color.danger,
      color: themeTokens.color.textPrimary,
    };
  }

  return {
    background: themeTokens.color.surfaceMuted,
    border: themeTokens.color.borderStrong,
    color: themeTokens.color.textMuted,
  };
}

export interface StatusBadgeProps {
  status: string;
  minWidth?: string;
  textTransform?: "none" | "capitalize" | "uppercase";
}

export function StatusBadge({ status, minWidth = "5.25rem", textTransform = "uppercase" }: StatusBadgeProps) {
  const tone = resolveStatusTone(status);
  const palette = resolvePalette(tone);
  const statusKey = status.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const fallbackLabel = textTransform === "capitalize" ? status.replace(/_/g, " ") : status;
  const translatedStatus = translateRuntime(`status.${statusKey}`, fallbackLabel);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: themeTokens.radius.pill,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        padding: `${themeTokens.spacing.xxs} ${themeTokens.spacing.sm}`,
        fontSize: themeTokens.typography.size.xs,
        fontWeight: themeTokens.typography.weight.semibold,
        textTransform,
        letterSpacing: textTransform === "uppercase" ? "0.03em" : undefined,
        minWidth,
      }}
    >
      {translatedStatus}
    </span>
  );
}
