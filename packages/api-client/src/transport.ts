import { normalizeApiError } from "./errors";
import type { ApiRequest, ApiResult, Transport } from "./types";

export interface FetchTransportOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

function tryParseJson(payload: string): unknown {
  if (payload.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return payload;
  }
}

function extractHttpErrorMessage(statusText: string, payload: unknown): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (typeof payload === "object" && payload !== null) {
    const objectPayload = payload as Record<string, unknown>;
    if (typeof objectPayload.message === "string" && objectPayload.message.trim().length > 0) {
      return objectPayload.message;
    }

    if (
      typeof objectPayload.error === "object" &&
      objectPayload.error !== null &&
      typeof (objectPayload.error as Record<string, unknown>).message === "string"
    ) {
      const nestedMessage = (objectPayload.error as Record<string, unknown>).message as string;
      if (nestedMessage.trim().length > 0) {
        return nestedMessage;
      }
    }
  }

  return statusText || "Request failed";
}

export function createFetchTransport(options: FetchTransportOptions): Transport {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async request<T>(request: ApiRequest): Promise<ApiResult<T>> {
      try {
        const init: RequestInit = {
          method: request.method,
          headers: {
            "content-type": "application/json",
            ...options.defaultHeaders,
            ...request.headers,
          },
        };

        if (request.body !== undefined) {
          init.body = JSON.stringify(request.body);
        }

        const response = await fetchImpl(`${options.baseUrl}${request.path}`, init);
        const text = await response.text();
        const payload = tryParseJson(text);

        if (!response.ok) {
          return {
            ok: false,
            error: normalizeApiError(
              {
                status: response.status,
                code: "http_request_failed",
                message: extractHttpErrorMessage(response.statusText, payload),
                details: payload,
              },
              { fallbackStatus: response.status, source: "http" },
            ),
          };
        }

        return {
          ok: true,
          data: payload as T,
        };
      } catch (error) {
        return {
          ok: false,
          error: normalizeApiError(error, { source: "http" }),
        };
      }
    },
  };
}
