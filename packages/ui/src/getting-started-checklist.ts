import type { StorageLike } from "./i18n-runtime";

export const gettingStartedChecklistStoragePrefix = "ryvra.onboarding";

export const gettingStartedStepIds = [
  "connect_select_scope",
  "review_unified_balance",
  "complete_first_action",
  "verify_notifications_preferences",
] as const;

export type GettingStartedStepId = (typeof gettingStartedStepIds)[number];

export interface GettingStartedChecklistStep {
  id: GettingStartedStepId;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}

export interface GettingStartedChecklistState {
  version: 1;
  completedStepIds: GettingStartedStepId[];
  minimized: boolean;
  dismissed: boolean;
}

interface BuildDefaultChecklistStepsInput {
  scopeHref: string;
  unifiedBalanceHref: string;
  firstActionHref: string;
  firstActionLabel: string;
  notificationsHref: string;
}

function uniqueStepIds(values: GettingStartedStepId[]): GettingStartedStepId[] {
  const ordered = values.filter((value, index) => values.indexOf(value) === index);
  return gettingStartedStepIds.filter((stepId) => ordered.includes(stepId));
}

function isStepId(value: unknown): value is GettingStartedStepId {
  return typeof value === "string" && gettingStartedStepIds.includes(value as GettingStartedStepId);
}

export function buildDefaultChecklistSteps(input: BuildDefaultChecklistStepsInput): GettingStartedChecklistStep[] {
  return [
    {
      id: "connect_select_scope",
      title: "Connect or select scope",
      description: "Confirm account and workspace scope before starting activation actions.",
      href: input.scopeHref,
      ctaLabel: "Open scope",
    },
    {
      id: "review_unified_balance",
      title: "Review unified balance",
      description: "Confirm current balance context before progressing to conversion steps.",
      href: input.unifiedBalanceHref,
      ctaLabel: "Review balance",
    },
    {
      id: "complete_first_action",
      title: input.firstActionLabel,
      description: "Initiate your first conversion-focused workflow action.",
      href: input.firstActionHref,
      ctaLabel: "Open action",
    },
    {
      id: "verify_notifications_preferences",
      title: "Verify notifications and preferences",
      description: "Confirm alert and communication preferences before leaving onboarding.",
      href: input.notificationsHref,
      ctaLabel: "Open preferences",
    },
  ];
}

export function createGettingStartedChecklistState(
  initialCompletedStepIds: GettingStartedStepId[] = [],
): GettingStartedChecklistState {
  return {
    version: 1,
    completedStepIds: uniqueStepIds(initialCompletedStepIds),
    minimized: false,
    dismissed: false,
  };
}

export function buildGettingStartedChecklistStorageKey(appId: string, scopeHash: string): string {
  return `${gettingStartedChecklistStoragePrefix}.${appId}.${scopeHash}`;
}

export function completeChecklistStep(
  state: GettingStartedChecklistState,
  stepId: GettingStartedStepId,
): GettingStartedChecklistState {
  if (state.completedStepIds.includes(stepId)) {
    return state;
  }

  return {
    ...state,
    completedStepIds: [...state.completedStepIds, stepId],
  };
}

export function toggleChecklistMinimized(state: GettingStartedChecklistState): GettingStartedChecklistState {
  return {
    ...state,
    minimized: !state.minimized,
  };
}

export function setChecklistDismissed(
  state: GettingStartedChecklistState,
  dismissed: boolean,
): GettingStartedChecklistState {
  return {
    ...state,
    dismissed,
  };
}

export function resetChecklistState(
  _state: GettingStartedChecklistState,
  initialCompletedStepIds: GettingStartedStepId[] = [],
): GettingStartedChecklistState {
  return createGettingStartedChecklistState(initialCompletedStepIds);
}

export function resolveChecklistProgress(state: GettingStartedChecklistState): {
  completed: number;
  remaining: number;
  total: number;
} {
  const completed = state.completedStepIds.length;
  const total = gettingStartedStepIds.length;
  return {
    completed,
    remaining: Math.max(0, total - completed),
    total,
  };
}

export function parseChecklistState(raw: string | null): GettingStartedChecklistState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      completedStepIds?: unknown;
      minimized?: unknown;
      dismissed?: unknown;
    };

    if (parsed.version !== 1 || !Array.isArray(parsed.completedStepIds)) {
      return null;
    }

    const completedStepIds = parsed.completedStepIds.filter((value): value is GettingStartedStepId => isStepId(value));

    return {
      version: 1,
      completedStepIds: uniqueStepIds(completedStepIds),
      minimized: parsed.minimized === true,
      dismissed: parsed.dismissed === true,
    };
  } catch {
    return null;
  }
}

export function readChecklistState(storage: StorageLike | null, storageKey: string): GettingStartedChecklistState | null {
  if (!storage) {
    return null;
  }

  return parseChecklistState(storage.getItem(storageKey));
}

export function writeChecklistState(storage: StorageLike | null, storageKey: string, state: GettingStartedChecklistState): void {
  if (!storage) {
    return;
  }

  storage.setItem(storageKey, JSON.stringify(state));
}
