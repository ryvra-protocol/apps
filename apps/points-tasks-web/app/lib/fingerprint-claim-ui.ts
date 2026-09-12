export type FingerprintClaimButtonState = "ready_to_scan" | "scanning" | "success" | "already_claimed" | "error";

export function resolveFingerprintClaimButtonState(input: {
  isSubmitting: boolean;
  isRefreshing: boolean;
  didSucceed: boolean;
  hasError: boolean;
  isAlreadyClaimed: boolean;
}): FingerprintClaimButtonState {
  if (input.isSubmitting || input.isRefreshing) {
    return "scanning";
  }

  if (input.hasError) {
    return "error";
  }

  if (input.didSucceed) {
    return "success";
  }

  if (input.isAlreadyClaimed) {
    return "already_claimed";
  }

  return "ready_to_scan";
}

export function getFingerprintClaimAriaLabel(state: FingerprintClaimButtonState): string {
  if (state === "scanning") {
    return "Fingerprint scan in progress";
  }

  if (state === "success") {
    return "Fingerprint scan completed successfully";
  }

  if (state === "already_claimed") {
    return "Daily fingerprint already claimed today";
  }

  if (state === "error") {
    return "Fingerprint scan failed, retry available";
  }

  return "Start fingerprint scan for daily claim";
}
