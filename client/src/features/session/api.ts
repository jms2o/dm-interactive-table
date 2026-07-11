import { authHeaders } from '../auth/session-storage'

export const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: authHeaders(),
  })
  return readResponse<T>(response)
}

export async function sendJson<T>(
  path: string,
  method: 'POST' | 'PATCH',
  body: unknown,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return readResponse<T>(response)
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string | { message?: string } }
    | null

  if (!response.ok) {
    const error =
      payload && typeof payload === 'object' && 'error' in payload
        ? payload.error
        : undefined
    throw new Error(
      typeof error === 'string'
        ? error
        : error?.message ?? `HTTP ${response.status}`,
    )
  }

  return payload as T
}
