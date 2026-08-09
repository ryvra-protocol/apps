export interface EligibilityResult {
  eligible: boolean;
  reasonCode?: string;
}

export const dailyClaimStatuses = ["available", "already_claimed", "cooldown"] as const;
export type DailyClaimStatus = (typeof dailyClaimStatuses)[number];

export interface DailyClaimStateDto {
  accountId: string;
  userId?: string | null;
  workspaceId?: string | null;
  eligible: boolean;
  status?: DailyClaimStatus;
  reasonCode?: string;
  claimedAt?: string | null;
  nextEligibleAt?: string | null;
  invokeEndpointAvailable: boolean;
}

export interface DailyCapInput {
  baseCap: number;
  usageToday: number;
  multiplier?: number;
}

export interface DailyCapResult {
  cap: number;
  consumed: number;
  remaining: number;
}

export interface EpochMetadata {
  epochId: string;
  startsAt: string;
  endsAt: string;
}

export interface ConversionPreviewDto {
  sourcePoints: number;
  conversionRate: number;
  targetToken: string;
  expectedTokens: number;
}

export function calculateDailyCap(input: DailyCapInput): DailyCapResult {
  const cap = input.baseCap * (input.multiplier ?? 1);
  const consumed = Math.max(0, input.usageToday);
  return {
    cap,
    consumed,
    remaining: Math.max(0, cap - consumed),
  };
}

export function createConversionPreview(
  sourcePoints: number,
  conversionRate: number,
  targetToken: string,
): ConversionPreviewDto {
  return {
    sourcePoints,
    conversionRate,
    targetToken,
    expectedTokens: sourcePoints * conversionRate,
  };
}
