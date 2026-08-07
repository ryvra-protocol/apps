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
                message: response.statusText || "Request failed",
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
