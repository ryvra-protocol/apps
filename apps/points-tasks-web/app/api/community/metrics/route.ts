import { NextResponse, type NextRequest } from "next/server";
import { createClientGeneratedId } from "../../../lib/claim-execution";
import { getCommunityTopMetrics } from "../../../lib/fingerprint-claim";
import { createPointsTasksRuntimeContext } from "../../../lib/runtime";

function toOptionalString(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: NextRequest) {
  const runtime = createPointsTasksRuntimeContext("points-tasks-web:community-metrics-api");
  const requestId = request.headers.get("x-request-id")?.trim() || createClientGeneratedId("req");
  const correlationId = request.headers.get("x-correlation-id")?.trim() || requestId;

  if (!runtime.authDecision.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "unauthorized",
          message: "You do not have permission to read community metrics.",
          retryable: false,
          source: "runtime",
          requestId,
          correlationId,
        },
      },
      { status: 403 },
    );
  }

  const accountId = toOptionalString(request.nextUrl.searchParams.get("accountId"));
  const userId = toOptionalString(request.nextUrl.searchParams.get("userId"));
  const workspaceId = toOptionalString(request.nextUrl.searchParams.get("workspaceId"));
  if (!accountId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "invalid_request",
          message: "Community metrics require accountId.",
          retryable: false,
          source: "runtime",
          requestId,
          correlationId,
        },
      },
      { status: 400 },
    );
  }

  const metrics = getCommunityTopMetrics({
    accountId,
    ...(userId ? { userId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
  });

  return NextResponse.json({
    ok: true,
    data: metrics,
  });
}
