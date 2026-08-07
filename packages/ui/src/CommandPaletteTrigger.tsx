import type { ButtonHTMLAttributes } from "react";

export interface CommandPaletteTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function CommandPaletteTrigger({
  type = "button",
  label = "Command Palette",
  ...buttonProps
}: CommandPaletteTriggerProps) {
  return (
    <button type={type} className="ryvra-command-trigger" aria-label={label} {...buttonProps}>
      <span aria-hidden="true">⌘K</span>
      <span style={{ marginLeft: "0.375rem" }}>{label}</span>
    </button>
  );
}
