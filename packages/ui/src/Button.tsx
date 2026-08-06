import type { ButtonHTMLAttributes } from "react";
import { themeTokens } from "./theme";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: themeTokens.color.primary,
  secondary: themeTokens.color.surface,
};

export function Button({ variant = "primary", style, ...props }: ButtonProps) {
  const textColor = variant === "primary" ? themeTokens.color.textInverse : themeTokens.color.text;

  return (
    <>
      <style>{`
        .ryvra-ui-button {
          font-family: ${themeTokens.typography.fontFamily};
          font-size: ${themeTokens.typography.size.sm};
          font-weight: ${themeTokens.typography.weight.medium};
          line-height: ${themeTokens.typography.lineHeight.normal};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.lg};
          border: 1px solid ${themeTokens.color.borderStrong};
          cursor: pointer;
          transition:
            background-color ${themeTokens.motion.standard} ease,
            color ${themeTokens.motion.standard} ease,
            border-color ${themeTokens.motion.standard} ease,
            box-shadow ${themeTokens.motion.standard} ease,
            transform ${themeTokens.motion.fast} ease;
        }

        .ryvra-ui-button:hover {
          border-color: ${themeTokens.color.primary};
        }

        .ryvra-ui-button:active {
          transform: translateY(1px);
        }

        .ryvra-ui-button:focus-visible {
          outline: ${themeTokens.focusRing.width} solid ${themeTokens.color.focusRing};
          outline-offset: ${themeTokens.focusRing.offset};
        }

        .ryvra-ui-button:disabled {
          background: ${themeTokens.color.disabledBackground};
          color: ${themeTokens.color.disabledText};
          border-color: transparent;
          cursor: not-allowed;
        }
      `}</style>
      <button
        {...props}
        className={["ryvra-ui-button", props.className].filter(Boolean).join(" ")}
        style={{
          borderColor: variant === "primary" ? themeTokens.color.primary : themeTokens.color.borderStrong,
          borderRadius: themeTokens.radius.md,
          padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.lg}`,
          background: variantStyles[variant],
          color: textColor,
          boxShadow: themeTokens.shadow.sm,
          ...style,
        }}
      />
    </>
  );
}
