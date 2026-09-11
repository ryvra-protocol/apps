export interface FingerprintClaimScope {
  accountId: string;
  userId?: string;
  workspaceId?: string;
}

interface FingerprintClaimRecord {
  awardedPoints: number;
  scanTimestamp: string;
  claimDateKey: string;
}

interface FingerprintClaimAggregate {
  totalFingerprints: number;
  totalPrintsScanned: number;
  cumulativePointsAwarded: number;
}

export interface FingerprintClaimStatusSnapshot {
  accountId: string;
  userId?: string;
  workspaceId?: string;
  eligible: boolean;
  status: "available" | "already_claimed";
  reasonCode: "claim_available" | "already_claimed_today";
  claimedAt?: string;
  nextEligibleAt?: string;
  invokeEndpointAvailable: boolean;
}

export interface CommunityTopMetricsSnapshot {
  accountId: string;
  userId?: string;
  workspaceId?: string;
  totalFingerprints: number;
  totalPrintsScanned: number;
  cumulativePointsAwarded: number;
  averagePointsPerScan: number;
  derivedCalculations: number;
}

interface SuccessfulFingerprintClaim {
  ok: true;
  awardedPoints: number;
  scanTimestamp: string;
  claimDateKey: string;
  status: FingerprintClaimStatusSnapshot;
  metrics: CommunityTopMetricsSnapshot;
}

interface FailedFingerprintClaim {
  ok: false;
  error: {
    code: "already_claimed_today";
    message: string;
    retryable: false;
    source: "points_tasks";
    status: 409;
    requestId: string;
    correlationId: string;
  };
  status: FingerprintClaimStatusSnapshot;
}

export type FingerprintClaimSubmissionResult = SuccessfulFingerprintClaim | FailedFingerprintClaim;

const claimRecordsByScope = new Map<string, FingerprintClaimRecord>();
const aggregatesByScope = new Map<string, FingerprintClaimAggregate>();
const idempotencyByScope = new Map<string, Map<string, FingerprintClaimSubmissionResult>>();

function resolveScopeKey(scope: FingerprintClaimScope): string {
  return `${scope.accountId}::${scope.userId ?? "user:*"}::${scope.workspaceId ?? "workspace:*"}`;
}

function getTimeZone(): string {
  const configuredTimeZone = process.env.RYVRA_POINTS_TASKS_CLAIM_TIMEZONE?.trim();
  return configuredTimeZone && configuredTimeZone.length > 0 ? configuredTimeZone : "UTC";
}

