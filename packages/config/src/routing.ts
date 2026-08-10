import { z } from "zod";

const productIds = ["pay", "markets", "points"] as const;
const productIdSchema = z.enum(productIds);

export type ProductId = (typeof productIds)[number];

export interface RoutePermissionMeta {
  roles?: readonly string[];
  permission?: string;
}

export interface RouteDefinition {
  id: string;
  label: string;
  product: ProductId;
  path: string;
  href: string;
  visible: boolean;
  permission?: RoutePermissionMeta;
}

export interface ResolvedRouteDefinition extends RouteDefinition {
  href: string;
}

export type ProductBaseUrls = Record<ProductId, string>;

export interface RouteResolutionOptions {
  currentProduct?: ProductId;
  includeHidden?: boolean;
  baseUrls?: Partial<ProductBaseUrls>;
}

export interface RoutePermissionDecision {
  allowed: boolean;
  reason?: string;
}

const defaultProductBaseUrls: ProductBaseUrls = {
  markets: process.env.NEXT_PUBLIC_MARKETS_APP_URL ?? "http://localhost:3000",
  pay: process.env.NEXT_PUBLIC_PAY_APP_URL ?? "http://localhost:3001",
  points: process.env.NEXT_PUBLIC_POINTS_APP_URL ?? "http://localhost:3002",
};

const globalRouteTemplates = [
  {
    id: "pay",
    label: "Pay",
    product: "pay",
    path: "/",
    href: "/",
    visible: true,
    permission: {
      roles: ["member", "admin"],
    },
  },
  {
    id: "markets",
    label: "Markets",
    product: "markets",
    path: "/",
    href: "/",
    visible: true,
    permission: {
      roles: ["member", "admin"],
    },
  },
  {
    id: "points",
    label: "Points",
    product: "points",
    path: "/",
    href: "/",
    visible: true,
    permission: {
      roles: ["member", "admin"],
    },
  },
  {
    id: "tasks",
    label: "Tasks",
    product: "points",
    path: "/tasks",
    href: "/tasks",
    visible: true,
    permission: {
      roles: ["member", "admin"],
      permission: "tasks:read",
    },
  },
] as const satisfies readonly RouteDefinition[];

const productRoutes = {
  pay: [
    {
      id: "pay-dashboard",
      label: "Dashboard",
      product: "pay",
      path: "/",
      href: "/",
      visible: true,
    },
    {
      id: "pay-invoices",
      label: "Invoices",
      product: "pay",
      path: "/invoices",
      href: "/invoices",
      visible: true,
      permission: {
        roles: ["member", "admin"],
      },
    },
    {
      id: "pay-payouts",
      label: "Payouts",
      product: "pay",
      path: "/payouts",
      href: "/payouts",
      visible: true,
      permission: {
        roles: ["member", "admin"],
      },
    },
    {
      id: "pay-reconciliation",
      label: "Reconciliation",
      product: "pay",
      path: "/reconciliation",
      href: "/reconciliation",
      visible: true,
      permission: {
        roles: ["admin"],
      },
    },
  ],
  markets: [
    {
      id: "markets-dashboard",
      label: "Dashboard",
      product: "markets",
      path: "/",
      href: "/",
      visible: true,
    },
    {
      id: "markets-instruments",
      label: "Instruments",
      product: "markets",
      path: "/instruments",
      href: "/instruments",
      visible: true,
    },
    {
      id: "markets-orders",
      label: "Orders",
      product: "markets",
      path: "/orders",
      href: "/orders",
      visible: true,
    },
    {
      id: "markets-positions",
      label: "Positions",
      product: "markets",
      path: "/positions",
      href: "/positions",
      visible: true,
    },
  ],
  points: [
    {
      id: "points-dashboard",
      label: "Dashboard",
      product: "points",
      path: "/",
      href: "/",
      visible: true,
    },
    {
      id: "points-ledger",
      label: "Points",
      product: "points",
      path: "/points",
      href: "/points",
      visible: true,
    },
    {
      id: "points-tasks",
      label: "Tasks",
      product: "points",
      path: "/tasks",
      href: "/tasks",
      visible: true,
      permission: {
        roles: ["member", "admin"],
        permission: "tasks:read",
      },
    },
    {
      id: "points-status",
      label: "Status",
      product: "points",
      path: "/status",
      href: "/status",
      visible: true,
    },
  ],
} as const satisfies Record<ProductId, readonly RouteDefinition[]>;

export const routeRegistry = {
  products: {
    pay: {
      id: "pay",
      label: "Pay",
      defaultPath: "/",
    },
    markets: {
      id: "markets",
      label: "Markets",
      defaultPath: "/",
    },
    points: {
      id: "points",
      label: "Points",
      defaultPath: "/",
    },
  },
  global: globalRouteTemplates,
  local: productRoutes,
} as const;

const deepLinkContractSchema = z
  .object({
    ref: z.string().trim().min(1).max(64).optional(),
    entity: z.string().trim().min(1).max(64).optional(),
    id: z.string().trim().min(1).max(128).optional(),
    ctx: z.string().trim().min(1).max(256).optional(),
  })
  .superRefine((value, refinementContext) => {
    const hasEntity = Boolean(value.entity);
    const hasId = Boolean(value.id);

    if (hasEntity !== hasId) {
      refinementContext.addIssue({
        code: z.ZodIssueCode.custom,
        message: "`entity` and `id` must be provided together",
      });
    }
  });

export type DeepLinkContract = z.infer<typeof deepLinkContractSchema>;

