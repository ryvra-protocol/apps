export const SIDEBAR_COLLAPSE_STORAGE_KEY = "ryvra:shell:sidebar-collapsed";

function parseCollapsedValue(value: string | null): boolean | null {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

export function readSidebarCollapsedPreference(
  storage: Pick<Storage, "getItem"> | null | undefined,
): boolean | null {
  if (!storage) {
    return null;
  }

  try {
    return parseCollapsedValue(storage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeSidebarCollapsedPreference(
  storage: Pick<Storage, "setItem"> | null | undefined,
  collapsed: boolean,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(collapsed));
  } catch {
    // ignore write failures (private mode/storage quotas)
  }
}

export function toggleSidebarCollapsed(collapsed: boolean): boolean {
  return !collapsed;
}
