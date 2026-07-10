import type { AuthSessionResponse } from '../../../../shared/types/auth'
import type { ClientRole } from '../../../../shared/types/realtime'

const activeSessionKey = 'dit:active-session'

export function loadSession(role: ClientRole): AuthSessionResponse | null {
  try {
    const raw = sessionStorage.getItem(sessionKey(role))
    return raw ? (JSON.parse(raw) as AuthSessionResponse) : null
  } catch {
    return null
  }
}

export function saveSession(
  role: ClientRole,
  session: AuthSessionResponse,
) {
  sessionStorage.setItem(sessionKey(role), JSON.stringify(session))
  sessionStorage.setItem(activeSessionKey, session.socketToken)
}

export function activateSession(session: AuthSessionResponse) {
  sessionStorage.setItem(activeSessionKey, session.socketToken)
}

export function clearSession(role: ClientRole) {
  const current = loadSession(role)
  sessionStorage.removeItem(sessionKey(role))

  if (
    current &&
    sessionStorage.getItem(activeSessionKey) === current.socketToken
  ) {
    sessionStorage.removeItem(activeSessionKey)
  }
}

export function getActiveAccessToken() {
  return sessionStorage.getItem(activeSessionKey) ?? ''
}

export function authHeaders(): HeadersInit {
  const token = getActiveAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function sessionKey(role: ClientRole) {
  return `dit:session:${role}`
}
