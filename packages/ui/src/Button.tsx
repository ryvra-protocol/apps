import type { ButtonHTMLAttributes } from "react";
import { themeTokens } from "./theme";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `${themeTokens.color.primary}20`,
  secondary: `${themeTokens.color.surface}`,
};

export function Button({ variant = "primary", style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        border: `1px solid ${themeTokens.color.primary}`,
        borderRadius: themeTokens.radius.sm,
        padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.md}`,
        background: variantStyles[variant],
        color: themeTokens.color.text,
        cursor: "pointer",
        ...style,
      }}
    />
  );
}
