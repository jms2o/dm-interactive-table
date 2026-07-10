import { useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  DiceRollAck,
  DiceRollResult,
  RollDiceRequest,
} from '../../../../shared/types/dice'
import type {
  AdvanceTurnRequest,
  CreateEncounterRequest,
  EncounterAck,
  EncounterState,
} from '../../../../shared/types/combat'
import type {
  AssetCueAck,
  AssetCueCommand,
  AssetCuedEvent,
  AudioMixerAck,
  AudioMixerCommand,
  AudioMixerUpdatedEvent,
  AudioPresetAck,
  AudioPresetAppliedEvent,
  AudioPresetApplyCommand,
  AudioPresetManagedEvent,
  AudioPresetManageCommand,
  AudioPresetSavedEvent,
  AudioPresetSaveCommand,
  FogUpdateAck,
  FogUpdateCommand,
  FogUpdatedEvent,
  LightUpdateAck,
  LightUpdateCommand,
  LightUpdatedEvent,
  VisionUpdateAck,
  VisionUpdateCommand,
  VisionUpdatedEvent,
  VisionHistoryState,
} from '../../../../shared/types/table-experience'
import type {
  ClientRole,
  GameStatePayload,
  NarrativeUpdateAck,
  NarrativeUpdateCommand,
  NarrativeUpdatedEvent,
  TokenMoveAck,
  TokenMoveCommand,
  TokenMovedEvent,
} from '../../../../shared/types/realtime'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? window.location.origin

type RealtimeState = {
  connected: boolean
  connectionLabel: string
  lastError: string
  lastEvent: string
  activeEncounter: EncounterState | null
  lastRoll: DiceRollResult | null
  state: GameStatePayload | null
  advanceTurn: (command: AdvanceTurnRequest) => void
  rollDice: (command: RollDiceRequest) => void
  moveToken: (command: TokenMoveCommand) => void
  cueAsset: (command: AssetCueCommand) => void
  applyAudioPreset: (command: AudioPresetApplyCommand) => void
  manageAudioPreset: (command: AudioPresetManageCommand) => void
  saveAudioPreset: (command: AudioPresetSaveCommand) => void
  updateAudioMixer: (command: AudioMixerCommand) => void
  requestGameState: () => void
  sendNarrative: (command: NarrativeUpdateCommand) => void
  startEncounter: (command: CreateEncounterRequest) => void
  updateFog: (command: FogUpdateCommand) => void
  updateLighting: (command: LightUpdateCommand) => void
  updateVision: (command: VisionUpdateCommand) => void
  visionHistory: VisionHistoryState
}