export interface BuildDeepLinkInput extends DeepLinkContract {
  product: ProductId;
  path: string;
  baseUrls?: Partial<ProductBaseUrls>;
}

export interface ParsedDeepLink {
  valid: boolean;
  params: DeepLinkContract;
  errors: string[];
}

type DeepLinkSearchParams =
  | URLSearchParams
  | string
  | Record<string, string | string[] | undefined>
  | undefined;

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function normalizePath(path: string): string {
  if (path === "") {
    return "/";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function resolveBaseUrls(overrides?: Partial<ProductBaseUrls>): ProductBaseUrls {
  return {
    markets: overrides?.markets ?? defaultProductBaseUrls.markets,
    pay: overrides?.pay ?? defaultProductBaseUrls.pay,
    points: overrides?.points ?? defaultProductBaseUrls.points,
  };
}

function resolveHref(product: ProductId, path: string, baseUrls?: Partial<ProductBaseUrls>): string {
  const mergedBaseUrls = resolveBaseUrls(baseUrls);
  return new URL(normalizePath(path), withTrailingSlash(mergedBaseUrls[product])).toString();
}

function resolveRoutes(
  routes: readonly RouteDefinition[],
  { includeHidden = false, baseUrls }: Pick<RouteResolutionOptions, "includeHidden" | "baseUrls">,
): ResolvedRouteDefinition[] {
  return routes
    .filter((route) => includeHidden || route.visible)
    .map((route) => ({
      ...route,
      href: resolveHref(route.product, route.path, baseUrls),
    }));
}

export function getGlobalNavItems(options: RouteResolutionOptions = {}): ResolvedRouteDefinition[] {
  const currentProduct = options.currentProduct ?? "pay";
  const overviewRoute: RouteDefinition = {
    id: "overview",
    label: "Overview",
    product: currentProduct,
    path: "/overview",
    href: "/overview",
    visible: true,
  };

  return resolveRoutes([overviewRoute, ...globalRouteTemplates], options);
}

export function getProductNav(
  productId: ProductId,
  options: Omit<RouteResolutionOptions, "currentProduct"> = {},
): ResolvedRouteDefinition[] {
  return resolveRoutes(productRoutes[productId], options);
}

function normalizeRoleClaims(roleClaims: readonly string[]): string[] {
  return [...new Set(roleClaims.map((claim) => claim.trim().toLowerCase()).filter((claim) => claim.length > 0))];
}

export function evaluateRoutePermission(
  permission: RoutePermissionMeta | undefined,
  roleClaims: readonly string[],
): RoutePermissionDecision {
  if (!permission?.roles || permission.roles.length === 0) {
    return { allowed: true };
  }

  const normalizedClaims = normalizeRoleClaims(roleClaims);
  const normalizedRequiredRoles = permission.roles.map((role) => role.trim().toLowerCase());
  const allowed = normalizedRequiredRoles.some((requiredRole) => normalizedClaims.includes(requiredRole));

  if (allowed) {
    return { allowed: true };
  }

  const requiredRoleLabel = permission.roles.length === 1 ? permission.roles[0] : permission.roles.join(" or ");
  return {
    allowed: false,
    reason: `Requires ${requiredRoleLabel} role.`,
  };
}

export function resolveRoutePermissionMeta(productId: ProductId, path: string): RoutePermissionMeta | undefined {
  const normalizedPath = normalizePath(path);
  const localMatch = productRoutes[productId].find((route) => normalizePath(route.path) === normalizedPath);
  return localMatch && "permission" in localMatch ? localMatch.permission : undefined;
}

function toSearchParams(searchParams: DeepLinkSearchParams): URLSearchParams {
  if (!searchParams) {
    return new URLSearchParams();
  }

  if (typeof searchParams === "string") {
    return new URLSearchParams(searchParams);
  }

  if (searchParams instanceof URLSearchParams) {
    return searchParams;
  }

  const normalized = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      const firstValue = value[0];
      if (firstValue) {
        normalized.set(key, firstValue);
      }
      continue;
    }

    normalized.set(key, value);
  }

  return normalized;
}

export function parseDeepLink(searchParams: DeepLinkSearchParams): ParsedDeepLink {
  const params = toSearchParams(searchParams);
  const candidate = {
    ref: params.get("ref") ?? undefined,
    entity: params.get("entity") ?? undefined,
    id: params.get("id") ?? undefined,
    ctx: params.get("ctx") ?? undefined,
  };

  const parsed = deepLinkContractSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      valid: false,
      params: {},
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return {
    valid: true,
    params: parsed.data,
    errors: [],
  };
}

export function buildDeepLink({ product, path, baseUrls, ref, entity, id, ctx }: BuildDeepLinkInput): string {
  const parsedParams = deepLinkContractSchema.parse({
    ref,
    entity,
    id,
    ctx,
  });
  const parsedProduct = productIdSchema.parse(product);
  const parsedPath = z.string().trim().min(1).parse(path);

  const url = new URL(normalizePath(parsedPath), withTrailingSlash(resolveBaseUrls(baseUrls)[parsedProduct]));

  if (parsedParams.ref) {
    url.searchParams.set("ref", parsedParams.ref);
  }
  if (parsedParams.entity) {
    url.searchParams.set("entity", parsedParams.entity);
  }
  if (parsedParams.id) {
    url.searchParams.set("id", parsedParams.id);
  }
  if (parsedParams.ctx) {
    url.searchParams.set("ctx", parsedParams.ctx);
  }

  return url.toString();
}
