import type { StorageLike } from "./i18n-runtime";
import {
  createGrowthInstrumentation,
  hashIdentifier,
  type FunnelActionType,
  type GrowthInstrumentation,
  type GrowthScope,
} from "./growth-instrumentation";

export const claimConversionExperimentId = "claim_conversion_phase19_v1";
export const claimExperimentOverrideQueryParam = "claim_variant";

export const claimConversionVariants = ["control", "trust_boost"] as const;
export type ClaimConversionVariant = (typeof claimConversionVariants)[number];

export interface ClaimExperimentAssignment {
  experimentId: string;
  variant: ClaimConversionVariant;
  source: "qa_override" | "persisted" | "deterministic";
  storageKey: string;
  scopeHash: string;
}

export interface ClaimVariantPresentation {
  ctaLabel: string;
  trustHeadline: string;
  trustDetail: string;
  emphasizeTrust: boolean;
}

interface ResolveClaimExperimentAssignmentInput {
  scopeHash: string;
  experimentId?: string;
  storage?: StorageLike | null;
  overrideVariant?: string | null;
}

interface ClaimVariantPresentationInput {
  defaultCtaLabel: string;
  trustBoostCtaLabel?: string;
}

interface CreateClaimExperimentTrackerInput {
  instrumentation: GrowthInstrumentation;
  assignment: ClaimExperimentAssignment;
  actionType: FunnelActionType;
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function parseClaimVariant(value: string | null | undefined): ClaimConversionVariant | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return claimConversionVariants.find((variant) => variant === normalized);
}

function createSeededVariant(seed: string): ClaimConversionVariant {
  const hashHex = hashIdentifier(seed).slice(1);
  const hashNumber = Number.parseInt(hashHex, 16);
  const index = Number.isFinite(hashNumber) ? hashNumber % claimConversionVariants.length : 0;
  return claimConversionVariants[index] ?? claimConversionVariants[0];
}

export function buildClaimExperimentStorageKey(experimentId: string, scopeHash: string): string {
  return `ryvra.exp.${experimentId}.${scopeHash}`;
}

export function buildClaimExperimentOverrideStorageKey(experimentId: string, scopeHash: string): string {
  return `ryvra.exp.override.${experimentId}.${scopeHash}`;
}

export function resolveClaimExperimentOverride(searchParams: URLSearchParams | string | null | undefined): ClaimConversionVariant | undefined {
  if (!searchParams) {
    return undefined;
  }

  if (typeof searchParams === "string") {
    const normalized = searchParams.startsWith("?") ? searchParams.slice(1) : searchParams;
    return parseClaimVariant(new URLSearchParams(normalized).get(claimExperimentOverrideQueryParam));
  }

  return parseClaimVariant(searchParams.get(claimExperimentOverrideQueryParam));
}

export function resolveClaimExperimentAssignment({
  scopeHash,
  experimentId = claimConversionExperimentId,
  storage,
  overrideVariant,
}: ResolveClaimExperimentAssignmentInput): ClaimExperimentAssignment {
  const resolvedStorage = resolveStorage(storage);
  const storageKey = buildClaimExperimentStorageKey(experimentId, scopeHash);
  const overrideStorageKey = buildClaimExperimentOverrideStorageKey(experimentId, scopeHash);

  const parsedOverride = parseClaimVariant(overrideVariant ?? null);
  const persistedOverride = parsedOverride
    ? parsedOverride
    : parseClaimVariant(resolvedStorage?.getItem(overrideStorageKey) ?? null);

  if (persistedOverride) {
    if (resolvedStorage) {
      resolvedStorage.setItem(overrideStorageKey, persistedOverride);
      resolvedStorage.setItem(storageKey, persistedOverride);
    }

    return {
      experimentId,
      variant: persistedOverride,
      source: "qa_override",
      storageKey,
      scopeHash,
    };
  }

  const persistedVariant = parseClaimVariant(resolvedStorage?.getItem(storageKey) ?? null);
  if (persistedVariant) {
    return {
      experimentId,
      variant: persistedVariant,
      source: "persisted",
      storageKey,
      scopeHash,
    };
  }

  const deterministicVariant = createSeededVariant(`${experimentId}:${scopeHash}`);
  if (resolvedStorage) {
    resolvedStorage.setItem(storageKey, deterministicVariant);
  }

  return {
    experimentId,
    variant: deterministicVariant,
    source: "deterministic",
    storageKey,
    scopeHash,
  };
}

export function buildClaimVariantPresentation(
  variant: ClaimConversionVariant,
  input: ClaimVariantPresentationInput,
): ClaimVariantPresentation {
  if (variant === "trust_boost") {
    return {
      ctaLabel: input.trustBoostCtaLabel?.trim() || `Secure ${input.defaultCtaLabel.toLowerCase()}`,
      trustHeadline: "Secure checks and explicit status updates guide each claim attempt.",
      trustDetail: "Role, scope, and retry safeguards remain enforced before any write operation.",
      emphasizeTrust: true,
    };
  }

  return {
    ctaLabel: input.defaultCtaLabel,
    trustHeadline: "Review status and retry guidance before submitting.",
    trustDetail: "You can cancel or retry safely without bypassing claim guardrails.",
    emphasizeTrust: false,
  };
}

export function resolveClaimActionEnabled(canOperate: boolean, actionEnabled: boolean): boolean {
  return canOperate && actionEnabled;
}

export function createClaimConversionEventTracker({
  instrumentation,
  assignment,
  actionType,
}: CreateClaimExperimentTrackerInput) {
  let exposureTracked = false;
  let actionInProgress = false;

  const baseEventInput = {
    experimentId: assignment.experimentId,
    variant: assignment.variant,
    actionType,
  } as const;

  return {
    trackExposure(): void {
      if (exposureTracked) {
        return;
      }

      instrumentation.emitEvent("variant_exposed", baseEventInput);
      exposureTracked = true;
    },
    trackCtaClick(): void {
      actionInProgress = true;
      instrumentation.emitEvent("cta_clicked", baseEventInput);
      instrumentation.emitFunnelStage("first_key_action_initiation", "stage_entered", baseEventInput);
      instrumentation.emitFunnelStage("first_key_action_initiation", "stage_completed", baseEventInput);
    },
    trackSuccess(): void {
      instrumentation.emitEvent("claim_success", baseEventInput);
      instrumentation.emitFunnelStage("completion_success", "stage_entered", baseEventInput);
      instrumentation.emitFunnelStage("completion_success", "stage_completed", baseEventInput);
      actionInProgress = false;
    },
    trackFailure(): void {
      instrumentation.emitEvent("claim_failure", baseEventInput);
      actionInProgress = false;
    },
    trackAbandoned(): void {
      if (!actionInProgress) {
        return;
      }

      instrumentation.emitFunnelStage("first_key_action_initiation", "stage_abandoned", baseEventInput);
      actionInProgress = false;
    },
  };
}

export function createClaimExperimentInstrumentation(input: {
  appId: string;
  route: string;
  scope: GrowthScope;
  storage?: StorageLike | null;
}) {
  return createGrowthInstrumentation({
    appId: input.appId,
    route: input.route,
    scope: input.scope,
    ...(typeof input.storage === "undefined" ? {} : { storage: input.storage }),
  });
}