export function useRealtimeGame(
  role: ClientRole,
  accessToken: string,
  campaignId: string,
  sessionId = 'demo-session',
  onSessionRevoked?: () => void | Promise<void>,
): RealtimeState {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [state, setState] = useState<GameStatePayload | null>(() =>
    readCachedState(role, campaignId),
  )
  const [activeEncounter, setActiveEncounter] =
    useState<EncounterState | null>(null)
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null)
  const [lastError, setLastError] = useState('')
  const [visionHistory, setVisionHistory] = useState<VisionHistoryState>({
    canUndo: false,
    canRedo: false,
  })
  const [lastEvent, setLastEvent] = useState('')
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
        campaignId,
        sessionId,
        sceneId: 'demo-scene',
      },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.35,
      timeout: 10000,
      retries: 5,
      ackTimeout: 8000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setReconnectAttempt(0)
      setLastError('')
      setLastEvent(`Conectado como ${role}`)
      socket.emit('game:state:request', {})
    })

    socket.on('disconnect', () => {
      setConnected(false)
      setLastEvent('Conexión cerrada')
    })

    socket.on('connect_error', (error) => {
      setConnected(false)
      setLastError(error.message)

      if (
        (error as Error & { data?: { code?: string } }).data?.code ===
        'SESSION_REVOKED'
      ) {
        void onSessionRevoked?.()
      }
    })

    socket.io.on('reconnect_attempt', (attempt) => {
      setReconnectAttempt(attempt)
      setLastEvent(`Reconectando · intento ${attempt}`)
    })

    socket.on('game:state', (payload: GameStatePayload) => {
      setState(payload)
      cacheState(role, campaignId, payload)
      if (payload.visionHistory) setVisionHistory(payload.visionHistory)
      setLastEvent('game:state')
    })

    socket.on(
      'security:error',
      (payload: { code?: string; message?: string }) => {
      setLastError(payload.message ?? 'Acceso no autorizado')

        if (payload.code === 'SESSION_REVOKED') {
          void onSessionRevoked?.()
        }
      },
    )

    socket.on('token:moved', (payload: TokenMovedEvent) => {
      setLastEvent(`token:moved ${payload.tokenId}`)
    })

    socket.on('narrative:updated', (payload: NarrativeUpdatedEvent) => {
      setLastEvent(`narrative:updated ${payload.visibility}`)
    })

    socket.on('dice:rolled', (payload: DiceRollResult) => {
      setLastRoll(payload)
      setLastEvent(`dice:rolled ${payload.output}`)
    })

    socket.on('encounter:update', (payload: EncounterState) => {
      setActiveEncounter(payload)
      setLastEvent(`encounter:update ronda ${payload.roundNumber}`)
    })

    socket.on('fog:updated', (payload: FogUpdatedEvent) => {
      setLastEvent(
        `fog:updated ${payload.experience.fogOfWar.revealedAreas.length}`,
      )
    })

    socket.on('light:updated', (payload: LightUpdatedEvent) => {
      setLastEvent(
        `light:updated ${payload.experience.lighting.sources.length}`,
      )
    })

    socket.on('vision:updated', (payload: VisionUpdatedEvent) => {
      setVisionHistory(payload.history)
      setLastEvent(
        `vision:updated ${payload.experience.vision.occluders.length}`,
      )
    })

    socket.on('asset:cued', (payload: AssetCuedEvent) => {
      setLastEvent(
        `asset:cued ${payload.experience.ambience.activeCue?.name ?? 'cue'}`,
      )
    })

    socket.on('audio:mixer:updated', (payload: AudioMixerUpdatedEvent) => {
      setLastEvent(
        `audio:mixer ${Math.round(payload.experience.audioMixer.masterVolume * 100)}%`,
      )
    })

    socket.on('audio:preset:saved', (payload: AudioPresetSavedEvent) => {
      setLastEvent(`audio:preset:saved ${payload.preset.name}`)
    })

    socket.on('audio:preset:applied', (payload: AudioPresetAppliedEvent) => {
      setLastEvent(`audio:preset:applied ${payload.preset.name}`)
    })

    socket.on('audio:preset:managed', (payload: AudioPresetManagedEvent) => {
      setLastEvent(`audio:preset:managed ${payload.action}`)
    })

    return () => {
      socket.removeAllListeners()
      socket.io.removeAllListeners()
      socket.close()
      socketRef.current = null
    }
  }, [accessToken, campaignId, onSessionRevoked, role, sessionId])

  const connectionLabel = useMemo(() => {
    if (connected) {
      return 'Conectado'
    }

    if (reconnectAttempt > 0) {
      return `Reconectando (${reconnectAttempt})`
    }

    return lastError ? 'Sin conexión' : 'Conectando'
  }, [connected, lastError, reconnectAttempt])

  function moveToken(command: TokenMoveCommand) {
    socketRef.current?.emit('token:move', command, (ack: TokenMoveAck) => {
      if (!ack.ok) {
        setLastError(ack.error ?? 'No se pudo mover el token')
        return
      }

      setLastError('')
      setLastEvent(`token:move ${ack.token?.id ?? command.tokenId}`)
    })
  }

  function sendNarrative(command: NarrativeUpdateCommand) {
    socketRef.current?.emit(
      'narrative:update',
      command,
      (ack: NarrativeUpdateAck) => {
        if (!ack.ok) {
          setLastError(ack.error ?? 'No se pudo publicar la narrativa')
          return
        }

        setLastError('')
        setLastEvent('narrative:update')
      },
    )
  }

  function requestGameState() {
    socketRef.current?.emit(
      'game:state:request',
      {},
      (payload: GameStatePayload) => {
        setState(payload)
        setLastEvent('game:state:request')
      },
    )
  }

  function rollDice(command: RollDiceRequest) {
    socketRef.current?.emit('dice:roll', command, (ack: DiceRollAck) => {
      if (!ack.ok) {
        setLastError(ack.error ?? 'No se pudo tirar dados')
        return
      }

      setLastError('')
      if (ack.roll) {
        setLastRoll(ack.roll)
      }
      setLastEvent(`dice:roll ${command.formula}`)
    })
  }

  function startEncounter(command: CreateEncounterRequest) {
    socketRef.current?.emit(
      'encounter:start',
      command,
      (ack: EncounterAck) => {
        if (!ack.ok) {
          setLastError(ack.error ?? 'No se pudo iniciar el encuentro')
          return
        }

        setLastError('')
        if (ack.encounter) {
          setActiveEncounter(ack.encounter)
        }
        setLastEvent('encounter:start')
      },
    )
  }

  function updateFog(command: FogUpdateCommand) {
    socketRef.current?.emit('fog:update', command, (ack: FogUpdateAck) => {
      if (!ack.ok) {
        setLastError(ack.error ?? 'No se pudo actualizar la niebla')
        return
      }

      setLastError('')
      setLastEvent('fog:update')
    })
  }

  function updateLighting(command: LightUpdateCommand) {
    socketRef.current?.emit(
      'light:update',
      command,
      (ack: LightUpdateAck) => {
        if (!ack.ok) {
          setLastError(ack.error ?? 'No se pudo actualizar la iluminación')
          return
        }

        setLastError('')
        setLastEvent(`light:update ${command.action}`)
      },
    )
  }

  function updateVision(command: VisionUpdateCommand) {
    socketRef.current?.emit(
      'vision:update',
      command,
      (ack: VisionUpdateAck) => {
        if (!ack.ok) {
          setLastError(ack.error ?? 'No se pudo actualizar la visión')
          return
        }

        setLastError('')
        if (ack.history) setVisionHistory(ack.history)
        setLastEvent(`vision:update ${command.action}`)
      },
    )
  }

  function cueAsset(command: AssetCueCommand) {
    socketRef.current?.emit('asset:cue', command, (ack: AssetCueAck) => {
      if (!ack.ok) {
        setLastError(ack.error ?? 'No se pudo disparar el ambiente')
        return
      }

      setLastError('')
      setLastEvent('asset:cue')
    })
  }

  function updateAudioMixer(command: AudioMixerCommand) {
    socketRef.current?.emit(
      'audio:mixer:update',
      command,
      (ack: AudioMixerAck) => {
        if (!ack.ok) {
          setLastError(ack.error ?? 'No se pudo actualizar el mixer')
          return
        }

        setLastError('')
        setLastEvent(`audio:mixer:update ${command.action}`)
      },
    )
  }

  function saveAudioPreset(command: AudioPresetSaveCommand) {
    socketRef.current?.emit(
      'audio:preset:save',
      command,
      (ack: AudioPresetAck) => {
        if (!ack.ok) {
          setLastError(ack.error ?? 'No se pudo guardar el preset')
          return
        }

        setLastError('')
        setLastEvent(`audio:preset:save ${ack.preset?.name ?? command.name}`)
      },
    )
  }

  function applyAudioPreset(command: AudioPresetApplyCommand) {
    socketRef.current?.emit(
      'audio:preset:apply',
      command,
      (ack: AudioPresetAck) => {
        if (!ack.ok) {
          setLastError(ack.error ?? 'No se pudo aplicar el preset')
          return
        }

        setLastError('')
        setLastEvent(`audio:preset:apply ${ack.preset?.name ?? command.presetId}`)
      },
    )
  }

  function manageAudioPreset(command: AudioPresetManageCommand) {
    socketRef.current?.emit(
      'audio:preset:manage',
      command,
      (ack: AudioPresetAck) => {
        if (!ack.ok) {
          setLastError(ack.error ?? 'No se pudo gestionar el preset')
          return
        }

        setLastError('')
        setLastEvent(`audio:preset:manage ${command.action}`)
      },
    )
  }

  function advanceTurn(command: AdvanceTurnRequest) {
    socketRef.current?.emit('turn:advance', command, (ack: EncounterAck) => {
      if (!ack.ok) {
        setLastError(ack.error ?? 'No se pudo avanzar el turno')
        return
      }

      setLastError('')
      if (ack.encounter) {
        setActiveEncounter(ack.encounter)
      }
      setLastEvent('turn:advance')
    })
  }

  return {
    activeEncounter,
    advanceTurn,
    applyAudioPreset,
    connected,
    connectionLabel,
    cueAsset,
    lastError,
    lastEvent,
    lastRoll,
    manageAudioPreset,
    moveToken,
    requestGameState,
    rollDice,
    saveAudioPreset,
    sendNarrative,
    startEncounter,
    state,
    updateAudioMixer,
    updateFog,
    updateLighting,
    updateVision,
    visionHistory,
  }
}

function cacheState(
  role: ClientRole,
  campaignId: string,
  state: GameStatePayload,
) {
  try {
    sessionStorage.setItem(cacheKey(role, campaignId), JSON.stringify(state))
  } catch {
    // The live socket remains authoritative when browser storage is unavailable.
  }
}

function readCachedState(role: ClientRole, campaignId: string) {
  try {
    const raw = sessionStorage.getItem(cacheKey(role, campaignId))
    return raw ? (JSON.parse(raw) as GameStatePayload) : null
  } catch {
    return null
  }
}

function cacheKey(role: ClientRole, campaignId: string) {
  return `dit:game-state:${role}:${campaignId}`
}
