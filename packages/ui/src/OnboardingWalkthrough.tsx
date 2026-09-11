"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { themeTokens } from "./theme";
import {
  shouldShowOnboardingWalkthrough,
  writeOnboardingWalkthroughState,
  type OnboardingWalkthroughState,
} from "./onboarding-walkthrough";

export interface OnboardingWalkthroughContent {
  heading: string;
  appSummary: string;
  keyActionsSummary: string;
  safeStartSummary: string;
  startCtaLabel?: string;
  dismissCtaLabel?: string;
}

export interface OnboardingWalkthroughDialogProps {
  content: OnboardingWalkthroughContent;
  onComplete: () => void;
  onDismiss: () => void;
}

export interface OnboardingWalkthroughProps {
  scopeKey: string;
  content?: OnboardingWalkthroughContent;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

export function resolveNextFocusIndex(currentIndex: number, total: number, moveBackward: boolean): number {
  if (total <= 0) {
    return -1;
  }

  if (currentIndex < 0) {
    return moveBackward ? total - 1 : 0;
  }

  if (moveBackward) {
    return (currentIndex - 1 + total) % total;
  }

  return (currentIndex + 1) % total;
}

export function OnboardingWalkthroughDialog({ content, onComplete, onDismiss }: OnboardingWalkthroughDialogProps) {
  const headingId = useId();
  const descriptionId = `${headingId}-description`;
  const dialogRef = useRef<HTMLDivElement | null>(null);

  function handleDialogKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const container = dialogRef.current;
    if (!container) {
      return;
    }

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const currentIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;
    const nextIndex = resolveNextFocusIndex(currentIndex, focusableElements.length, event.shiftKey);

    if (nextIndex === -1) {
      return;
    }

    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: themeTokens.spacing.lg,
        background: "rgba(15, 23, 42, 0.62)",
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        onKeyDown={handleDialogKeyboard}
        style={{
          width: "min(92vw, 32rem)",
          maxHeight: "86vh",
          overflowY: "auto",
          background: themeTokens.color.surface,
          color: themeTokens.color.text,
          borderRadius: themeTokens.radius.lg,
          border: `1px solid ${themeTokens.color.borderStrong}`,
          boxShadow: "0 24px 48px rgba(15, 23, 42, 0.3)",
          padding: themeTokens.spacing.lg,
          display: "grid",
          gap: themeTokens.spacing.md,
        }}
      >
        <h2 id={headingId} tabIndex={-1} style={{ margin: 0 }}>
          {content.heading}
        </h2>
        <p id={descriptionId} style={{ margin: 0, color: themeTokens.color.textMuted }}>
          {content.appSummary}
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "grid", gap: themeTokens.spacing.xs }}>
          <li>
            <strong>Where to act:</strong> {content.keyActionsSummary}
          </li>
          <li>
            <strong>Start safely:</strong> {content.safeStartSummary}
          </li>
        </ul>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: themeTokens.spacing.sm, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              borderRadius: themeTokens.radius.md,
              border: `1px solid ${themeTokens.color.borderStrong}`,
              background: themeTokens.color.surface,
              color: themeTokens.color.text,
              padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.md}`,
              fontWeight: themeTokens.typography.weight.medium,
            }}
          >
            {content.dismissCtaLabel ?? "Maybe later"}
          </button>
          <button
            type="button"
            onClick={onComplete}
            style={{
              borderRadius: themeTokens.radius.md,
              border: `1px solid ${themeTokens.color.primary}`,
              background: themeTokens.color.primary,
              color: themeTokens.color.surface,
              padding: `${themeTokens.spacing.sm} ${themeTokens.spacing.md}`,
              fontWeight: themeTokens.typography.weight.medium,
            }}
          >
            {content.startCtaLabel ?? "Show me around!"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingWalkthrough({ scopeKey, content }: OnboardingWalkthroughProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const enabled = Boolean(content);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    if (shouldShowOnboardingWalkthrough(window.localStorage, scopeKey)) {
      setIsOpen(true);
    }
  }, [enabled, scopeKey]);

  useEffect(() => {
    if (isOpen || !enabled) {
      return;
    }

    triggerRef.current?.focus();
  }, [enabled, isOpen]);

  const handleClose = (state: OnboardingWalkthroughState) => {
    if (typeof window !== "undefined") {
      writeOnboardingWalkthroughState(window.localStorage, scopeKey, state);
    }
    setIsOpen(false);
  };

  const hiddenTriggerLabel = useMemo(
    () => (content ? `Open onboarding walkthrough for ${content.heading}` : "Open onboarding walkthrough"),
    [content],
  );

  if (!enabled || !content || !isOpen) {
    return (
      <button
        ref={triggerRef}
        type="button"
        style={{ position: "fixed", opacity: 0, pointerEvents: "none" }}
        tabIndex={-1}
        aria-hidden="true"
      >
        {hiddenTriggerLabel}
      </button>
    );
  }

  return (
    <OnboardingWalkthroughDialog
      content={content}
      onDismiss={() => handleClose("dismissed")}
      onComplete={() => handleClose("completed")}
    />
  );
}
