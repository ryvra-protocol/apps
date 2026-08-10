export interface WorkspaceScopeOption {
  value: string;
  label: string;
}

export interface WorkspaceScopeSelection {
  accountId: string;
  workspaceId?: string;
  userId?: string;
}

export interface WorkspaceScopeDefaults {
  accountId: string;
  workspaceId?: string;
  userId?: string;
}

export interface ResolveWorkspaceScopeInput {
  searchParams: SearchParamsLike;
  defaults: WorkspaceScopeDefaults;
  accountOptions: readonly WorkspaceScopeOption[];
  workspaceOptions?: readonly WorkspaceScopeOption[];
  userOptions?: readonly WorkspaceScopeOption[];
  includeUserScope?: boolean;
}

export interface ResolveWorkspaceScopeResult {
  scope: WorkspaceScopeSelection;
  notices: string[];
  canonicalSearchParams: URLSearchParams;
  needsCanonicalization: boolean;
}

type SearchParamsLike = URLSearchParams | Pick<URLSearchParams, "toString" | "get">;

const scopeValuePattern = /^[A-Za-z0-9][A-Za-z0-9:_-]{1,63}$/;

const scopeQueryKeys = {
  accountId: ["account_id", "accountId"],
  workspaceId: ["workspace_id", "workspaceId"],
  userId: ["user_id", "userId"],
} as const;

function normalizeScopeValue(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toReadonlySearchParams(searchParams: SearchParamsLike): URLSearchParams {
  return new URLSearchParams(searchParams.toString());
}

function resolveFallbackValue(candidate: string | undefined, options: readonly WorkspaceScopeOption[]): string {
  if (candidate && isValidScopeValue(candidate)) {
    return candidate;
  }

  const firstOption = options[0]?.value;
  if (firstOption && isValidScopeValue(firstOption)) {
    return firstOption;
  }

  return "acct-core-1";
}

function pickFirstQueryValue(searchParams: URLSearchParams, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeScopeValue(searchParams.get(key));
    if (value) {
      return value;
    }
  }

  return undefined;
}

function normalizeOptionValues(options: readonly WorkspaceScopeOption[]): string[] {
  return [...new Set(options.map((option) => normalizeScopeValue(option.value)).filter((value): value is string => Boolean(value)))];
}

function resolveFieldValue(input: {
  fieldLabel: string;
  rawValue: string | undefined;
  fallbackValue: string | undefined;
  allowedValues: readonly string[];
}): { value: string | undefined; notices: string[] } {
  const notices: string[] = [];
  const fallbackValue = normalizeScopeValue(input.fallbackValue);
  const rawValue = normalizeScopeValue(input.rawValue);

  if (!rawValue) {
    return {
      value: fallbackValue,
      notices,
    };
  }

  if (!isValidScopeValue(rawValue)) {
    notices.push(`${input.fieldLabel} scope value was invalid and has been reset.`);
    return {
      value: fallbackValue,
      notices,
    };
  }

  if (input.allowedValues.length > 0 && !input.allowedValues.includes(rawValue)) {
    notices.push(`${input.fieldLabel} scope value is not available and has been reset.`);
    return {
      value: fallbackValue,
      notices,
    };
  }

  return {
    value: rawValue,
    notices,
  };
}

function clearAliasKeys(searchParams: URLSearchParams, canonicalKey: string, aliases: readonly string[]): void {
  for (const alias of aliases) {
    if (alias !== canonicalKey) {
      searchParams.delete(alias);
    }
  }
}

function writeCanonicalScope(searchParams: URLSearchParams, scope: WorkspaceScopeSelection, includeUserScope: boolean): void {
  const accountId = normalizeScopeValue(scope.accountId);
  if (accountId) {
    searchParams.set("account_id", accountId);
  } else {
    searchParams.delete("account_id");
  }
  clearAliasKeys(searchParams, "account_id", scopeQueryKeys.accountId);

  const workspaceId = normalizeScopeValue(scope.workspaceId);
  if (workspaceId) {
    searchParams.set("workspace_id", workspaceId);
  } else {
    searchParams.delete("workspace_id");
  }
  clearAliasKeys(searchParams, "workspace_id", scopeQueryKeys.workspaceId);

  if (includeUserScope) {
    const userId = normalizeScopeValue(scope.userId);
    if (userId) {
      searchParams.set("user_id", userId);
    } else {
      searchParams.delete("user_id");
    }
  } else {
    searchParams.delete("user_id");
  }
  clearAliasKeys(searchParams, "user_id", scopeQueryKeys.userId);
}

