import { normalizeApiError } from "./errors";
import type { ApiRequest, ApiResult, Transport } from "./types";

export interface FetchTransportOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
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
        const payload = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;

        if (!response.ok) {
          return {
            ok: false,
            error: normalizeApiError(
              {
                status: response.status,
                message: response.statusText || "Request failed",
                details: payload,
              },
              response.status,
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
          error: normalizeApiError(error),
        };
      }
    },
  };
}
