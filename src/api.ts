import { config, state } from "./state.js";
import { refreshJwt } from "./auth.js";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  requireAuth?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const { apiUrl } = config();
  const url = new URL(path.startsWith("/") ? path : `/${path}`, apiUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function doFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}

/**
 * Call an AdsIQ API route. Attaches the stored JWT as a bearer token and
 * retries ONCE on 401 after attempting to refresh the Supabase session.
 */
export async function apiRequest<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", query, body, requireAuth = true } = opts;

  if (requireAuth && !state.jwt) {
    throw new Error(
      "Not signed in. Call the `sign_in` tool with your AdsIQ credentials first.",
    );
  }

  const url = buildUrl(path, query);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (state.jwt) headers.Authorization = `Bearer ${state.jwt}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const init: RequestInit = {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  };

  let res = await doFetch(url, init);

  if (res.status === 401 && requireAuth) {
    const refreshed = await refreshJwt().catch(() => null);
    if (refreshed) {
      headers.Authorization = `Bearer ${refreshed}`;
      res = await doFetch(url, { ...init, headers });
    }
  }

  const text = await res.text();
  let parsed: unknown = text;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      /* leave as text */
    }
  }

  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>))
        ? String((parsed as Record<string, unknown>).error)
        : typeof parsed === "string" && parsed
          ? parsed
          : `HTTP ${res.status}`;
    const err = new Error(`${method} ${path} failed (${res.status}): ${msg}`);
    (err as Error & { status?: number; body?: unknown }).status = res.status;
    (err as Error & { status?: number; body?: unknown }).body = parsed;
    throw err;
  }

  return parsed as T;
}
