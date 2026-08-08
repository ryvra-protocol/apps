"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type QueryValue = string | null | undefined;

interface SetQueryOptions {
  resetPage?: boolean;
}

export function useQueryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateQuery = useCallback(
    (updates: Record<string, QueryValue>, options: SetQueryOptions = {}) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        const normalized = value?.trim();
        if (!normalized) {
          nextParams.delete(key);
          continue;
        }

        nextParams.set(key, normalized);
      }

      if (options.resetPage ?? true) {
        nextParams.delete("page");
      }

      const serialized = nextParams.toString();
      router.replace(serialized.length > 0 ? `${pathname}?${serialized}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearQuery = useCallback(
    (keys: string[]) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      for (const key of keys) {
        nextParams.delete(key);
      }

      const serialized = nextParams.toString();
      router.replace(serialized.length > 0 ? `${pathname}?${serialized}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return {
    searchParams,
    updateQuery,
    clearQuery,
  };
}
