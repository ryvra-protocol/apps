import type { ButtonHTMLAttributes } from "react";
import { themeTokens } from "./theme";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", style, ...props }: ButtonProps) {
  return (
    <>
      <style>{`
        .ryvra-ui-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: ${themeTokens.spacing.xs};
          min-height: 2.5rem;
          font-family: ${themeTokens.typography.fontFamily};
          font-size: ${themeTokens.typography.size.sm};
          font-weight: ${themeTokens.typography.weight.medium};
          line-height: ${themeTokens.typography.lineHeight.normal};
          border-radius: ${themeTokens.radius.md};
          padding: ${themeTokens.spacing.sm} ${themeTokens.spacing.lg};
          border: 1px solid transparent;
          cursor: pointer;
          text-decoration: none;
          transition:
            background-color ${themeTokens.motion.standard} ease,
            color ${themeTokens.motion.standard} ease,
            border-color ${themeTokens.motion.standard} ease,
            box-shadow ${themeTokens.motion.standard} ease,
            transform ${themeTokens.motion.fast} ease;
        }

        .ryvra-ui-button[data-variant='primary'] {
          background: ${themeTokens.color.primary};
          color: ${themeTokens.color.textInverse};
          border-color: ${themeTokens.color.primary};
          box-shadow: ${themeTokens.shadow.sm};
        }

        .ryvra-ui-button[data-variant='primary']:hover {
          background: ${themeTokens.color.primaryHover};
          border-color: ${themeTokens.color.primaryHover};
        }

        .ryvra-ui-button[data-variant='secondary'] {
          background: ${themeTokens.color.surface};
          color: ${themeTokens.color.text};
          border-color: ${themeTokens.color.borderStrong};
          box-shadow: ${themeTokens.shadow.sm};
        }

        .ryvra-ui-button[data-variant='secondary']:hover {
          background: ${themeTokens.color.surfaceStrong};
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
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
      <button
        {...props}
        data-variant={variant}
        className={["ryvra-ui-button", props.className].filter(Boolean).join(" ")}
        style={style}
      />
    </>
  );
}
