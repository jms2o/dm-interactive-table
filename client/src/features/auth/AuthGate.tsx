import { useEffect, useState, type FormEvent } from 'react'
import { Monitor, ShieldCheck, Swords, UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type {
  AuthSessionResponse,
  AuthStatusResponse,
} from '../../../../shared/types/auth'
import type { ClientRole } from '../../../../shared/types/realtime'
import { GameWorkspace } from '../game/GameWorkspace'
import { SessionBoundary } from '../session/SessionBoundary'
import { SessionLobby } from '../session/SessionLobby'
import {
  activateSession,
  clearSession,
  loadSession,
  saveSession,
} from './session-storage'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

type AuthGateProps = {
  role: ClientRole
}

export function AuthGate({ role }: AuthGateProps) {
  const [session, setSession] = useState<AuthSessionResponse | null>(() =>
    loadSession(role),
  )
  const [setupRequired, setSetupRequired] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showDmLobby, setShowDmLobby] = useState(role === 'dm')

  useEffect(() => {
    let active = true
    const cached = loadSession(role)

    async function restoreSession() {
      try {
        const response = await fetch(
          `${API_URL}/auth/me?scope=${role === 'dm' ? 'dm' : 'table'}`,
          {
            credentials: 'include',
            headers: cached
              ? { Authorization: `Bearer ${cached.socketToken}` }
              : undefined,
          },
        )

        if (response.ok) {
          const restored = (await response.json()) as AuthSessionResponse

          if (restored.principal.role !== role) {
            throw new Error('La sesión pertenece a otra vista')
          }

          if (active) {
            saveSession(role, restored)
            setSession(restored)
          }
        } else if (active) {
          clearSession(role)
          setSession(null)
        }

        if (role === 'dm') {
          const statusResponse = await fetch(`${API_URL}/auth/status`)

          if (statusResponse.ok && active) {
            const status = (await statusResponse.json()) as AuthStatusResponse
            setSetupRequired(status.setupRequired)
          }
        }
      } catch {
        if (
          cached &&
          cached.principal.role === role &&
          new Date(cached.principal.expiresAt).getTime() > Date.now()
        ) {
          activateSession(cached)
          setSession(cached)
        }
      } finally {
        if (active) {
          setChecking(false)
        }
      }
    }

    void restoreSession()
    return () => {
      active = false
    }
  }, [role])

  useEffect(() => {
    if (session) activateSession(session)
  }, [session])

  async function handleLogout() {
    try {
      await fetch(
        `${API_URL}/auth/logout?scope=${role === 'dm' ? 'dm' : 'table'}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${session?.socketToken ?? ''}` },
        },
      )
    } finally {
      clearSession(role)
      setSession(null)
    }
  }

  if (checking) {
    return (
      <main className="auth-shell auth-shell--loading">
        <span className="auth-loader" aria-label="Comprobando sesión" />
      </main>
    )
  }

  if (!session) {
    return (
      <AuthScreen
        role={role}
        setupRequired={setupRequired}
        onAuthenticated={(nextSession) => {
          saveSession(role, nextSession)
          setSession(nextSession)
          setSetupRequired(false)
          setShowDmLobby(role === 'dm')
        }}
      />
    )
  }

  if (role === 'dm' && showDmLobby) {
    return (
      <SessionLobby
        session={session}
        onLogout={handleLogout}
        onSelect={(nextSession) => {
          saveSession(role, nextSession)
          activateSession(nextSession)
          setSession(nextSession)
          setShowDmLobby(false)
        }}
      />
    )
  }

  const workspace = (
    <GameWorkspace
      role={role}
      accessToken={session.socketToken}
      principal={session.principal}
      onLogout={handleLogout}
      onReturnToLobby={role === 'dm' ? () => setShowDmLobby(true) : undefined}
    />
  )

  if (role === 'dm') return workspace

  return (
    <SessionBoundary
      role={role}
      principal={session.principal}
      onLogout={handleLogout}
    >
      {workspace}
    </SessionBoundary>
  )
}

function AuthScreen({
  role,
  setupRequired,
  onAuthenticated,
}: {
  role: ClientRole
  setupRequired: boolean
  onAuthenticated: (session: AuthSessionResponse) => void
}) {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState(
    () => new URLSearchParams(location.search).get('code') ?? '',
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isDm = role === 'dm'
  const title = isDm
    ? setupRequired
      ? 'Crear cuenta del DM'
      : 'Acceso del DM'
    : role === 'player'
      ? 'Unirse a la partida'
      : 'Conectar display'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const endpoint = isDm
        ? setupRequired
          ? '/auth/register'
          : '/auth/login'
        : '/table-access/join'
      const body = isDm
        ? {
            email,
            password,
            ...(setupRequired ? { displayName } : {}),
          }
        : {
            code,
            role,
            displayName:
              role === 'player' ? displayName : 'Pantalla pública',
          }
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as
        | AuthSessionResponse
        | { error?: { message?: string } }

      if (!response.ok || !('principal' in payload)) {
        throw new Error(
          'error' in payload
            ? payload.error?.message
            : 'No se pudo iniciar la sesión',
        )
      }

      onAuthenticated(payload)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'No se pudo iniciar la sesión',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const RoleIcon = isDm
    ? ShieldCheck
    : role === 'player'
      ? UserRound
      : Monitor

  return (
    <main className={`auth-shell auth-shell--${role}`}>
      <section className="auth-panel" aria-labelledby="auth-title">
        <header className="auth-panel__header">
          <span className="auth-mark" aria-hidden="true">
            <Swords size={24} />
          </span>
          <div>
            <span className="eyebrow">DM Interactive Table</span>
            <h1 id="auth-title">{title}</h1>
          </div>
          <RoleIcon className="auth-role-icon" size={22} aria-hidden="true" />
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {(setupRequired || role === 'player') && (
            <label>
              Nombre
              <input
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          )}

          {isDm ? (
            <>
              <label>
                Correo
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  autoComplete={
                    setupRequired ? 'new-password' : 'current-password'
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={setupRequired ? 10 : 1}
                  maxLength={128}
                  required
                />
              </label>
            </>
          ) : (
            <label>
              Código de mesa
              <input
                className="table-code-input"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase().slice(0, 8))
                }
                minLength={6}
                maxLength={8}
                required
              />
            </label>
          )}

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Conectando…' : isDm ? 'Entrar' : 'Unirse'}
          </button>
        </form>
      </section>
    </main>
  )
}