function asIsoDateKey(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function resolveCurrentDateKey(nowIso: string, timeZone: string): string {
  return asIsoDateKey(new Date(nowIso), timeZone);
}

function resolveNextEligibleAt(nowIso: string): string {
  const next = new Date(nowIso);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}

function getAggregate(scopeKey: string): FingerprintClaimAggregate {
  const existing = aggregatesByScope.get(scopeKey);
  if (existing) {
    return existing;
  }

  const initial: FingerprintClaimAggregate = {
    totalFingerprints: 0,
    totalPrintsScanned: 0,
    cumulativePointsAwarded: 0,
  };
  aggregatesByScope.set(scopeKey, initial);
  return initial;
}

function buildStatus(scope: FingerprintClaimScope, record: FingerprintClaimRecord | undefined, nowIso: string): FingerprintClaimStatusSnapshot {
  const timeZone = getTimeZone();
  const todayDateKey = resolveCurrentDateKey(nowIso, timeZone);
  const alreadyClaimedToday = Boolean(record && record.claimDateKey === todayDateKey);

  return {
    accountId: scope.accountId,
    ...(scope.userId ? { userId: scope.userId } : {}),
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
    eligible: !alreadyClaimedToday,
    status: alreadyClaimedToday ? "already_claimed" : "available",
    reasonCode: alreadyClaimedToday ? "already_claimed_today" : "claim_available",
    ...(record?.scanTimestamp ? { claimedAt: record.scanTimestamp } : {}),
    ...(alreadyClaimedToday ? { nextEligibleAt: resolveNextEligibleAt(nowIso) } : {}),
    invokeEndpointAvailable: true,
  };
}

function buildMetrics(scope: FingerprintClaimScope, aggregate: FingerprintClaimAggregate): CommunityTopMetricsSnapshot {
  const averagePointsPerScan =
    aggregate.totalPrintsScanned > 0 ? aggregate.cumulativePointsAwarded / aggregate.totalPrintsScanned : 0;

  return {
    accountId: scope.accountId,
    ...(scope.userId ? { userId: scope.userId } : {}),
    ...(scope.workspaceId ? { workspaceId: scope.workspaceId } : {}),
    totalFingerprints: aggregate.totalFingerprints,
    totalPrintsScanned: aggregate.totalPrintsScanned,
    cumulativePointsAwarded: aggregate.cumulativePointsAwarded,
    averagePointsPerScan,
    derivedCalculations: 2,
  };
}

export function generateUniformRandomAwardPoints(randomValue = Math.random()): number {
  const boundedRandom = Math.min(1, Math.max(0, randomValue));
  return 0.5 + boundedRandom * 1.5;
}

export function getFingerprintClaimStatus(scope: FingerprintClaimScope, nowIso = new Date().toISOString()): FingerprintClaimStatusSnapshot {
  const scopeKey = resolveScopeKey(scope);
  return buildStatus(scope, claimRecordsByScope.get(scopeKey), nowIso);
}

export function getCommunityTopMetrics(scope: FingerprintClaimScope): CommunityTopMetricsSnapshot {
  const scopeKey = resolveScopeKey(scope);
  return buildMetrics(scope, getAggregate(scopeKey));
}

export function submitFingerprintClaim(input: {
  scope: FingerprintClaimScope;
  idempotencyKey: string;
  requestId: string;
  correlationId: string;
  nowIso?: string;
  randomValue?: number;
}): FingerprintClaimSubmissionResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const scopeKey = resolveScopeKey(input.scope);
  const idempotencyIndex = idempotencyByScope.get(scopeKey) ?? new Map<string, FingerprintClaimSubmissionResult>();
  idempotencyByScope.set(scopeKey, idempotencyIndex);

  const cached = idempotencyIndex.get(input.idempotencyKey);
  if (cached) {
    return cached;
  }

  const existingRecord = claimRecordsByScope.get(scopeKey);
  const status = buildStatus(input.scope, existingRecord, nowIso);
  if (!status.eligible) {
    const denied: FailedFingerprintClaim = {
      ok: false,
      error: {
        code: "already_claimed_today",
        message: "Fingerprint scan already claimed for today.",
        retryable: false,
        source: "points_tasks",
        status: 409,
        requestId: input.requestId,
        correlationId: input.correlationId,
      },
      status,
    };
    idempotencyIndex.set(input.idempotencyKey, denied);
    return denied;
  }

  const claimDateKey = resolveCurrentDateKey(nowIso, getTimeZone());
  const awardedPoints = generateUniformRandomAwardPoints(input.randomValue);
  const nextRecord: FingerprintClaimRecord = {
    awardedPoints,
    scanTimestamp: nowIso,
    claimDateKey,
  };
  claimRecordsByScope.set(scopeKey, nextRecord);

  const aggregate = getAggregate(scopeKey);
  aggregate.totalFingerprints += 1;
  aggregate.totalPrintsScanned += 1;
  aggregate.cumulativePointsAwarded += awardedPoints;

  const result: SuccessfulFingerprintClaim = {
    ok: true,
    awardedPoints,
    scanTimestamp: nowIso,
    claimDateKey,
    status: buildStatus(input.scope, nextRecord, nowIso),
    metrics: buildMetrics(input.scope, aggregate),
  };
  idempotencyIndex.set(input.idempotencyKey, result);
  return result;
}

export function resetFingerprintClaimStateForTests(): void {
  claimRecordsByScope.clear();
  aggregatesByScope.clear();
  idempotencyByScope.clear();
}
