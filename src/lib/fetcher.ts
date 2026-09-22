// lib/fetcher.ts
//
// AXM-CONS-001 §7.2 — findings C-04, C-05.
//
// These four functions kept their names, their parameter order and their
// return types. Two things changed inside them:
//
//   1. A failure now throws `ApiError`, which carries the HTTP status, the
//      backend's `code`, and a `kind` the caller can branch on. Before this,
//      every failure was `new Error(someString)` and the status was discarded,
//      which is why a 403 and a 500 and an offline browser all reached a course
//      page as an indistinguishable absence — and were printed as "Course not
//      found".
//
//   2. Every request carries a deadline. There was none, so a hung backend
//      left a page in `isLoading` forever with no way out.
//
// `ApiError extends Error`, so any existing `catch (e) { toast.error(e.message) }`
// behaves exactly as before.

import { ApiError, REQUEST_TIMEOUT_MS, timeoutSignal } from "./api/api-error"

export type { ErrorKind } from "./api/api-error"
export { ApiError } from "./api/api-error"

async function request<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<T> {
  const { signal, clear } = timeoutSignal(timeoutMs)

  let response: Response
  try {
    response = await fetch(url, { ...init, signal, credentials: 'include' })
  } catch (error) {
    throw ApiError.fromThrown(error, url)
  } finally {
    clear()
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response, url)
  }

  // A 204 has no body; `json()` on it throws.
  if (response.status === 204) return undefined as T

  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError({
      message: "The server sent a response we could not read.",
      status: response.status,
      kind: "server-error",
      requestUrl: url,
    })
  }
}

export async function fetcher<T = any>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return request<T>(url, { headers })
}

export async function postFetcher<T = any>(
  url: string,
  data: any,
  token?: string,
  isJson: boolean = true
): Promise<T> {
  const headers: HeadersInit = {}

  if (isJson) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const body = isJson ? JSON.stringify(data) : data

  return request<T>(url, { method: 'POST', headers, body })
}

export async function putFetcher<T = any>(
  url: string,
  data: any,
  token?: string,
  isJson: boolean = true
): Promise<T> {
  const headers: HeadersInit = {}

  if (isJson) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const body = isJson ? JSON.stringify(data) : data

  return request<T>(url, { method: 'PUT', headers, body })
}

export async function deleteFetcher<T = any>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return request<T>(url, { method: 'DELETE', headers })
}
