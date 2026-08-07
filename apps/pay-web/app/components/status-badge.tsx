import { themeTokens } from "@ryvra/ui";

interface StatusBadgeProps {
  status: string;
}

interface StatusPalette {
  background: string;
  text: string;
  border: string;
}

function getStatusPalette(status: string): StatusPalette {
  const normalized = status.toUpperCase();

  if (["PAID", "COMPLETED", "MATCHED"].includes(normalized)) {
    return {
      background: themeTokens.color.success,
      text: themeTokens.color.textInverse,
      border: themeTokens.color.success,
    };
  }

  if (["FAILED", "MISMATCH", "VOID"].includes(normalized)) {
    return {
      background: themeTokens.color.danger,
      text: themeTokens.color.textInverse,
      border: themeTokens.color.danger,
    };
  }

  if (["PENDING", "SCHEDULED", "PROCESSING", "QUEUED", "RUNNING", "DRAFT"].includes(normalized)) {
    return {
      background: themeTokens.color.warning,
      text: themeTokens.color.textInverse,
      border: themeTokens.color.warning,
    };
  }

  return {
    background: themeTokens.color.surfaceMuted,
    text: themeTokens.color.text,
    border: themeTokens.color.borderStrong,
  };
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const palette = getStatusPalette(status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: themeTokens.radius.pill,
        border: `1px solid ${palette.border}`,
        padding: `${themeTokens.spacing.xxs} ${themeTokens.spacing.sm}`,
        fontSize: themeTokens.typography.size.xs,
        fontWeight: themeTokens.typography.weight.semibold,
        background: palette.background,
        color: palette.text,
        minWidth: "5.5rem",
      }}
    >
      {status}
    </span>
  );
}