export function isValidScopeValue(value: string): boolean {
  return scopeValuePattern.test(value);
}

export function buildWorkspaceScopeOptions(values: readonly (string | undefined | null)[]): WorkspaceScopeOption[] {
  const options: WorkspaceScopeOption[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeScopeValue(value);
    if (!normalized || !isValidScopeValue(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    options.push({
      value: normalized,
      label: normalized,
    });
  }

  return options;
}

export function resolveWorkspaceScope(input: ResolveWorkspaceScopeInput): ResolveWorkspaceScopeResult {
  const includeUserScope = input.includeUserScope ?? false;
  const original = toReadonlySearchParams(input.searchParams);
  const canonical = toReadonlySearchParams(input.searchParams);
  const notices: string[] = [];

  const accountOptionValues = normalizeOptionValues(input.accountOptions);
  const workspaceOptionValues = normalizeOptionValues(input.workspaceOptions ?? []);
  const userOptionValues = normalizeOptionValues(input.userOptions ?? []);

  const accountFallback = resolveFallbackValue(input.defaults.accountId, input.accountOptions);
  const workspaceFallback = resolveFallbackValue(
    input.defaults.workspaceId,
    input.workspaceOptions ?? [{ value: "workspace-core-1", label: "workspace-core-1" }],
  );
  const userFallback = includeUserScope ? resolveFallbackValue(input.defaults.userId, input.userOptions ?? []) : undefined;

  const accountResult = resolveFieldValue({
    fieldLabel: "Account",
    rawValue: pickFirstQueryValue(original, scopeQueryKeys.accountId),
    fallbackValue: accountFallback,
    allowedValues: accountOptionValues,
  });
  notices.push(...accountResult.notices);

  const workspaceResult = resolveFieldValue({
    fieldLabel: "Workspace",
    rawValue: pickFirstQueryValue(original, scopeQueryKeys.workspaceId),
    fallbackValue: workspaceFallback,
    allowedValues: workspaceOptionValues,
  });
  notices.push(...workspaceResult.notices);

  const userResult = includeUserScope
    ? resolveFieldValue({
        fieldLabel: "User",
        rawValue: pickFirstQueryValue(original, scopeQueryKeys.userId),
        fallbackValue: userFallback,
        allowedValues: userOptionValues,
      })
    : { value: undefined, notices: [] as string[] };
  notices.push(...userResult.notices);

  const scope: WorkspaceScopeSelection = {
    accountId: accountResult.value ?? accountFallback,
    ...(workspaceResult.value ? { workspaceId: workspaceResult.value } : {}),
    ...(includeUserScope && userResult.value ? { userId: userResult.value } : {}),
  };

  writeCanonicalScope(canonical, scope, includeUserScope);

  return {
    scope,
    notices,
    canonicalSearchParams: canonical,
    needsCanonicalization: canonical.toString() !== original.toString(),
  };
}

export function applyScopeToQuery(input: {
  searchParams: SearchParamsLike;
  scope: WorkspaceScopeSelection;
  includeUserScope?: boolean;
  preserveKeys?: readonly string[];
}): URLSearchParams {
  const includeUserScope = input.includeUserScope ?? false;
  const current = toReadonlySearchParams(input.searchParams);
  const next = new URLSearchParams();

  for (const key of input.preserveKeys ?? []) {
    const value = normalizeScopeValue(current.get(key));
    if (value) {
      next.set(key, value);
    }
  }

  writeCanonicalScope(next, input.scope, includeUserScope);
  return next;
}

export function appendScopeToHref(
  href: string,
  scope: WorkspaceScopeSelection,
  options: { includeUserScope?: boolean } = {},
): string {
  const includeUserScope = options.includeUserScope ?? false;
  const parsed = new URL(href, "https://ryvra.local");
  writeCanonicalScope(parsed.searchParams, scope, includeUserScope);

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return parsed.toString();
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function buildScopePersistenceStorageKey(productId: string): string {
  return `ryvra.scope.${productId}`;
}

export function parseStoredScope(rawValue: string | null): WorkspaceScopeSelection | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<WorkspaceScopeSelection>;
    const accountId = normalizeScopeValue(parsed.accountId);
    if (!accountId || !isValidScopeValue(accountId)) {
      return null;
    }

    const workspaceId = normalizeScopeValue(parsed.workspaceId);
    const userId = normalizeScopeValue(parsed.userId);

    return {
      accountId,
      ...(workspaceId && isValidScopeValue(workspaceId) ? { workspaceId } : {}),
      ...(userId && isValidScopeValue(userId) ? { userId } : {}),
    };
  } catch {
    return null;
  }
}
