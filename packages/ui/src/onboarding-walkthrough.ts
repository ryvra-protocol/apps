export const ONBOARDING_WALKTHROUGH_STORAGE_PREFIX = "ryvra:onboarding:walkthrough:v1";

export type OnboardingWalkthroughState = "dismissed" | "completed";

function normalizeScopeKey(scopeKey: string): string {
  const trimmed = scopeKey.trim();
  if (trimmed.length === 0) {
    return "global";
  }

  return trimmed.replace(/\s+/g, "_");
}

export function buildOnboardingWalkthroughStorageKey(scopeKey: string): string {
  return `${ONBOARDING_WALKTHROUGH_STORAGE_PREFIX}:${normalizeScopeKey(scopeKey)}`;
}

export function readOnboardingWalkthroughState(
  storage: Pick<Storage, "getItem"> | null | undefined,
  scopeKey: string,
): OnboardingWalkthroughState | null {
  if (!storage) {
    return null;
  }

  const storedValue = storage.getItem(buildOnboardingWalkthroughStorageKey(scopeKey));
  if (storedValue === "dismissed" || storedValue === "completed") {
    return storedValue;
  }

  return null;
}

export function writeOnboardingWalkthroughState(
  storage: Pick<Storage, "setItem"> | null | undefined,
  scopeKey: string,
  state: OnboardingWalkthroughState,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(buildOnboardingWalkthroughStorageKey(scopeKey), state);
  } catch {
    // ignore storage write failures (private mode/storage quotas)
  }
}

export function shouldShowOnboardingWalkthrough(
  storage: Pick<Storage, "getItem"> | null | undefined,
  scopeKey: string,
): boolean {
  return readOnboardingWalkthroughState(storage, scopeKey) === null;
}
