import type { StorageLike } from "./i18n-runtime";

export const growthEventStorageKey = "ryvra.growth.events.v1";
export const growthEventNamespace = "phase_19_growth_conversion";

export type FunnelStage =
  | "landing_first_session"
  | "scope_selection"
  | "first_key_action_initiation"
  | "completion_success";

export type FunnelActionType = "claim" | "payout" | "task";

export type GrowthEventName =
  | "stage_entered"
  | "stage_completed"
  | "stage_abandoned"
  | "variant_exposed"
  | "cta_clicked"
  | "claim_success"
  | "claim_failure"
  | "onboarding_step_completed";

export type GrowthSinkMode = "local_preview" | "remote";

type GrowthMetadataValue = string | number | boolean;
export type GrowthMetadata = Record<string, GrowthMetadataValue>;

export interface GrowthScope {
  accountId?: string;
  workspaceId?: string;
  userId?: string;
}

export interface GrowthEvent {
  namespace: typeof growthEventNamespace;
  eventName: GrowthEventName;
  appId: string;
  route: string;
  scopeHash: string;
  sinkMode: GrowthSinkMode;
  at: string;
  stage?: FunnelStage;
  actionType?: FunnelActionType;
  experimentId?: string;
  variant?: string;
  stepId?: string;
  metadata?: GrowthMetadata;
}

export interface GrowthEventInput {
  actionType?: FunnelActionType;
  experimentId?: string;
  variant?: string;
  stepId?: string;
  metadata?: GrowthMetadata;
}

export interface GrowthInstrumentation {
  readonly appId: string;
  readonly route: string;
  readonly scopeHash: string;
  readonly sinkMode: GrowthSinkMode;
  emitFunnelStage: (stage: FunnelStage, eventName: "stage_entered" | "stage_completed" | "stage_abandoned", input?: GrowthEventInput) => GrowthEvent;
  emitEvent: (
    eventName:
      | "variant_exposed"
      | "cta_clicked"
      | "claim_success"
      | "claim_failure"
      | "onboarding_step_completed",
    input?: GrowthEventInput,
  ) => GrowthEvent;
}

interface CreateGrowthInstrumentationOptions {
  appId: string;
  route: string;
  scope: GrowthScope;
  storage?: StorageLike | null;
  remoteSink?: ((event: GrowthEvent) => void) | null;
  now?: () => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function resolveStorage(candidate?: StorageLike | null): StorageLike | null {
  if (candidate) {
    return candidate;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function normalizeRoute(route: string): string {
  const trimmed = route.trim();
  if (trimmed.length === 0) {
    return "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function sanitizeMetadata(metadata?: GrowthMetadata): GrowthMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  const redactionPattern = /(token|secret|password|authorization|auth|cookie|session|api[_-]?key)/i;
  const safeEntries: Array<[string, GrowthMetadataValue]> = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (redactionPattern.test(key)) {
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        continue;
      }

      safeEntries.push([key, trimmed.slice(0, 160)]);
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      safeEntries.push([key, value]);
    }
  }

  if (safeEntries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(safeEntries);
}

function appendGrowthEvent(storage: StorageLike | null, event: GrowthEvent): void {
  if (!storage) {
    return;
  }

  try {
    const existing = storage.getItem(growthEventStorageKey);
    const parsed = existing ? JSON.parse(existing) : [];
    const events = Array.isArray(parsed) ? (parsed as GrowthEvent[]) : [];
    events.push(event);
    const bounded = events.slice(-250);
    storage.setItem(growthEventStorageKey, JSON.stringify(bounded));
  } catch {
    // Swallow storage and parsing errors for non-blocking instrumentation.
  }
}

export function hashIdentifier(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `h${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildGrowthScopeHash(scope: GrowthScope): string {
  const account = scope.accountId?.trim() ?? "account:none";
  const workspace = scope.workspaceId?.trim() ?? "workspace:none";
  const user = scope.userId?.trim() ?? "user:none";
  return hashIdentifier(`${account}|${workspace}|${user}`);
}

export function readStoredGrowthEvents(storage?: StorageLike | null): GrowthEvent[] {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return [];
  }

  try {
    const raw = resolvedStorage.getItem(growthEventStorageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GrowthEvent[]) : [];
  } catch {
    return [];
  }
}

export function createGrowthInstrumentation(options: CreateGrowthInstrumentationOptions): GrowthInstrumentation {
  const now = options.now ?? defaultNow;
  const scopeHash = buildGrowthScopeHash(options.scope);
  const route = normalizeRoute(options.route);
  const storage = resolveStorage(options.storage);
  const sinkMode: GrowthSinkMode = options.remoteSink ? "remote" : "local_preview";

  const emit = (eventName: GrowthEventName, input?: GrowthEventInput, stage?: FunnelStage): GrowthEvent => {
    const sanitizedMetadata = sanitizeMetadata(input?.metadata);
    const event: GrowthEvent = {
      namespace: growthEventNamespace,
      eventName,
      appId: options.appId,
      route,
      scopeHash,
      sinkMode,
      at: now(),
      ...(stage ? { stage } : {}),
      ...(input?.actionType ? { actionType: input.actionType } : {}),
      ...(input?.experimentId ? { experimentId: input.experimentId } : {}),
      ...(input?.variant ? { variant: input.variant } : {}),
      ...(input?.stepId ? { stepId: input.stepId } : {}),
      ...(sanitizedMetadata ? { metadata: sanitizedMetadata } : {}),
    };

    if (options.remoteSink) {
      options.remoteSink(event);
    } else {
      appendGrowthEvent(storage, event);
    }

    return event;
  };

  return {
    appId: options.appId,
    route,
    scopeHash,
    sinkMode,
    emitFunnelStage(stage, eventName, input) {
      return emit(eventName, input, stage);
    },
    emitEvent(eventName, input) {
      return emit(eventName, input);
    },
  };
}
