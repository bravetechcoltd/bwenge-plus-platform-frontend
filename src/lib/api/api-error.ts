/**
 * The API error contract (AXM-CONS-001 §6.3, findings C-04, C-05, E-08, E-11).
 *
 * `fetcher.ts` used to throw `new Error(message)` and drop the status on the
 * floor, so 401, 403, 404, 408, 429, 500, 502, 503, a DNS failure and a
 * timeout all reached the caller as the same shape. Since no consumer could
 * tell them apart, every consumer treated them alike — and on a course detail
 * page that single treatment was the sentence "Course not found".
 *
 * `ApiError extends Error`, so every existing `catch (e) { toast.error(e.message) }`
 * keeps working untouched. This is strictly additive.
 */

export type ErrorKind =
  | "bad-request"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "timeout"
  | "conflict"
  | "gone"
  | "rate-limited"
  | "server-error"
  | "bad-gateway"
  | "service-unavailable"
  | "network"
  | "unknown";

/** Kinds worth offering a Retry for: the request may succeed unchanged. */
const RETRYABLE: ReadonlySet<ErrorKind> = new Set<ErrorKind>([
  "network",
  "timeout",
  "rate-limited",
  "server-error",
  "bad-gateway",
  "service-unavailable",
]);

export function kindForStatus(status: number): ErrorKind {
  switch (status) {
    case 400:
    case 422:
      return "bad-request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not-found";
    case 408:
      return "timeout";
    case 409:
      return "conflict";
    case 410:
      return "gone";
    case 429:
      return "rate-limited";
    case 502:
      return "bad-gateway";
    case 503:
    case 504:
      return "service-unavailable";
    default:
      if (status >= 500) return "server-error";
      if (status >= 400) return "bad-request";
      return "unknown";
  }
}

export interface ApiErrorInit {
  message: string;
  status?: number | null;
  code?: string | null;
  kind?: ErrorKind;
  requestUrl?: string | null;
  /** The parsed response body, when there was one worth keeping. */
  body?: unknown;
}

export class ApiError extends Error {
  /** `null` for transport failures, which never reached a server. */
  readonly status: number | null;
  /** The backend's machine-readable code, where it sent one. */
  readonly code: string | null;
  readonly kind: ErrorKind;
  readonly retryable: boolean;
  readonly requestUrl: string | null;
  readonly body: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status ?? null;
    this.code = init.code ?? null;
    this.kind =
      init.kind ?? (init.status ? kindForStatus(init.status) : "unknown");
    this.retryable = RETRYABLE.has(this.kind);
    this.requestUrl = init.requestUrl ?? null;
    this.body = init.body;

    // Keeps `instanceof ApiError` working when the class is down-compiled.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** Build from a failed `fetch` Response, using the body's message if any. */
  static async fromResponse(
    response: Response,
    requestUrl?: string
  ): Promise<ApiError> {
    let body: any = null;
    let message = "";

    // The backend answers JSON everywhere, including its 404 catch-all — but a
    // proxy, a gateway timeout page or an HTML error page will not, and that
    // must not become a parse exception that hides the real status.
    try {
      const text = await response.text();
      if (text) {
        try {
          body = JSON.parse(text);
          message = body?.message || "";
        } catch {
          message = "";
        }
      }
    } catch {
      /* body unreadable; the status still carries the meaning */
    }

    const kind = kindForStatus(response.status);

    return new ApiError({
      message: message || defaultMessageFor(kind, response.status),
      status: response.status,
      code: body?.code ?? null,
      kind,
      requestUrl: requestUrl ?? response.url ?? null,
      body,
    });
  }

  /** Build from a thrown transport error: offline, DNS, CORS, abort. */
  static fromThrown(error: unknown, requestUrl?: string): ApiError {
    if (error instanceof ApiError) return error;

    const name = (error as any)?.name;
    const raw = (error as any)?.message;

    // `AbortController.abort()` and `AbortSignal.timeout()` both surface as
    // AbortError; only the timeout path reaches here, because a deliberate
    // cancel is discarded by the caller before it becomes an error.
    if (name === "AbortError" || name === "TimeoutError") {
      return new ApiError({
        message: defaultMessageFor("timeout"),
        kind: "timeout",
        requestUrl: requestUrl ?? null,
      });
    }

    return new ApiError({
      message: defaultMessageFor("network"),
      kind: "network",
      requestUrl: requestUrl ?? null,
      body: typeof raw === "string" ? raw : undefined,
    });
  }
}

export function defaultMessageFor(kind: ErrorKind, status?: number): string {
  switch (kind) {
    case "bad-request":
      return "That request could not be processed.";
    case "unauthorized":
      return "Your session has ended. Please sign in again.";
    case "forbidden":
      return "You do not have permission to view this.";
    case "not-found":
      return "We could not find what you were looking for.";
    case "timeout":
      return "The request took too long to complete.";
    case "conflict":
      return "That conflicts with something that already exists.";
    case "gone":
      return "This is no longer available.";
    case "rate-limited":
      return "Too many requests. Please wait a moment and try again.";
    case "server-error":
      return "Something went wrong on our end.";
    case "bad-gateway":
      return "We could not reach the service.";
    case "service-unavailable":
      return "The service is temporarily unavailable.";
    case "network":
      return "We could not reach the server. Check your connection.";
    default:
      return status ? `Request failed (${status}).` : "Something went wrong.";
  }
}

/**
 * Read the kind out of anything a `catch` block might hold.
 *
 * SWR hands back whatever was thrown; a page that has not been migrated yet
 * may still be throwing a plain `Error`. Both are handled, so a partially
 * migrated call site behaves sensibly rather than crashing.
 */
export function toErrorKind(error: unknown): ErrorKind | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.kind;

  const status = (error as any)?.status ?? (error as any)?.response?.status;
  if (typeof status === "number") return kindForStatus(status);

  const message = String((error as any)?.message ?? error).toLowerCase();
  if (message.includes("failed to fetch") || message.includes("networkerror")) {
    return "network";
  }
  if (message.includes("abort") || message.includes("timeout")) return "timeout";

  return "unknown";
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) return error.retryable;
  const kind = toErrorKind(error);
  return kind ? RETRYABLE.has(kind) : false;
}

/** True when the failure means "sign in again", not "you may not". */
export function isAuthError(error: unknown): boolean {
  return toErrorKind(error) === "unauthorized";
}

/** The default request deadline. A hung backend must not hang a page. */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * A timeout signal that works on every browser this app supports.
 * `AbortSignal.timeout` is not available in all of them.
 */
export function timeoutSignal(ms: number = REQUEST_TIMEOUT_MS): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}
