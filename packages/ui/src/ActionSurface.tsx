import { themeTokens } from "./theme";

export type ActionToolbarVariant = "primary" | "secondary";

export interface ActionToolbarItem {
  id: string;
  label: string;
  href?: string;
  variant?: ActionToolbarVariant;
  disabled?: boolean;
  disabledReason?: string;
  ariaLabel?: string;
}

export interface ActionToolbarProps {
  items: readonly ActionToolbarItem[];
  ariaLabel?: string;
}

function resolveActionColors(variant: ActionToolbarVariant, disabled: boolean): { background: string; border: string; color: string } {
  if (disabled) {
    return {
      background: themeTokens.color.disabledBackground,
      border: themeTokens.color.border,
      color: themeTokens.color.disabledText,
    };
  }

  if (variant === "secondary") {
    return {
      background: themeTokens.color.secondarySurface,
      border: themeTokens.color.secondaryBorder,
      color: themeTokens.color.text,
    };
  }

  return {
    background: themeTokens.color.primary,
    border: themeTokens.color.primary,
    color: themeTokens.color.textInverse,
  };
}

export function ActionToolbar({ items, ariaLabel = "Key actions" }: ActionToolbarProps) {
  const disabledItems = items.filter((item) => item.disabled && item.disabledReason);

  return (
    <div style={{ display: "grid", gap: themeTokens.spacing.sm }}>
      <style>{`
        .ryvra-action-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: ${themeTokens.spacing.sm};
        }

        .ryvra-action-toolbar-control {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 2.5rem;
          border-radius: ${themeTokens.radius.md};
          border: 1px solid transparent;
          font-family: ${themeTokens.typography.fontFamily};
          font-size: ${themeTokens.typography.size.sm};
          font-weight: ${themeTokens.typography.weight.medium};
          line-height: ${themeTokens.typography.lineHeight.normal};
          padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.lg};
          text-decoration: none;
          transition:
            background-color ${themeTokens.motion.standard} ease,
            border-color ${themeTokens.motion.standard} ease,
            color ${themeTokens.motion.standard} ease,
            transform ${themeTokens.motion.fast} ease;
        }

        .ryvra-action-toolbar-control:hover {
          transform: translateY(-1px);
        }

        .ryvra-action-toolbar-control:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }

        .ryvra-action-toolbar-control:disabled {
          cursor: not-allowed;
          transform: none;
        }

        .ryvra-action-toolbar-disabled-list {
          margin: 0;
          padding-left: ${themeTokens.spacing.lg};
          display: grid;
          gap: ${themeTokens.spacing.xs};
          color: ${themeTokens.color.textMuted};
          font-size: ${themeTokens.typography.size.sm};
        }

        @media (prefers-reduced-motion: reduce) {
          .ryvra-action-toolbar-control {
            transition: none;
          }

          .ryvra-action-toolbar-control:hover {
            transform: none;
          }
        }
      `}</style>
      <div className="ryvra-action-toolbar" role="toolbar" aria-label={ariaLabel}>
        {items.map((item) => {
          const variant = item.variant ?? "secondary";
          const isDisabled = Boolean(item.disabled);
          const colors = resolveActionColors(variant, isDisabled);

          if (isDisabled) {
            return (
              <button
                key={item.id}
                type="button"
                className="ryvra-action-toolbar-control"
                disabled
                aria-label={item.ariaLabel ?? `${item.label}${item.disabledReason ? ` (Disabled: ${item.disabledReason})` : ""}`}
                style={{
                  background: colors.background,
                  borderColor: colors.border,
                  color: colors.color,
                }}
              >
                {item.label}
              </button>
            );
          }

          return (
            <a
              key={item.id}
              href={item.href ?? "#"}
              className="ryvra-action-toolbar-control"
              aria-label={item.ariaLabel ?? item.label}
              style={{
                background: colors.background,
                borderColor: colors.border,
                color: colors.color,
              }}
            >
              {item.label}
            </a>
          );
        })}
      </div>
      {disabledItems.length > 0 ? (
        <ul className="ryvra-action-toolbar-disabled-list">
          {disabledItems.map((item) => (
            <li key={`${item.id}-reason`}>
              <strong>{item.label}:</strong> {item.disabledReason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type InlineIndicatorTone = "neutral" | "brand" | "success" | "warning" | "danger";

export interface InlineStatusIndicatorItem {
  id: string;
  label: string;
  value: string;
  tone?: InlineIndicatorTone;
  ariaLabel?: string;
}

export interface InlineStatusIndicatorsProps {
  items: readonly InlineStatusIndicatorItem[];
  ariaLabel?: string;
}

function resolveIndicatorPalette(tone: InlineIndicatorTone): { background: string; border: string; color: string } {
  if (tone === "brand") {
    return {
      background: themeTokens.color.primarySurface,
      border: themeTokens.color.primaryBorder,
      color: themeTokens.color.primaryActive,
    };
  }

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

export function InlineStatusIndicators({ items, ariaLabel = "Status indicators" }: InlineStatusIndicatorsProps) {
  return (
    <ul
      aria-label={ariaLabel}
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: themeTokens.spacing.sm,
      }}
    >
      {items.map((item) => {
        const palette = resolveIndicatorPalette(item.tone ?? "neutral");

        return (
          <li
            key={item.id}
            aria-label={item.ariaLabel}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: themeTokens.spacing.xs,
              borderRadius: themeTokens.radius.pill,
              border: `1px solid ${palette.border}`,
              background: palette.background,
              color: palette.color,
              padding: `${themeTokens.spacing.xxs} ${themeTokens.spacing.sm}`,
              fontSize: themeTokens.typography.size.sm,
              lineHeight: themeTokens.typography.lineHeight.normal,
            }}
          >
            <span style={{ opacity: 0.85 }}>{item.label}:</span>
            <strong>{item.value}</strong>
          </li>
        );
      })}
    </ul>
  );
}
