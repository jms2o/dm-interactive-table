import { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  Monitor,
  RefreshCw,
  Smartphone,
  Unplug,
  Users,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type {
  NetworkInfoResponse,
  NetworkOrigin,
  TableAccessGrant,
  TableAccessStatus,
} from '../../../../shared/types/auth'
import { authHeaders } from './session-storage'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export function TableAccessControl({
  campaignId,
  sessionId,
}: {
  campaignId: string
  sessionId?: string
}) {
  const [open, setOpen] = useState(false)
  const [grant, setGrant] = useState<TableAccessGrant | null>(null)
  const [status, setStatus] = useState<TableAccessStatus | null>(null)
  const [shareRole, setShareRole] = useState<'player' | 'display'>('player')
  const [shareOrigin, setShareOrigin] = useState(window.location.origin)
  const [networkOrigins, setNetworkOrigins] = useState<NetworkOrigin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    let active = true

    async function loadAccessContext() {
      try {
        const options = {
          headers: authHeaders(),
          credentials: 'include' as const,
        }
        const [statusResponse, networkResponse] = await Promise.all([
          fetch(
            `${API_URL}/table-access?campaignId=${encodeURIComponent(campaignId)}`,
            options,
          ),
          fetch(`${API_URL}/network`, options),
        ])

        if (!active) return

        if (statusResponse.ok) {
          setStatus((await statusResponse.json()) as TableAccessStatus)
        }

        if (networkResponse.ok) {
          const network = (await networkResponse.json()) as NetworkInfoResponse
          setNetworkOrigins(network.origins)
          setShareOrigin(selectPreferredOrigin(network.origins))
        }
      } catch {
        if (active) setStatus(null)
      }
    }

    void loadAccessContext()
    return () => {
      active = false
    }
  }, [open, campaignId])

  const joinUrl = useMemo(() => {
    if (!grant) return ''

    try {
      const origin = normalizeOrigin(shareOrigin)
      const url = new URL(`/${shareRole}`, origin)
      url.searchParams.set('code', grant.code)
      return url.toString()
    } catch {
      return ''
    }
  }, [grant, shareOrigin, shareRole])

  async function generateCode() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/table-access`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          sessionId,
          playerEnabled: true,
          displayEnabled: true,
        }),
      })
      const payload = (await response.json()) as
        | TableAccessGrant
        | { error?: { message?: string } }

      if (!response.ok || !('code' in payload)) {
        throw new Error(
          'error' in payload
            ? payload.error?.message
            : 'No se pudo generar el código',
        )
      }

      setGrant(payload)
      setStatus({ ...payload, active: true })
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : 'No se pudo generar el código',
      )
    } finally {
      setLoading(false)
    }
  }

  async function revokeCode() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/table-access?campaignId=${encodeURIComponent(campaignId)}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: authHeaders(),
        },
      )

      if (!response.ok) throw new Error('No se pudo cerrar el acceso')
      setGrant(null)
      setStatus({ active: false, campaignId })
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : 'No se pudo cerrar el acceso',
      )
    } finally {
      setLoading(false)
    }
  }

  async function copyJoinUrl() {
    if (joinUrl) await navigator.clipboard.writeText(joinUrl)
  }

  return (
    <>
      <button
        type="button"
        className="topbar-command"
        onClick={() => setOpen(true)}
      >
        <Users size={17} aria-hidden="true" />
        Mesa
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="table-access-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-access-title"
          >
            <header>
              <div>
                <span className="eyebrow">Sesión activa</span>
                <h2 id="table-access-title">Acceso de mesa</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                title="Cerrar"
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
              >
                <X size={19} />
              </button>
            </header>

            {grant ? (
              <div className="table-access-content">
                <div className="table-code" aria-label={`Código ${grant.code}`}>
                  {grant.code}
                </div>

                <label className="network-origin-field">
                  Dirección para compartir
                  <input
                    list="network-origin-options"
                    value={shareOrigin}
                    onChange={(event) => setShareOrigin(event.target.value)}
                    spellCheck={false}
                  />
                  <datalist id="network-origin-options">
                    {networkOrigins.map((origin) => (
                      <option key={origin.url} value={origin.url}>
                        {origin.label}
                      </option>
                    ))}
                  </datalist>
                </label>

                <div className="role-segment" aria-label="Enlace para compartir">
                  <button
                    type="button"
                    className={shareRole === 'player' ? 'is-active' : ''}
                    onClick={() => setShareRole('player')}
                  >
                    <Smartphone size={16} /> Jugador
                  </button>
                  <button
                    type="button"
                    className={shareRole === 'display' ? 'is-active' : ''}
                    onClick={() => setShareRole('display')}
                  >
                    <Monitor size={16} /> Display
                  </button>
                </div>

                {joinUrl ? (
                  <div className="qr-surface">
                    <QRCodeSVG
                      value={joinUrl}
                      size={184}
                      bgColor="#ffffff"
                      fgColor="#101827"
                      level="M"
                    />
                  </div>
                ) : (
                  <p className="auth-error">Dirección de red no válida</p>
                )}

                <div className="share-link-row">
                  <input value={joinUrl} readOnly aria-label="Enlace de acceso" />
                  <button
                    type="button"
                    className="icon-button"
                    title="Copiar enlace"
                    aria-label="Copiar enlace"
                    onClick={() => void copyJoinUrl()}
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <p className="access-expiry">
                  Vence {new Date(grant.expiresAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="table-access-empty">
                <span className={`access-state ${status?.active ? 'is-active' : ''}`}>
                  {status?.active ? 'Código activo' : 'Acceso cerrado'}
                </span>
              </div>
            )}

            {error ? <p className="auth-error">{error}</p> : null}

            <footer>
              {(grant || status?.active) && (
                <button
                  type="button"
                  className="danger-command"
                  disabled={loading}
                  onClick={() => void revokeCode()}
                >
                  <Unplug size={17} /> Cerrar acceso
                </button>
              )}
              <button
                type="button"
                className="primary-command"
                disabled={loading}
                onClick={() => void generateCode()}
              >
                <RefreshCw size={17} />
                {grant || status?.active ? 'Renovar código' : 'Generar código'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  )
}

function selectPreferredOrigin(origins: NetworkOrigin[]) {
  const configured = origins.find((origin) => origin.source === 'configured')
  if (configured) return configured.url

  const current = origins.find((origin) => origin.source === 'current')
  const currentHost = current ? new URL(current.url).hostname : ''

  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    const lan = origins.find((origin) => {
      if (origin.source !== 'network') return false
      const host = new URL(origin.url).hostname
      return host.startsWith('192.168.') || host.startsWith('10.')
    })
    if (lan) return lan.url
  }

  return current?.url ?? window.location.origin
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/$/, '')
  return /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${window.location.protocol}//${trimmed}`
}
