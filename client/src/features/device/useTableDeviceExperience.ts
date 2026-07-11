import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type {
  NetworkDiagnosticResponse,
  TableDevicePreferences,
  TableDeviceProfile,
} from '../../../../shared/types/device-experience'
import type { ClientRole } from '../../../../shared/types/realtime'
import {
  applyDeviceProfile,
  loadTableDevicePreferences,
  saveTableDevicePreferences,
} from './table-device'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

type WakeLockSentinelLike = {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>
  }
}

export function useTableDeviceExperience(
  role: ClientRole,
  accessToken: string,
  connected: boolean,
) {
  const [preferences, setPreferences] = useState(() =>
    loadTableDevicePreferences(role),
  )
  const [isFullscreen, setIsFullscreen] = useState(
    () => Boolean(document.fullscreenElement),
  )
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const [wakeLockSupported] = useState(
    () => Boolean((navigator as WakeLockNavigator).wakeLock),
  )
  const [httpLatencyMs, setHttpLatencyMs] = useState<number | null>(null)
  const [serverDiagnostics, setServerDiagnostics] =
    useState<NetworkDiagnosticResponse | null>(null)
  const [fps, setFps] = useState(0)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
  }))
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    saveTableDevicePreferences(role, preferences)
  }, [preferences, role])

  useEffect(() => {
    function updateFullscreen() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function releaseWakeLock() {
      const sentinel = wakeLockRef.current
      wakeLockRef.current = null
      if (sentinel && !sentinel.released) await sentinel.release().catch(() => undefined)
      if (!cancelled) setWakeLockActive(false)
    }

    async function acquireWakeLock() {
      if (
        !preferences.wakeLockEnabled ||
        !connected ||
        document.visibilityState !== 'visible' ||
        wakeLockRef.current
      ) {
        return
      }

      try {
        const wakeLock = (navigator as WakeLockNavigator).wakeLock
        if (!wakeLock) return
        const sentinel = await wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release().catch(() => undefined)
          return
        }
        wakeLockRef.current = sentinel
        setWakeLockActive(true)
        sentinel.addEventListener('release', () => {
          if (wakeLockRef.current === sentinel) wakeLockRef.current = null
          if (!cancelled) setWakeLockActive(false)
        })
      } catch {
        if (!cancelled) setWakeLockActive(false)
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') void acquireWakeLock()
    }

    if (preferences.wakeLockEnabled && connected) {
      void acquireWakeLock()
      document.addEventListener('visibilitychange', handleVisibility)
    } else {
      void releaseWakeLock()
    }

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      void releaseWakeLock()
    }
  }, [connected, preferences.wakeLockEnabled])

  const measureHttpLatency = useCallback(async () => {
    const startedAt = performance.now()
    try {
      const response = await fetch(`${API_URL}/network/diagnostics`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!response.ok) throw new Error('Network diagnostics failed')
      const payload = (await response.json()) as NetworkDiagnosticResponse
      setHttpLatencyMs(Math.max(0, Math.round(performance.now() - startedAt)))
      setServerDiagnostics(payload)
    } catch {
      setHttpLatencyMs(null)
    }
  }, [accessToken])

  useEffect(() => {
    const initialTimer = window.setTimeout(
      () => void measureHttpLatency(),
      0,
    )
    const timer = window.setInterval(() => void measureHttpLatency(), 15_000)
    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(timer)
    }
  }, [measureHttpLatency])

  useEffect(() => {
    let animationFrame = 0
    let frameCount = 0
    let measuredAt = performance.now()

    function measureFrame(now: number) {
      frameCount += 1
      const elapsed = now - measuredAt
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed))
        measuredAt = now
        frameCount = 0
      }
      animationFrame = window.requestAnimationFrame(measureFrame)
    }

    animationFrame = window.requestAnimationFrame(measureFrame)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  useEffect(() => {
    function updateViewport() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio,
      })
    }
    function markOnline() {
      setOnline(true)
      void measureHttpLatency()
    }
    function markOffline() {
      setOnline(false)
      setHttpLatencyMs(null)
    }

    window.addEventListener('resize', updateViewport)
    window.addEventListener('online', markOnline)
    window.addEventListener('offline', markOffline)
    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('online', markOnline)
      window.removeEventListener('offline', markOffline)
    }
  }, [measureHttpLatency])

  const updatePreferences = useCallback(
    (patch: Partial<TableDevicePreferences>) => {
      setPreferences((current) => ({ ...current, ...patch }))
    },
    [],
  )

  const setProfile = useCallback((profile: TableDeviceProfile) => {
    setPreferences((current) => applyDeviceProfile(current, profile))
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await document.documentElement.requestFullscreen()
    }
  }, [])

  const kioskActive =
    role === 'display' && preferences.kioskEnabled && isFullscreen
  const shellStyle = useMemo(
    () =>
      ({
        '--device-safe-area': `${preferences.safeAreaPx}px`,
      }) as CSSProperties,
    [preferences.safeAreaPx],
  )

  return {
    preferences,
    updatePreferences,
    setProfile,
    isFullscreen,
    toggleFullscreen,
    kioskActive,
    wakeLockActive,
    wakeLockSupported,
    httpLatencyMs,
    serverDiagnostics,
    measureHttpLatency,
    fps,
    online,
    viewport,
    shellStyle,
  }
}

export type TableDeviceExperience = ReturnType<
  typeof useTableDeviceExperience
>
