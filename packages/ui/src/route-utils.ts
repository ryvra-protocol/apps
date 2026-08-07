import type { ShellNavItem } from "./navigation";

function normalizePath(path: string): string {
  if (path === "") {
    return "/";
  }

  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

function toPathname(href: string): string {
  try {
    const parsedUrl = new URL(href);
    return normalizePath(parsedUrl.pathname);
  } catch {
    return normalizePath(href.startsWith("/") ? href : `/${href}`);
  }
}

export function isCurrentRoute(item: ShellNavItem, currentPath?: string): boolean {
  if (typeof item.current === "boolean") {
    return item.current;
  }

  if (!currentPath) {
    return false;
  }

  const normalizedCurrentPath = normalizePath(currentPath);
  const itemPath = toPathname(item.href);

  if (itemPath === "/") {
    return normalizedCurrentPath === "/";
  }

  return normalizedCurrentPath === itemPath || normalizedCurrentPath.startsWith(`${itemPath}/`);
}
