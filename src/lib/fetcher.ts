// lib/fetcher.ts
export async function fetcher<T = any>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
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

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
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

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}

export async function deleteFetcher<T = any>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}