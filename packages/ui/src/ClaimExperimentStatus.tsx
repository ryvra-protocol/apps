import type { ClaimConversionVariant } from "./claim-conversion-experiment";
import { themeTokens } from "./theme";

interface ClaimExperimentStatusProps {
  experimentId: string;
  variant: ClaimConversionVariant;
  overrideActive: boolean;
}

export function ClaimExperimentStatus({ experimentId, variant, overrideActive }: ClaimExperimentStatusProps) {
  const variantLabel = variant === "trust_boost" ? "Trust-first" : "Control";

  return (
    <p
      role="status"
      aria-live="polite"
      style={{
        margin: 0,
        color: themeTokens.color.textMuted,
        fontSize: themeTokens.typography.size.sm,
      }}
    >
      Claim UX experiment ({experimentId}): <strong>{variantLabel}</strong>
      {overrideActive ? " • QA override active" : ""}
    </p>
  );
}
