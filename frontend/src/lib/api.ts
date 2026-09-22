import type { ApiErrorBody } from "./types";

// Relative: requests go to the frontend's own origin and are proxied to the
// backend by the rewrites in next.config.ts, keeping the auth cookie
// first-party. See next.config.ts for why.
const API_BASE_URL = "";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Thin fetch wrapper: always sends the httpOnly auth cookie
// (credentials: "include"), always JSON, and turns non-2xx responses into a
// typed ApiError so callers can branch on `.status`/`.code` instead of
// re-parsing the error body everywhere.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const errorBody = body as ApiErrorBody | null;
    throw new ApiError(
      errorBody?.error?.message ?? `Request failed with status ${res.status}`,
      errorBody?.error?.code ?? "UNKNOWN_ERROR",
      res.status,
      errorBody?.error?.details
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
};
