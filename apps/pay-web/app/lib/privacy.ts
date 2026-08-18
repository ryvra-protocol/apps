export function redactIdentifier(value: string, visiblePrefix = 3, visibleSuffix = 2): string {
  const normalized = value.trim();
  if (normalized.length <= visiblePrefix + visibleSuffix) {
    return "••••";
  }

  return `${normalized.slice(0, visiblePrefix)}•••${normalized.slice(-visibleSuffix)}`;
}

export function redactMemo(value: string | undefined, maxLength = 96): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  const compact = normalized.replace(/\s+/g, " ");
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}…` : compact;
}

export function sanitizeHandle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
