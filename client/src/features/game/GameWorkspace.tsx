import { useEffect, useMemo, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { AuthPrincipal } from '../../../../shared/types/auth'
import type {
  AIApproveResponse,
  AIGenerateResponse,
  AIGenerationPurpose,
} from '../../../../shared/types/ai'
import type {
  RollDiceRequest,
  RollVisibility,
} from '../../../../shared/types/dice'
import type { DemoReadinessResponse } from '../../../../shared/types/demo'
import type {
  CampaignPackage,
  CampaignPackageImportReport,
} from '../../../../shared/types/campaign-package'
import type {
  AssetLibraryItem,
  AssetLibraryResponse,
  AssetLibraryType,
} from '../../../../shared/types/asset'
import type {
  AdvanceTurnRequest,
  CreateEncounterRequest,
} from '../../../../shared/types/combat'
import type { EnemyProfile, NPCProfile } from '../../../../shared/types/npc'
import type {
  ActiveAssetCue,
  AmbienceMood,
  AssetCueCommand,
  AssetCueType,
  AudioChannelId,
  AudioMixerCommand,
  AudioMixerState,
  AudioPresetApplyCommand,
  AudioPresetManageCommand,
  AudioPresetSaveCommand,
  AudioTransitionMode,
  AudioTransitionState,
  DisplayMode,
  FogUpdateCommand,
  LightUpdateCommand,
  VisionOccluder,
  VisionUpdateCommand,
} from '../../../../shared/types/table-experience'
import type { CampaignRulesetResponse } from '../../../../shared/types/ruleset'
import type {
  ClientRole,
  NarrativeUpdateCommand,
  TokenMoveCommand,
} from '../../../../shared/types/realtime'
import {
  GameBoard,
  type VisionEditMode,
} from './components/GameBoard'
import {
  DEFAULT_MAP_LAYERS,
  moveMapLayer,
  type MapLayerId,
  type MapLayerSetting,
} from './map-layers'
import { useRealtimeGame } from './useRealtimeGame'
import { TableAccessControl } from '../auth/TableAccessControl'
import { authHeaders } from '../auth/session-storage'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')

const AI_PURPOSE_OPTIONS: Array<{
  value: AIGenerationPurpose
  label: string
}> = [
  { value: 'npc', label: 'NPC' },
  { value: 'scene', label: 'Escena' },
  { value: 'villain', label: 'Villano' },
  { value: 'event', label: 'Evento' },
  { value: 'summary', label: 'Resumen' },
  { value: 'encounter', label: 'Encuentro' },
  { value: 'campaign', label: 'Campaña' },
]

const AUDIO_CHANNEL_IDS: AudioChannelId[] = ['music', 'sound', 'effect']
const DEFAULT_AUDIO_TRANSITION_MS = 1200

type GameWorkspaceProps = {
  role: ClientRole
  accessToken: string
  principal: AuthPrincipal
  onLogout: () => void | Promise<void>
}

export function GameWorkspace({
  role,
  accessToken,
  principal,
  onLogout,
}: GameWorkspaceProps) {
  const {
    connected,
    connectionLabel,
    lastError,
    lastEvent,
    activeEncounter,
    advanceTurn,
    applyAudioPreset,
    cueAsset,
    lastRoll,
    manageAudioPreset,
    moveToken,
    requestGameState,
    rollDice,
    sendNarrative,
    startEncounter,
    state,
    saveAudioPreset,
    updateAudioMixer,
    updateFog,
    updateLighting,
    updateVision,
    visionHistory,
  } = useRealtimeGame(
    role,
    accessToken,
    principal.campaignId,
    principal.sessionId,
    onLogout,
  )
  const [draftNarrative, setDraftNarrative] = useState('')
  const [diceFormula, setDiceFormula] = useState('d20')
  const [rollVisibility, setRollVisibility] =
    useState<RollVisibility>('public')
  const [initiativeDrafts, setInitiativeDrafts] = useState<
    Record<string, string>
  >({})
  const [npcName, setNpcName] = useState('Mira Voss')
  const [npcRole, setNpcRole] = useState('Informante')
  const [enemyName, setEnemyName] = useState('Bandido')
  const [enemyHp, setEnemyHp] = useState('11')
  const [entityStatus, setEntityStatus] = useState('')
  const [aiPurpose, setAiPurpose] = useState<AIGenerationPurpose>('npc')
  const [aiPrompt, setAiPrompt] = useState(
    'tabernera que oculta un mapa hacia una cripta bajo el mercado',
  )
  const [aiDraft, setAiDraft] = useState<AIGenerateResponse | null>(null)
  const [aiStatus, setAiStatus] = useState('')
  const [fogEnabled, setFogEnabled] = useState(false)
  const [fogOpacity, setFogOpacity] = useState('0.72')
  const [lightingEnabled, setLightingEnabled] = useState(false)
  const [lightGlobalDim, setLightGlobalDim] = useState('0.58')
  const [lightSourceName, setLightSourceName] = useState('Antorcha')
  const [lightTokenId, setLightTokenId] = useState('token-hero')
  const [lightRadius, setLightRadius] = useState('210')
  const [lightIntensity, setLightIntensity] = useState('0.8')
  const [lightColor, setLightColor] = useState('#facc15')
  const [selectedLightSourceId, setSelectedLightSourceId] = useState('')
  const [visionEnabled, setVisionEnabled] = useState(false)
  const [visionRange, setVisionRange] = useState('560')
  const [occluderName, setOccluderName] = useState('Muro')
  const [occluderKind, setOccluderKind] = useState<'wall' | 'door'>('wall')
  const [occluderOpen, setOccluderOpen] = useState(false)
  const [occluderX1, setOccluderX1] = useState('420')
  const [occluderY1, setOccluderY1] = useState('250')
  const [occluderX2, setOccluderX2] = useState('420')
  const [occluderY2, setOccluderY2] = useState('600')
  const [occluderBlocksSight, setOccluderBlocksSight] = useState(true)
  const [occluderBlocksLight, setOccluderBlocksLight] = useState(true)
  const [selectedOccluderId, setSelectedOccluderId] = useState('')
  const [selectedOccluderIds, setSelectedOccluderIds] = useState<string[]>([])
  const [visionEditMode, setVisionEditMode] =
    useState<VisionEditMode>('select')
  const [pendingVisionPoint, setPendingVisionPoint] = useState<{
    x: number
    y: number
  } | null>(null)
  const [visionSnapEnabled, setVisionSnapEnabled] = useState(true)
  const [visionContinuous, setVisionContinuous] = useState(false)
  const [mapLayers, setMapLayers] = useState<MapLayerSetting[]>(() =>
    DEFAULT_MAP_LAYERS.map((layer) => ({ ...layer })),
  )
  const [ambienceName, setAmbienceName] = useState('Ruinas nocturnas')
  const [ambienceMood, setAmbienceMood] = useState<AmbienceMood>('mystery')
  const [ambienceVolume, setAmbienceVolume] = useState('0.55')
  const [audioPresetName, setAudioPresetName] = useState('Ruinas tensas')
  const [audioPresetRename, setAudioPresetRename] = useState(
    'Ruinas tensas editada',
  )
  const [selectedAudioPresetId, setSelectedAudioPresetId] = useState('')
  const [audioTransitionMode, setAudioTransitionMode] =
    useState<AudioTransitionMode>('crossfade')
  const [audioTransitionDuration, setAudioTransitionDuration] = useState(
    String(DEFAULT_AUDIO_TRANSITION_MS),
  )
  const [displayMode, setDisplayMode] = useState<DisplayMode>('standard')
  const [playerHandout, setPlayerHandout] = useState(
    'El campamento huele a lluvia vieja y ceniza fría.',
  )
  const [tableStatus, setTableStatus] = useState('')
  const [assetLibrary, setAssetLibrary] =
    useState<AssetLibraryResponse | null>(null)
  const [assetType, setAssetType] = useState<AssetLibraryType>('music')
  const [assetName, setAssetName] = useState('Tema de ruinas')
  const [assetUrl, setAssetUrl] = useState('/assets/music/ruins-night.wav')
  const [assetStatus, setAssetStatus] = useState('')
  const [selectedCueAssetId, setSelectedCueAssetId] = useState('')
  const [rulesetInfo, setRulesetInfo] =
    useState<CampaignRulesetResponse | null>(null)
  const [rulesetStatus, setRulesetStatus] = useState('')
  const [demoReadiness, setDemoReadiness] =
    useState<DemoReadinessResponse | null>(null)
  const [demoStatus, setDemoStatus] = useState('')
  const [campaignPackage, setCampaignPackage] =
    useState<CampaignPackage | null>(null)
  const [packageImportText, setPackageImportText] = useState('')
  const [packageReport, setPackageReport] =
    useState<CampaignPackageImportReport | null>(null)
  const [packageStatus, setPackageStatus] = useState('')

  const scene = state?.scene
  const experience = scene?.experience
  const publicTokens = scene?.tokens.filter((token) => token.visible) ?? []
  const hiddenTokens = scene?.tokens.filter((token) => !token.visible) ?? []
  const assets = assetLibrary?.assets ?? []
  const ambienceAssets = assets.filter(
    (asset): asset is AssetLibraryItem & { type: AssetCueType } =>
      asset.type === 'music' || asset.type === 'sound' || asset.type === 'effect',
  )
  const isDm = role === 'dm'
  const isPlayer = role === 'player'
  const displayTitle = isDm
    ? 'Panel del DM'
    : isPlayer
      ? 'Cliente de jugador'
      : 'Pantalla pública'
  const activeCombatant = activeEncounter?.combatants.find(
    (combatant) => combatant.id === activeEncounter.activeCombatantId,
  )
  const activeCue = experience?.ambience.activeCue
  const lighting = experience?.lighting
  const lightSources = lighting?.sources ?? []
  const selectedLightSource = lightSources.find(
    (source) => source.id === selectedLightSourceId,
  )
  const vision = experience?.vision
  const occluders = vision?.occluders ?? []
  const selectedOccluder = occluders.find(
    (occluder) => occluder.id === selectedOccluderId,
  )
  const selectedOccluders = occluders.filter((occluder) =>
    selectedOccluderIds.includes(occluder.id),
  )
  const audioMixer = experience?.audioMixer
  const audioPresets = experience?.audioPresets ?? []
  const audioTransition = experience?.audioTransition
  const [transitionClock, setTransitionClock] = useState(() => Date.now())
  const selectedAudioPreset =
    audioPresets.find((preset) => preset.id === selectedAudioPresetId) ??
    audioPresets[0]
  const transitionActive = isAudioTransitionActive(
    audioTransition,
    transitionClock,
  )
  const activeAudioCues = audioMixer
    ? AUDIO_CHANNEL_IDS.map(
        (channelId) => audioMixer.channels[channelId]?.activeCue,
      ).filter((cue): cue is ActiveAssetCue => Boolean(cue))
    : activeCue
      ? [activeCue]
      : []
  const previousAudioCues =
    transitionActive &&
    audioTransition?.mode === 'crossfade' &&
    audioTransition.previousMixer
      ? AUDIO_CHANNEL_IDS.map(
          (channelId) => audioTransition.previousMixer?.channels[channelId]
            ?.activeCue,
        ).filter((cue): cue is ActiveAssetCue => Boolean(cue))
      : []

  const narrativeValue = useMemo(
    () => draftNarrative || scene?.narrativeText || '',
    [draftNarrative, scene?.narrativeText],
  )

  useEffect(() => {
    let active = true

    async function loadRuleset(campaignId: string) {
      try {
        const result = await getJson<CampaignRulesetResponse>(
          `${API_URL}/campaigns/${campaignId}/ruleset`,
        )

        if (!active) {
          return
        }

        setRulesetInfo(result)
        setRulesetStatus(
          result.fallbackUsed ? 'Ruleset fallback aplicado' : '',
        )
      } catch (error) {
        if (!active) {
          return
        }

        setRulesetStatus(
          error instanceof Error ? error.message : 'No se pudo cargar ruleset',
        )
      }
    }

    if (state?.campaignId) {
      void loadRuleset(state.campaignId)
    }

    return () => {
      active = false
    }
  }, [state?.campaignId])

  useEffect(() => {
    if (!audioTransition) {
      return
    }

    const remainingMs = audioTransitionRemainingMs(audioTransition)
    const timer = window.setTimeout(
      () => setTransitionClock(Date.now()),
      remainingMs + 50,
    )

    return () => window.clearTimeout(timer)
  }, [audioTransition])

  useEffect(() => {
    let active = true

    async function loadDemoReadiness() {
      try {
        const result = await getJson<DemoReadinessResponse>(
          `${API_URL}/demo/readiness`,
        )

        if (!active) {
          return
        }

        setDemoReadiness(result)
        setDemoStatus(result.allReady ? 'Demo lista' : 'Demo incompleta')
      } catch (error) {
        if (!active) {
          return
        }

        setDemoStatus(
          error instanceof Error ? error.message : 'No se pudo cargar demo',
        )
      }
    }

    if (isDm && connected) {
      void loadDemoReadiness()
    }

    return () => {
      active = false
    }
  }, [connected, isDm, lastEvent])

  useEffect(() => {
    if (isDm && connected && state?.campaignId) {
      void loadAssets(state.campaignId)
    }
  }, [connected, isDm, state?.campaignId])

  function handleTokenMove(tokenId: string, x: number, y: number) {
    if (!state?.campaignId || !state.sceneId) {
      return
    }

    const command: TokenMoveCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      tokenId,
      position: { x, y },
      requestId: crypto.randomUUID(),
    }

    moveToken(command)
  }

  function handleNarrativeSubmit() {
    if (!state?.campaignId || !state.sceneId || !narrativeValue.trim()) {
      return
    }

    const command: NarrativeUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      text: narrativeValue.trim(),
      visibility: 'public',
      requestId: crypto.randomUUID(),
    }

    sendNarrative(command)
  }

  function handleDiceRoll() {
    if (!state?.campaignId || !diceFormula.trim()) {
      return
    }

    const command: RollDiceRequest = {
      version: 1,
      campaignId: state.campaignId,
      sessionId: state.sessionId,
      formula: diceFormula.trim(),
      visibility: isDm ? rollVisibility : 'public',
      purpose: isPlayer ? 'Jugador' : 'Mesa',
      requestId: crypto.randomUUID(),
    }

    rollDice(command)
  }

  function handleEncounterStart() {
    if (!state?.campaignId || !state.sceneId || publicTokens.length === 0) {
      return
    }

    const command: CreateEncounterRequest = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      name: `Encuentro: ${scene?.name ?? 'Escena activa'}`,
      combatants: publicTokens.map((token) => ({
        tokenId: token.id,
        entityType: token.type,
        name: token.name,
        initiative: Number.parseInt(initiativeDrafts[token.id] ?? '10', 10),
      })),
      requestId: crypto.randomUUID(),
    }

    startEncounter(command)
  }

  function handleAdvanceTurn() {
    if (!state?.campaignId || !activeEncounter) {
      return
    }

    const command: AdvanceTurnRequest = {
      version: 1,
      campaignId: state.campaignId,
      encounterId: activeEncounter.id,
      requestId: crypto.randomUUID(),
    }

    advanceTurn(command)
  }

  async function handleCreateNpcToken() {
    if (!state?.campaignId || !state.sceneId || !npcName.trim()) {
      return
    }

    try {
      setEntityStatus('Creando NPC...')
      const npc = await postJson<NPCProfile>(
        `${API_URL}/campaigns/${state.campaignId}/npcs`,
        {
          name: npcName.trim(),
          role: npcRole.trim(),
          motivation: 'Aporta informacion util si el grupo gana su confianza.',
          voice: 'Habla bajo y mide cada palabra.',
          publicNotes: 'Figura local con contactos discretos.',
        },
      )

      await postJson(`${API_URL}/campaigns/${state.campaignId}/npcs/${npc.id}/token`, {
        sceneId: state.sceneId,
        x: 460,
        y: 300,
        color: '#a78bfa',
        visible: true,
      })
      requestGameState()
      setEntityStatus(`NPC agregado: ${npc.name}`)
    } catch (error) {
      setEntityStatus(error instanceof Error ? error.message : 'No se pudo crear NPC')
    }
  }

  async function handleCreateEnemyToken() {
    if (!state?.campaignId || !state.sceneId || !enemyName.trim()) {
      return
    }

    try {
      const maxHp = Number.parseInt(enemyHp, 10)
      setEntityStatus('Creando enemigo...')
      const enemy = await postJson<EnemyProfile>(
        `${API_URL}/campaigns/${state.campaignId}/enemies`,
        {
          name: enemyName.trim(),
          creatureType: 'humanoid',
          maxHp: Number.isFinite(maxHp) ? maxHp : 7,
          armorClass: 12,
          challengeRating: '1/8',
        },
      )

      await postJson(
        `${API_URL}/campaigns/${state.campaignId}/enemies/${enemy.id}/token`,
        {
          sceneId: state.sceneId,
          x: 760,
          y: 360,
          color: '#f97316',
          visible: true,
        },
      )
      requestGameState()
      setEntityStatus(`Enemigo agregado: ${enemy.name}`)
    } catch (error) {
      setEntityStatus(
        error instanceof Error ? error.message : 'No se pudo crear enemigo',
      )
    }
  }

  async function handleGenerateAi() {
    if (!state?.campaignId || !aiPrompt.trim()) {
      return
    }

    try {
      setAiStatus('Generando borrador...')
      const result = await postJson<AIGenerateResponse>(
        `${API_URL}/campaigns/${state.campaignId}/ai/generate`,
        {
          version: 1,
          campaignId: state.campaignId,
          purpose: aiPurpose,
          prompt: aiPrompt.trim(),
          contextIds: state.sceneId ? [state.sceneId] : [],
          requestId: crypto.randomUUID(),
        },
      )

      setAiDraft(result)
      setAiStatus(`Borrador listo con ${result.provider}`)
    } catch (error) {
      setAiStatus(
        error instanceof Error ? error.message : 'No se pudo generar borrador',
      )
    }
  }

  async function handleApproveAi(approved: boolean) {
    if (!state?.campaignId || !aiDraft) {
      return
    }

    try {
      const result = await postJson<AIApproveResponse>(
        `${API_URL}/campaigns/${state.campaignId}/ai/runs/${aiDraft.promptRunId}/approve`,
        {
          version: 1,
          approved,
          requestId: crypto.randomUUID(),
        },
      )

      setAiDraft((current) =>
        current ? { ...current, approved: result.approved } : current,
      )
      setAiStatus(result.approved ? 'Borrador aprobado' : 'Borrador rechazado')
    } catch (error) {
      setAiStatus(
        error instanceof Error ? error.message : 'No se pudo revisar borrador',
      )
    }
  }

  function handleFogSettingsUpdate() {
    if (!state?.campaignId || !state.sceneId) {
      return
    }

    const command: FogUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      enabled: fogEnabled,
      opacity: Number.parseFloat(fogOpacity),
      requestId: crypto.randomUUID(),
    }

    updateFog(command)
    setTableStatus('Niebla actualizada')
  }

  function handleRevealCenter() {
    if (!state?.campaignId || !state.sceneId || !scene) {
      return
    }

    const command: FogUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      enabled: true,
      opacity: Number.parseFloat(fogOpacity),
      reveal: {
        x: scene.map.width / 2,
        y: scene.map.height / 2,
        radius: scene.map.gridSize * 3,
        label: 'Área central',
      },
      requestId: crypto.randomUUID(),
    }

    setFogEnabled(true)
    updateFog(command)
    setTableStatus('Área central revelada')
  }

  function handleClearRevealedFog() {
    if (!state?.campaignId || !state.sceneId) {
      return
    }

    const command: FogUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      enabled: fogEnabled,
      opacity: Number.parseFloat(fogOpacity),
      clearRevealed: true,
      requestId: crypto.randomUUID(),
    }

    updateFog(command)
    setTableStatus('Áreas reveladas limpiadas')
  }

  function handleSelectLightSource(sourceId: string) {
    setSelectedLightSourceId(sourceId)

    const source = lightSources.find((candidate) => candidate.id === sourceId)

    if (!source) {
      return
    }

    setLightSourceName(source.name)
    setLightTokenId(source.tokenId ?? '')
    setLightRadius(String(Math.round(source.radius)))
    setLightIntensity(String(source.intensity))
    setLightColor(source.color)
  }

  function handleLightingSettingsUpdate() {
    if (!state?.campaignId || !state.sceneId) {
      return
    }

    const command: LightUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'configure',
      enabled: lightingEnabled,
      globalDim: clamp01(parseFinite(lightGlobalDim, lighting?.globalDim ?? 0.58)),
      requestId: crypto.randomUUID(),
    }

    updateLighting(command)
    setTableStatus('Iluminación actualizada')
  }

  function handleUpsertLightSource() {
    if (!state?.campaignId || !state.sceneId || !scene) {
      return
    }

    const selectedToken = scene.tokens.find((token) => token.id === lightTokenId)
    const tokenLight = selectedToken
      ? lightSources.find((source) => source.tokenId === selectedToken.id)
      : undefined
    const sourceId = selectedToken
      ? tokenLight?.id
      : selectedLightSource?.tokenId
        ? undefined
        : selectedLightSource?.id
    const radius = clampInt(
      Number.parseInt(lightRadius, 10),
      scene.map.gridSize,
      Math.max(scene.map.width, scene.map.height),
    )
    const intensity = clamp01(parseFinite(lightIntensity, 0.75))
    const command: LightUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'upsert-source',
      source: {
        id: sourceId,
        tokenId: selectedToken?.id,
        name: lightSourceName.trim() || selectedToken?.name || 'Luz',
        x: selectedToken?.x ?? scene.map.width / 2,
        y: selectedToken?.y ?? scene.map.height / 2,
        radius,
        intensity,
        color: normalizeHexColor(lightColor),
        visible: true,
      },
      requestId: crypto.randomUUID(),
    }

    updateLighting(command)
    setLightingEnabled(true)
    setTableStatus(
      selectedToken
        ? `Luz vinculada: ${selectedToken.name}`
        : 'Luz de escena actualizada',
    )
  }

  function handleRemoveLightSource() {
    const sourceId = selectedLightSource?.id

    if (!state?.campaignId || !state.sceneId || !sourceId) {
      return
    }

    const command: LightUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'remove-source',
      sourceId,
      requestId: crypto.randomUUID(),
    }

    updateLighting(command)
    setSelectedLightSourceId('')
    setTableStatus('Luz eliminada')
  }

  function handleClearLightSources() {
    if (!state?.campaignId || !state.sceneId) {
      return
    }

    const command: LightUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'clear-sources',
      requestId: crypto.randomUUID(),
    }

    updateLighting(command)
    setSelectedLightSourceId('')
    setTableStatus('Luces limpiadas')
  }

  function handleVisionSettingsUpdate() {
    if (!state?.campaignId || !state.sceneId) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'configure',
      enabled: visionEnabled,
      defaultRange: scene
        ? clampInt(
            parseFinite(visionRange, vision?.defaultRange ?? 560),
            scene.map.gridSize,
            Math.max(scene.map.width, scene.map.height) * 2,
          )
        : 560,
      requestId: crypto.randomUUID(),
    })
    setTableStatus('Línea de visión actualizada')
  }

  function handleSelectOccluder(occluderId: string, additive = false) {
    const nextIds = additive
      ? selectedOccluderIds.includes(occluderId)
        ? selectedOccluderIds.filter((id) => id !== occluderId)
        : [...selectedOccluderIds, occluderId]
      : occluderId
        ? [occluderId]
        : []
    setSelectedOccluderIds(nextIds)
    setSelectedOccluderId(
      nextIds.includes(occluderId) ? occluderId : (nextIds.at(-1) ?? ''),
    )
    setVisionEditMode('select')
    setPendingVisionPoint(null)
    const occluder = occluders.find((candidate) => candidate.id === occluderId)
    if (!occluder) return

    setOccluderName(occluder.name)
    setOccluderKind(occluder.kind)
    setOccluderOpen(occluder.open)
    setOccluderX1(String(occluder.x1))
    setOccluderY1(String(occluder.y1))
    setOccluderX2(String(occluder.x2))
    setOccluderY2(String(occluder.y2))
    setOccluderBlocksSight(occluder.blocksSight)
    setOccluderBlocksLight(occluder.blocksLight)
  }

  function handleUpsertOccluder() {
    if (!state?.campaignId || !state.sceneId || !scene) return

    const command: VisionUpdateCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'upsert-occluder',
      occluder: {
        id: selectedOccluder?.id,
        name: occluderName.trim() || 'Obstáculo',
        kind: occluderKind,
        open: occluderKind === 'door' ? occluderOpen : false,
        x1: clampInt(parseFinite(occluderX1, 0), 0, scene.map.width),
        y1: clampInt(parseFinite(occluderY1, 0), 0, scene.map.height),
        x2: clampInt(parseFinite(occluderX2, 0), 0, scene.map.width),
        y2: clampInt(parseFinite(occluderY2, 0), 0, scene.map.height),
        blocksSight: occluderBlocksSight,
        blocksLight: occluderBlocksLight,
      },
      requestId: crypto.randomUUID(),
    }

    updateVision(command)
    setVisionEnabled(true)
    setTableStatus('Obstáculo guardado')
  }

  function handleRemoveOccluder() {
    if (!state?.campaignId || !state.sceneId || !selectedOccluder) return

    removeOccluderById(selectedOccluder.id)
  }

  function removeOccluderById(occluderId: string) {
    if (!state?.campaignId || !state.sceneId) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'remove-occluder',
      occluderId,
      requestId: crypto.randomUUID(),
    })
    setSelectedOccluderId('')
    setSelectedOccluderIds((current) =>
      current.filter((candidate) => candidate !== occluderId),
    )
    setTableStatus('Obstáculo eliminado')
  }

  function handleToggleDoor() {
    if (
      !state?.campaignId ||
      !state.sceneId ||
      !selectedOccluder ||
      selectedOccluder.kind !== 'door'
    ) {
      return
    }

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'set-occluder-open',
      occluderId: selectedOccluder.id,
      open: !selectedOccluder.open,
      requestId: crypto.randomUUID(),
    })
    setOccluderOpen(!selectedOccluder.open)
    setTableStatus(selectedOccluder.open ? 'Puerta cerrada' : 'Puerta abierta')
  }

  function handleClearOccluders() {
    if (!state?.campaignId || !state.sceneId) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'clear-occluders',
      requestId: crypto.randomUUID(),
    })
    setSelectedOccluderId('')
    setSelectedOccluderIds([])
    setTableStatus('Obstáculos limpiados')
  }

  function handleVisionEditMode(mode: VisionEditMode) {
    setVisionEditMode(mode)
    setPendingVisionPoint(null)
    if (mode !== 'select') {
      setSelectedOccluderId('')
      setSelectedOccluderIds([])
    }
  }

  function handleVisionCanvasPoint(x: number, y: number) {
    if (visionEditMode === 'select' || !state?.campaignId || !state.sceneId) {
      return
    }

    const point =
      visionSnapEnabled && scene
        ? {
            x: clampInt(
              Math.round(x / scene.map.gridSize) * scene.map.gridSize,
              0,
              scene.map.width,
            ),
            y: clampInt(
              Math.round(y / scene.map.gridSize) * scene.map.gridSize,
              0,
              scene.map.height,
            ),
          }
        : { x, y }

    if (!pendingVisionPoint) {
      setPendingVisionPoint(point)
      setTableStatus('Selecciona el extremo final')
      return
    }

    if (pendingVisionPoint.x === point.x && pendingVisionPoint.y === point.y) {
      setTableStatus('El segmento necesita dos puntos distintos')
      return
    }

    const isDoor = visionEditMode === 'draw-door'
    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'upsert-occluder',
      occluder: {
        name: `${isDoor ? 'Puerta' : 'Muro'} ${occluders.length + 1}`,
        kind: isDoor ? 'door' : 'wall',
        open: false,
        x1: pendingVisionPoint.x,
        y1: pendingVisionPoint.y,
        x2: point.x,
        y2: point.y,
        blocksSight: true,
        blocksLight: true,
      },
      requestId: crypto.randomUUID(),
    })
    setVisionEnabled(true)
    setPendingVisionPoint(visionContinuous ? point : null)
    setTableStatus(isDoor ? 'Puerta dibujada' : 'Muro dibujado')
  }

  function handleBoardOccluderChange(occluder: VisionOccluder) {
    if (!state?.campaignId || !state.sceneId) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'upsert-occluder',
      occluder,
      requestId: crypto.randomUUID(),
    })
    setOccluderX1(String(occluder.x1))
    setOccluderY1(String(occluder.y1))
    setOccluderX2(String(occluder.x2))
    setOccluderY2(String(occluder.y2))
    setTableStatus('Segmento movido')
  }

  function handleDuplicateOccluder() {
    if (!state?.campaignId || !state.sceneId || !selectedOccluder || !scene) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'duplicate-occluder',
      occluderId: selectedOccluder.id,
      offsetX: scene.map.gridSize / 2,
      offsetY: scene.map.gridSize / 2,
      requestId: crypto.randomUUID(),
    })
    setTableStatus('Segmento duplicado')
  }

  function handleSplitOccluder() {
    if (!state?.campaignId || !state.sceneId || !selectedOccluder) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'split-occluder',
      occluderId: selectedOccluder.id,
      requestId: crypto.randomUUID(),
    })
    setSelectedOccluderId('')
    setSelectedOccluderIds([])
    setTableStatus('Segmento dividido')
  }

  function handleVisionHistory(action: 'undo' | 'redo') {
    if (!state?.campaignId || !state.sceneId) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action,
      requestId: crypto.randomUUID(),
    })
    setSelectedOccluderId('')
    setSelectedOccluderIds([])
    setTableStatus(action === 'undo' ? 'Cambio deshecho' : 'Cambio rehecho')
  }

  function handleMapLayerChange(
    layerId: MapLayerId,
    patch: Partial<Pick<MapLayerSetting, 'visible' | 'locked'>>,
  ) {
    setMapLayers((current) =>
      current.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer,
      ),
    )
  }

  function handleMoveMapLayer(layerId: MapLayerId, direction: -1 | 1) {
    setMapLayers((current) => moveMapLayer(current, layerId, direction))
  }

  function handleBatchUpdate(input: {
    offsetX?: number
    offsetY?: number
    batchPatch?: VisionUpdateCommand['batchPatch']
  }) {
    if (!state?.campaignId || !state.sceneId || !selectedOccluderIds.length) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'batch-update',
      occluderIds: selectedOccluderIds,
      ...input,
      requestId: crypto.randomUUID(),
    })
    setTableStatus(`${selectedOccluderIds.length} segmentos actualizados`)
  }

  function handleBatchRemove() {
    if (!state?.campaignId || !state.sceneId || !selectedOccluderIds.length) return

    updateVision({
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action: 'batch-remove',
      occluderIds: selectedOccluderIds,
      requestId: crypto.randomUUID(),
    })
    setSelectedOccluderId('')
    setSelectedOccluderIds([])
    setTableStatus('Selección eliminada')
  }

  function handleCueAsset() {
    const selectedCueAsset = ambienceAssets.find(
      (asset) => asset.id === selectedCueAssetId,
    )

    if (
      !state?.campaignId ||
      !state.sceneId ||
      (!selectedCueAsset && !ambienceName.trim())
    ) {
      return
    }

    const command: AssetCueCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      cue: {
        assetId: selectedCueAsset?.id,
        type: selectedCueAsset?.type ?? 'music',
        name: selectedCueAsset?.name ?? ambienceName.trim(),
        mood: ambienceMood,
        volume: Number.parseFloat(ambienceVolume),
        loop: true,
      },
      displayMode,
      playerHandout,
      requestId: crypto.randomUUID(),
    }

    cueAsset(command)
    setTableStatus('Ambiente sincronizado')
  }

  function handleAudioMixer(
    action: AudioMixerCommand['action'],
    channel?: AudioChannelId,
    volume?: number,
  ) {
    if (!state?.campaignId || !state.sceneId) {
      return
    }

    const command: AudioMixerCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      action,
      channel,
      volume,
      requestId: crypto.randomUUID(),
    }

    updateAudioMixer(command)
    setTableStatus(`Mixer: ${action}`)
  }

  function handleSaveAudioPreset() {
    if (!state?.campaignId || !state.sceneId || !audioPresetName.trim()) {
      return
    }

    const command: AudioPresetSaveCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      name: audioPresetName.trim(),
      requestId: crypto.randomUUID(),
    }

    saveAudioPreset(command)
    setTableStatus(`Preset guardado: ${command.name}`)
  }

  function handleApplyAudioPreset() {
    const presetId = selectedAudioPreset?.id

    if (!state?.campaignId || !state.sceneId || !presetId) {
      return
    }

    const command: AudioPresetApplyCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      presetId,
      transition: {
        mode: audioTransitionMode,
        durationMs:
          audioTransitionMode === 'cut'
            ? 0
            : clampInt(
                Number.parseInt(audioTransitionDuration, 10),
                0,
                10000,
              ),
      },
      requestId: crypto.randomUUID(),
    }

    applyAudioPreset(command)
    setTableStatus('Preset aplicado')
  }

  function handleManageAudioPreset(
    action: AudioPresetManageCommand['action'],
    direction?: AudioPresetManageCommand['direction'],
  ) {
    const presetId = selectedAudioPreset?.id

    if (!state?.campaignId || !state.sceneId || !presetId) {
      return
    }

    const command: AudioPresetManageCommand = {
      version: 1,
      campaignId: state.campaignId,
      sceneId: state.sceneId,
      presetId,
      action,
      name: action === 'rename' ? audioPresetRename.trim() : undefined,
      direction,
      requestId: crypto.randomUUID(),
    }

    if (action === 'rename' && !command.name) {
      return
    }

    manageAudioPreset(command)

    if (action === 'delete') {
      setSelectedAudioPresetId('')
    }

    setTableStatus(`Preset: ${action}`)
  }

  async function loadAssets(campaignId: string) {
    try {
      const result = await getJson<AssetLibraryResponse>(
        `${API_URL}/campaigns/${campaignId}/assets`,
      )
      setAssetLibrary(result)
      setAssetStatus(`${result.assets.length} assets registrados`)
      setSelectedCueAssetId((current) => {
        if (current) {
          return current
        }

        return (
          result.assets.find(
            (asset) =>
              asset.type === 'music' ||
              asset.type === 'sound' ||
              asset.type === 'effect',
          )?.id ?? ''
        )
      })
    } catch (error) {
      setAssetStatus(
        error instanceof Error ? error.message : 'No se pudo cargar assets',
      )
    }
  }

  async function handleCreateAsset() {
    if (!state?.campaignId || !assetName.trim() || !assetUrl.trim()) {
      return
    }

    try {
      setAssetStatus('Registrando asset...')
      const created = await postJson<AssetLibraryItem>(
        `${API_URL}/campaigns/${state.campaignId}/assets`,
        {
          version: 1,
          type: assetType,
          name: assetName.trim(),
          url: assetUrl.trim(),
          metadata: {
            usage: assetType === 'map' ? 'scene-map' : assetType,
          },
          requestId: crypto.randomUUID(),
        },
      )
      setAssetStatus(`Asset registrado: ${created.name}`)
      await loadAssets(state.campaignId)
    } catch (error) {
      setAssetStatus(
        error instanceof Error ? error.message : 'No se pudo registrar asset',
      )
    }
  }

  async function handleExportPackage() {
    if (!state?.campaignId) {
      return
    }

    try {
      setPackageStatus('Exportando paquete...')
      const result = await getJson<CampaignPackage>(
        `${API_URL}/campaigns/${state.campaignId}/package/export`,
      )
      const serialized = JSON.stringify(result, null, 2)

      setCampaignPackage(result)
      setPackageImportText(serialized)
      setPackageStatus(
        `Paquete exportado: ${result.manifest.campaignName} · ${result.manifest.counts.assets} assets`,
      )
    } catch (error) {
      setPackageStatus(
        error instanceof Error ? error.message : 'No se pudo exportar paquete',
      )
    }
  }

  async function handleValidatePackage() {
    if (!packageImportText.trim()) {
      return
    }

    try {
      setPackageStatus('Validando paquete...')
      const parsedPackage = JSON.parse(packageImportText) as CampaignPackage
      const result = await importPackage(parsedPackage, 'validate')

      setPackageReport(result)
      setPackageStatus(result.importable ? 'Paquete importable' : 'Paquete inválido')
    } catch (error) {
      setPackageReport(null)
      setPackageStatus(
        error instanceof Error ? error.message : 'No se pudo validar paquete',
      )
    }
  }

  async function handleApplyPackageCopy() {
    if (!packageImportText.trim()) {
      return
    }

    try {
      setPackageStatus('Aplicando copia...')
      const parsedPackage = JSON.parse(packageImportText) as CampaignPackage
      const result = await importPackage(parsedPackage, 'apply-copy')

      setPackageReport(result)
      setPackageStatus(
        result.appliedResources?.campaignId
          ? `Copia creada: ${result.appliedResources.campaignId}`
          : 'No se pudo aplicar copia',
      )
    } catch (error) {
      setPackageReport(null)
      setPackageStatus(
        error instanceof Error ? error.message : 'No se pudo aplicar paquete',
      )
    }
  }

  async function importPackage(
    parsedPackage: CampaignPackage,
    mode: 'validate' | 'apply-copy',
  ) {
    return postJson<CampaignPackageImportReport>(
      `${API_URL}/campaign-packages/import`,
      {
        version: 1,
        mode,
        package: parsedPackage,
        requestId: crypto.randomUUID(),
      },
    )
  }

  function handleDownloadPackage() {
    if (!campaignPackage) {
      return
    }

    const blob = new Blob([JSON.stringify(campaignPackage, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${slugify(campaignPackage.manifest.campaignName)}-${campaignPackage.schemaVersion}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main
      className={`app-shell app-shell--${role} app-shell--${
        experience?.displayMode ?? 'standard'
      }`}
    >
      <header className="topbar">
        <div>
          <span className="eyebrow">DM Interactive Table</span>
          <h1>{displayTitle}</h1>
        </div>
        <div className="topbar__actions">
          <nav className="topbar__nav" aria-label="Vistas principales">
            <NavLink to="/dm">DM</NavLink>
            <NavLink to="/display">Display</NavLink>
            <NavLink to="/player">Jugador</NavLink>
          </nav>
          {isDm ? (
            <TableAccessControl
              campaignId={state?.campaignId ?? principal.campaignId}
              sessionId={state?.sessionId ?? principal.sessionId}
            />
          ) : null}
          <button
            type="button"
            className="icon-button"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            onClick={() => void onLogout()}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="control-panel">
          <div className="panel-section">
            <span className={`status-dot ${connected ? 'is-online' : ''}`} />
            <div>
              <strong data-testid="connection-status">{connectionLabel}</strong>
              <p>{state?.scene?.name ?? 'Esperando escena activa'}</p>
              {state?.updatedAt ? (
                <small className="autosave-status">
                  Guardado {formatSaveTime(state.updatedAt)}
                </small>
              ) : null}
            </div>
          </div>

          <div className="panel-section">
            <span className="section-label">Campaña</span>
            <strong>{state?.campaignId ?? 'demo-campaign'}</strong>
            <p>Escena: {state?.sceneId ?? 'demo-scene'}</p>
          </div>

          {isDm && demoReadiness ? (
            <div className="panel-section demo-readiness-panel">
              <span className="section-label">Release</span>
              <strong>
                {demoReadiness.readyCount}/{demoReadiness.totalCount} listo
              </strong>
              <p>{demoReadiness.releaseName}</p>
              <div className="readiness-list">
                {demoReadiness.items.slice(0, 6).map((item) => (
                  <span
                    key={item.id}
                    className={`readiness-pill readiness-pill--${item.status}`}
                    title={item.evidence}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
              {demoStatus ? <p>{demoStatus}</p> : null}
            </div>
          ) : null}

          {isDm && rulesetInfo ? (
            <div className="panel-section ruleset-panel">
              <span className="section-label">Ruleset</span>
              <strong>{rulesetInfo.ruleset.name}</strong>
              <p>
                {rulesetInfo.resolvedRulesetId} · iniciativa{' '}
                {rulesetInfo.ruleset.combat.initiativeFormula}
              </p>
              <div className="ruleset-chips" aria-label="Presets de dados">
                {rulesetInfo.ruleset.dice.checks.slice(0, 4).map((check) => (
                  <code key={check.id}>{check.formula}</code>
                ))}
              </div>
              <div className="ruleset-list">
                {rulesetInfo.ruleset.combat.conditions
                  .slice(0, 6)
                  .map((condition) => (
                    <span key={condition.id}>{condition.label}</span>
                  ))}
              </div>
              <p>
                Hoja:{' '}
                {rulesetInfo.ruleset.characterSheet.sections
                  .map((section) => section.title)
                  .join(', ')}
              </p>
              {rulesetStatus ? <p>{rulesetStatus}</p> : null}
            </div>
          ) : null}

          <div className="panel-section">
            <span className="section-label">Tokens visibles</span>
            <strong>{publicTokens.length}</strong>
            {isDm ? <p>Ocultos para display: {hiddenTokens.length}</p> : null}
          </div>

          {isDm ? (
            <>
              <div className="panel-section tool-panel dice-panel">
                <label htmlFor="dice-formula">Dados</label>
                <div className="inline-controls">
                  <input
                    id="dice-formula"
                    value={diceFormula}
                    onChange={(event) => setDiceFormula(event.target.value)}
                  />
                  <select
                    value={rollVisibility}
                    onChange={(event) =>
                      setRollVisibility(event.target.value as RollVisibility)
                    }
                  >
                    <option value="public">Pública</option>
                    <option value="dm">DM</option>
                    <option value="private">Privada</option>
                  </select>
                </div>
                <button type="button" onClick={handleDiceRoll}>
                  Tirar dados
                </button>
              </div>

              <div className="panel-section tool-panel encounter-panel">
                <span className="section-label">Encuentro</span>
                <div className="initiative-list">
                  {publicTokens.map((token, index) => (
                    <label key={token.id}>
                      <span>{token.name}</span>
                      <input
                        inputMode="numeric"
                        value={initiativeDrafts[token.id] ?? `${12 - index}`}
                        onChange={(event) =>
                          setInitiativeDrafts((current) => ({
                            ...current,
                            [token.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <button type="button" onClick={handleEncounterStart}>
                  Iniciar encuentro
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  disabled={!activeEncounter}
                  onClick={handleAdvanceTurn}
                >
                  Avanzar turno
                </button>
              </div>

              <div className="panel-section tool-panel entity-panel">
                <span className="section-label">NPCs y enemigos</span>
                <label htmlFor="npc-name">NPC</label>
                <div className="inline-controls">
                  <input
                    id="npc-name"
                    value={npcName}
                    onChange={(event) => setNpcName(event.target.value)}
                  />
                  <input
                    aria-label="Rol del NPC"
                    value={npcRole}
                    onChange={(event) => setNpcRole(event.target.value)}
                  />
                </div>
                <button type="button" onClick={handleCreateNpcToken}>
                  Crear NPC token
                </button>

                <label htmlFor="enemy-name">Enemigo</label>
                <div className="inline-controls">
                  <input
                    id="enemy-name"
                    value={enemyName}
                    onChange={(event) => setEnemyName(event.target.value)}
                  />
                  <input
                    aria-label="HP del enemigo"
                    inputMode="numeric"
                    value={enemyHp}
                    onChange={(event) => setEnemyHp(event.target.value)}
                  />
                </div>
                <button type="button" onClick={handleCreateEnemyToken}>
                  Crear enemigo token
                </button>
                {entityStatus ? <p>{entityStatus}</p> : null}
              </div>

              <div className="panel-section tool-panel ai-panel">
                <span className="section-label">IA asistiva</span>
                <label htmlFor="ai-purpose">Propósito</label>
                <select
                  id="ai-purpose"
                  value={aiPurpose}
                  onChange={(event) =>
                    setAiPurpose(event.target.value as AIGenerationPurpose)
                  }
                >
                  {AI_PURPOSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label htmlFor="ai-prompt">Prompt</label>
                <textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  rows={4}
                />
                <button type="button" onClick={handleGenerateAi}>
                  Generar borrador
                </button>

                {aiDraft ? (
                  <div className="ai-draft">
                    <div className="ai-draft__meta">
                      <span>{aiDraft.purpose}</span>
                      <code>{aiDraft.model}</code>
                    </div>
                    <pre>{JSON.stringify(aiDraft.draft, null, 2)}</pre>
                    {aiDraft.warnings.length > 0 ? (
                      <ul>
                        {aiDraft.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="inline-actions">
                      <button
                        type="button"
                        disabled={aiDraft.approved}
                        onClick={() => void handleApproveAi(true)}
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => void handleApproveAi(false)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ) : null}
                {aiStatus ? <p>{aiStatus}</p> : null}
              </div>

              <div className="panel-section tool-panel table-experience-panel">
                <span className="section-label">Mesa</span>
                <label className="toggle-row" htmlFor="fog-enabled">
                  <span>Niebla de guerra</span>
                  <input
                    id="fog-enabled"
                    type="checkbox"
                    checked={fogEnabled}
                    onChange={(event) => setFogEnabled(event.target.checked)}
                  />
                </label>
                <label htmlFor="fog-opacity">Opacidad</label>
                <input
                  id="fog-opacity"
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={fogOpacity}
                  onChange={(event) => setFogOpacity(event.target.value)}
                />
                <div className="inline-actions">
                  <button type="button" onClick={handleFogSettingsUpdate}>
                    Aplicar niebla
                  </button>
                  <button type="button" onClick={handleRevealCenter}>
                    Revelar centro
                  </button>
                </div>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={handleClearRevealedFog}
                >
                  Limpiar revelado
                </button>

                <div className="lighting-panel">
                  <div className="mixer-heading">
                    <strong>Iluminación</strong>
                    <span>{lightSources.length} fuentes</span>
                  </div>
                  <label className="toggle-row" htmlFor="lighting-enabled">
                    <span>Luz dinámica</span>
                    <input
                      id="lighting-enabled"
                      type="checkbox"
                      checked={lightingEnabled}
                      onChange={(event) =>
                        setLightingEnabled(event.target.checked)
                      }
                    />
                  </label>
                  <label htmlFor="lighting-global-dim">Oscuridad</label>
                  <input
                    id="lighting-global-dim"
                    type="range"
                    min="0"
                    max="0.95"
                    step="0.05"
                    value={lightGlobalDim}
                    onChange={(event) => setLightGlobalDim(event.target.value)}
                  />
                  <button type="button" onClick={handleLightingSettingsUpdate}>
                    Aplicar luz
                  </button>
                  <label htmlFor="light-token">Vincular</label>
                  <select
                    id="light-token"
                    value={lightTokenId}
                    onChange={(event) => setLightTokenId(event.target.value)}
                  >
                    <option value="">Centro del mapa</option>
                    {scene?.tokens.map((token) => (
                      <option key={token.id} value={token.id}>
                        {token.name}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Nombre de la luz"
                    value={lightSourceName}
                    onChange={(event) => setLightSourceName(event.target.value)}
                  />
                  <div className="light-source-controls">
                    <input
                      aria-label="Radio de luz"
                      type="number"
                      min="20"
                      step="10"
                      value={lightRadius}
                      onChange={(event) => setLightRadius(event.target.value)}
                    />
                    <input
                      aria-label="Intensidad de luz"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={lightIntensity}
                      onChange={(event) =>
                        setLightIntensity(event.target.value)
                      }
                    />
                    <input
                      aria-label="Color de luz"
                      type="color"
                      value={lightColor}
                      onChange={(event) => setLightColor(event.target.value)}
                    />
                  </div>
                  <button type="button" onClick={handleUpsertLightSource}>
                    Guardar fuente
                  </button>
                  {lightSources.length > 0 ? (
                    <div className="light-source-list">
                      <select
                        aria-label="Fuente de luz"
                        value={selectedLightSourceId}
                        onChange={(event) =>
                          handleSelectLightSource(event.target.value)
                        }
                      >
                        <option value="">Fuente activa</option>
                        {lightSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="secondary-action"
                          disabled={!selectedLightSource}
                          onClick={handleRemoveLightSource}
                        >
                          Borrar luz
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={handleClearLightSources}
                        >
                          Limpiar luces
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="map-layer-panel">
                  <div className="mixer-heading">
                    <strong>Capas del mapa</strong>
                    <span>{mapLayers.filter((layer) => layer.visible).length}/{mapLayers.length}</span>
                  </div>
                  <div className="map-layer-list">
                    {[...mapLayers]
                      .sort((left, right) => right.order - left.order)
                      .map((layer, index, orderedLayers) => (
                        <div className="map-layer-row" key={layer.id}>
                          <strong>{layer.label}</strong>
                          <label title="Visible">
                            <span className="sr-only">Mostrar {layer.label}</span>
                            <input
                              type="checkbox"
                              checked={layer.visible}
                              onChange={(event) =>
                                handleMapLayerChange(layer.id, {
                                  visible: event.target.checked,
                                })
                              }
                            />
                          </label>
                          <label title="Bloqueada">
                            <span className="sr-only">Bloquear {layer.label}</span>
                            <input
                              type="checkbox"
                              checked={layer.locked}
                              onChange={(event) =>
                                handleMapLayerChange(layer.id, {
                                  locked: event.target.checked,
                                })
                              }
                            />
                          </label>
                          <button
                            type="button"
                            title="Subir capa"
                            aria-label={`Subir ${layer.label}`}
                            disabled={index === 0}
                            onClick={() => handleMoveMapLayer(layer.id, 1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            title="Bajar capa"
                            aria-label={`Bajar ${layer.label}`}
                            disabled={index === orderedLayers.length - 1}
                            onClick={() => handleMoveMapLayer(layer.id, -1)}
                          >
                            ↓
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="vision-panel">
                  <div className="mixer-heading">
                    <strong>Visión y obstáculos</strong>
                    <span>{occluders.length} segmentos</span>
                  </div>
                  <div className="history-actions">
                    <button
                      type="button"
                      className="secondary-action"
                      disabled={!visionHistory.canUndo}
                      onClick={() => handleVisionHistory('undo')}
                    >
                      Deshacer
                    </button>
                    <button
                      type="button"
                      className="secondary-action"
                      disabled={!visionHistory.canRedo}
                      onClick={() => handleVisionHistory('redo')}
                    >
                      Rehacer
                    </button>
                  </div>
                  <div className="vision-tools" role="group" aria-label="Herramienta de obstáculos">
                    <button
                      type="button"
                      aria-pressed={visionEditMode === 'select'}
                      onClick={() => handleVisionEditMode('select')}
                    >
                      Seleccionar
                    </button>
                    <button
                      type="button"
                      aria-pressed={visionEditMode === 'draw-wall'}
                      onClick={() => handleVisionEditMode('draw-wall')}
                    >
                      Muro
                    </button>
                    <button
                      type="button"
                      aria-pressed={visionEditMode === 'draw-door'}
                      onClick={() => handleVisionEditMode('draw-door')}
                    >
                      Puerta
                    </button>
                  </div>
                  <div className="inline-controls">
                    <label className="toggle-row">
                      <span>Ajustar a cuadrícula</span>
                      <input
                        type="checkbox"
                        checked={visionSnapEnabled}
                        onChange={(event) => setVisionSnapEnabled(event.target.checked)}
                      />
                    </label>
                    <label className="toggle-row">
                      <span>Dibujo continuo</span>
                      <input
                        type="checkbox"
                        checked={visionContinuous}
                        onChange={(event) => setVisionContinuous(event.target.checked)}
                      />
                    </label>
                  </div>
                  <label className="toggle-row" htmlFor="vision-enabled">
                    <span>Línea de visión</span>
                    <input
                      id="vision-enabled"
                      type="checkbox"
                      checked={visionEnabled}
                      onChange={(event) => setVisionEnabled(event.target.checked)}
                    />
                  </label>
                  <label htmlFor="vision-range">Alcance</label>
                  <input
                    id="vision-range"
                    type="range"
                    min={scene?.map.gridSize ?? 20}
                    max={
                      scene
                        ? Math.max(scene.map.width, scene.map.height) * 2
                        : 2800
                    }
                    step={scene?.map.gridSize ?? 20}
                    value={visionRange}
                    onChange={(event) => setVisionRange(event.target.value)}
                  />
                  <button type="button" onClick={handleVisionSettingsUpdate}>
                    Aplicar visión
                  </button>
                  <input
                    aria-label="Nombre del obstáculo"
                    value={occluderName}
                    onChange={(event) => setOccluderName(event.target.value)}
                  />
                  <div className="inline-controls">
                    <select
                      aria-label="Tipo de obstáculo"
                      value={occluderKind}
                      onChange={(event) => {
                        const kind = event.target.value as 'wall' | 'door'
                        setOccluderKind(kind)
                        if (kind === 'wall') setOccluderOpen(false)
                      }}
                    >
                      <option value="wall">Muro</option>
                      <option value="door">Puerta</option>
                    </select>
                    <label className="toggle-row">
                      <span>Abierta</span>
                      <input
                        type="checkbox"
                        disabled={occluderKind !== 'door'}
                        checked={occluderKind === 'door' && occluderOpen}
                        onChange={(event) => setOccluderOpen(event.target.checked)}
                      />
                    </label>
                  </div>
                  <div className="occluder-coordinates">
                    <input aria-label="X inicial" type="number" value={occluderX1} onChange={(event) => setOccluderX1(event.target.value)} />
                    <input aria-label="Y inicial" type="number" value={occluderY1} onChange={(event) => setOccluderY1(event.target.value)} />
                    <input aria-label="X final" type="number" value={occluderX2} onChange={(event) => setOccluderX2(event.target.value)} />
                    <input aria-label="Y final" type="number" value={occluderY2} onChange={(event) => setOccluderY2(event.target.value)} />
                  </div>
                  <div className="inline-controls">
                    <label className="toggle-row">
                      <span>Bloquea visión</span>
                      <input type="checkbox" checked={occluderBlocksSight} onChange={(event) => setOccluderBlocksSight(event.target.checked)} />
                    </label>
                    <label className="toggle-row">
                      <span>Bloquea luz</span>
                      <input type="checkbox" checked={occluderBlocksLight} onChange={(event) => setOccluderBlocksLight(event.target.checked)} />
                    </label>
                  </div>
                  <button type="button" onClick={handleUpsertOccluder}>
                    Guardar segmento
                  </button>
                  {occluders.length > 0 ? (
                    <div className="occluder-list">
                      <select
                        aria-label="Obstáculo"
                        value={selectedOccluderId}
                        onChange={(event) => handleSelectOccluder(event.target.value)}
                      >
                        <option value="">Nuevo segmento</option>
                        {occluders.map((occluder) => (
                          <option key={occluder.id} value={occluder.id}>
                            {occluder.kind === 'door'
                              ? `${occluder.name} (${occluder.open ? 'abierta' : 'cerrada'})`
                              : occluder.name}
                          </option>
                        ))}
                      </select>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="secondary-action"
                          disabled={selectedOccluder?.kind !== 'door'}
                          onClick={handleToggleDoor}
                        >
                          {selectedOccluder?.open ? 'Cerrar' : 'Abrir'}
                        </button>
                        <button type="button" className="secondary-action" disabled={!selectedOccluder} onClick={handleRemoveOccluder}>
                          Borrar segmento
                        </button>
                        <button type="button" className="secondary-action" onClick={handleClearOccluders}>
                          Limpiar segmentos
                        </button>
                      </div>
                      <div className="occluder-actions">
                        <button
                          type="button"
                          className="secondary-action"
                          disabled={!selectedOccluder}
                          onClick={handleDuplicateOccluder}
                        >
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          disabled={!selectedOccluder}
                          onClick={handleSplitOccluder}
                        >
                          Dividir
                        </button>
                      </div>
                      {selectedOccluders.length > 0 && scene ? (
                        <div className="batch-occluder-panel">
                          <div className="mixer-heading">
                            <strong>Selección</strong>
                            <span>{selectedOccluders.length}</span>
                          </div>
                          <div className="batch-nudge-actions">
                            <button
                              type="button"
                              title="Mover izquierda"
                              aria-label="Mover selección a la izquierda"
                              onClick={() => handleBatchUpdate({ offsetX: -scene.map.gridSize })}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              title="Mover arriba"
                              aria-label="Mover selección hacia arriba"
                              onClick={() => handleBatchUpdate({ offsetY: -scene.map.gridSize })}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              title="Mover abajo"
                              aria-label="Mover selección hacia abajo"
                              onClick={() => handleBatchUpdate({ offsetY: scene.map.gridSize })}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              title="Mover derecha"
                              aria-label="Mover selección a la derecha"
                              onClick={() => handleBatchUpdate({ offsetX: scene.map.gridSize })}
                            >
                              →
                            </button>
                          </div>
                          <div className="occluder-actions">
                            <button
                              type="button"
                              className="secondary-action"
                              onClick={() =>
                                handleBatchUpdate({
                                  batchPatch: {
                                    blocksSight: !selectedOccluders.every(
                                      (occluder) => occluder.blocksSight,
                                    ),
                                  },
                                })
                              }
                            >
                              Alternar visión
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              onClick={() =>
                                handleBatchUpdate({
                                  batchPatch: {
                                    blocksLight: !selectedOccluders.every(
                                      (occluder) => occluder.blocksLight,
                                    ),
                                  },
                                })
                              }
                            >
                              Alternar luz
                            </button>
                          </div>
                          <button
                            type="button"
                            className="secondary-action danger-action"
                            onClick={handleBatchRemove}
                          >
                            Eliminar selección
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <label htmlFor="ambience-name">Ambiente</label>
                {ambienceAssets.length > 0 ? (
                  <select
                    aria-label="Asset de ambiente"
                    value={selectedCueAssetId}
                    onChange={(event) => setSelectedCueAssetId(event.target.value)}
                  >
                    <option value="">Manual</option>
                    {ambienceAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  id="ambience-name"
                  value={ambienceName}
                  onChange={(event) => setAmbienceName(event.target.value)}
                />
                <div className="inline-controls">
                  <select
                    value={ambienceMood}
                    onChange={(event) =>
                      setAmbienceMood(event.target.value as AmbienceMood)
                    }
                  >
                    <option value="quiet">Calma</option>
                    <option value="mystery">Misterio</option>
                    <option value="danger">Peligro</option>
                    <option value="combat">Combate</option>
                    <option value="wonder">Asombro</option>
                  </select>
                  <input
                    aria-label="Volumen"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ambienceVolume}
                    onChange={(event) => setAmbienceVolume(event.target.value)}
                  />
                </div>
                <label htmlFor="display-mode">Display</label>
                <select
                  id="display-mode"
                  value={displayMode}
                  onChange={(event) =>
                    setDisplayMode(event.target.value as DisplayMode)
                  }
                >
                  <option value="standard">Estándar</option>
                  <option value="cinematic">Cinemático</option>
                </select>
                <label htmlFor="player-handout">Nota para jugadores</label>
                <textarea
                  id="player-handout"
                  value={playerHandout}
                  onChange={(event) => setPlayerHandout(event.target.value)}
                  rows={3}
                />
                <button type="button" onClick={handleCueAsset}>
                  Sincronizar ambiente
                </button>
                {audioMixer ? (
                  <div className="mixer-panel">
                    <div className="mixer-master">
                      <div className="mixer-heading">
                        <strong>Mixer</strong>
                        <span>
                          Master {Math.round(audioMixer.masterVolume * 100)}%
                        </span>
                      </div>
                      <input
                        aria-label="Volumen maestro"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={audioMixer.masterVolume}
                        onChange={(event) =>
                          handleAudioMixer(
                            'set-master-volume',
                            undefined,
                            Number.parseFloat(event.target.value),
                          )
                        }
                      />
                    </div>
                    {AUDIO_CHANNEL_IDS.map((channelId) => {
                      const channel = audioMixer.channels[channelId]
                      const hasCue = Boolean(channel.activeCue)
                      const isPaused = channel.playback === 'paused'

                      return (
                        <div className="mixer-channel" key={channel.id}>
                          <div className="mixer-heading">
                            <strong>{channel.label}</strong>
                            <span>{channel.playback}</span>
                          </div>
                          <input
                            aria-label={`Volumen ${channel.label}`}
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={channel.volume}
                            onChange={(event) =>
                              handleAudioMixer(
                                'set-volume',
                                channel.id,
                                Number.parseFloat(event.target.value),
                              )
                            }
                          />
                          <div className="mixer-actions">
                            <button
                              type="button"
                              disabled={!hasCue}
                              onClick={() =>
                                handleAudioMixer(
                                  isPaused ? 'resume' : 'pause',
                                  channel.id,
                                )
                              }
                            >
                              {isPaused ? 'Reanudar' : 'Pausa'}
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              onClick={() =>
                                handleAudioMixer(
                                  channel.muted ? 'unmute' : 'mute',
                                  channel.id,
                                )
                              }
                            >
                              {channel.muted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              disabled={!hasCue}
                              onClick={() =>
                                handleAudioMixer('stop', channel.id)
                              }
                            >
                              Stop
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    <div className="preset-panel">
                      <div className="mixer-heading">
                        <strong>Presets</strong>
                        <span>{audioPresets.length}</span>
                      </div>
                      <input
                        aria-label="Nombre del preset"
                        value={audioPresetName}
                        onChange={(event) =>
                          setAudioPresetName(event.target.value)
                        }
                      />
                      <button
                        type="button"
                        disabled={!audioPresetName.trim()}
                        onClick={handleSaveAudioPreset}
                      >
                        Guardar preset
                      </button>
                      {audioPresets.length > 0 ? (
                        <>
                          <div className="preset-apply">
                            <select
                              aria-label="Preset de audio"
                              value={selectedAudioPreset?.id ?? ''}
                              onChange={(event) =>
                                setSelectedAudioPresetId(event.target.value)
                              }
                            >
                              {audioPresets.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="secondary-action"
                              disabled={!selectedAudioPreset}
                              onClick={handleApplyAudioPreset}
                            >
                              Aplicar preset
                            </button>
                          </div>
                          <div className="preset-transition-controls">
                            <select
                              aria-label="Transición de audio"
                              value={audioTransitionMode}
                              onChange={(event) =>
                                setAudioTransitionMode(
                                  event.target.value as AudioTransitionMode,
                                )
                              }
                            >
                              <option value="cut">Corte</option>
                              <option value="fade">Fade</option>
                              <option value="crossfade">Crossfade</option>
                            </select>
                            <input
                              aria-label="Duración de transición en ms"
                              type="number"
                              min="0"
                              max="10000"
                              step="100"
                              value={audioTransitionDuration}
                              disabled={audioTransitionMode === 'cut'}
                              onChange={(event) =>
                                setAudioTransitionDuration(event.target.value)
                              }
                            />
                          </div>
                          <div className="preset-manage">
                            <input
                              aria-label="Nuevo nombre del preset"
                              value={audioPresetRename}
                              onChange={(event) =>
                                setAudioPresetRename(event.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="secondary-action"
                              disabled={
                                !selectedAudioPreset ||
                                !audioPresetRename.trim()
                              }
                              onClick={() => handleManageAudioPreset('rename')}
                            >
                              Renombrar
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              disabled={
                                !selectedAudioPreset ||
                                audioPresets[0]?.id === selectedAudioPreset.id
                              }
                              onClick={() =>
                                handleManageAudioPreset('move', 'up')
                              }
                            >
                              Subir
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              disabled={
                                !selectedAudioPreset ||
                                audioPresets[audioPresets.length - 1]?.id ===
                                  selectedAudioPreset.id
                              }
                              onClick={() =>
                                handleManageAudioPreset('move', 'down')
                              }
                            >
                              Bajar
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              disabled={!selectedAudioPreset}
                              onClick={() => handleManageAudioPreset('delete')}
                            >
                              Borrar
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {tableStatus ? <p>{tableStatus}</p> : null}
              </div>

              <div className="panel-section tool-panel asset-panel">
                <span className="section-label">Assets</span>
                <strong>{assets.length} registrados</strong>
                {assets.length > 0 ? (
                  <div className="asset-list">
                    {assets.slice(0, 5).map((asset) => (
                      <div className="asset-row" key={asset.id}>
                        <span>{asset.name}</span>
                        <code>{asset.type}</code>
                      </div>
                    ))}
                  </div>
                ) : null}
                <label htmlFor="asset-type">Tipo</label>
                <div className="inline-controls">
                  <select
                    id="asset-type"
                    value={assetType}
                    onChange={(event) =>
                      setAssetType(event.target.value as AssetLibraryType)
                    }
                  >
                    <option value="map">Mapa</option>
                    <option value="token">Token</option>
                    <option value="portrait">Retrato</option>
                    <option value="music">Música</option>
                    <option value="sound">Sonido</option>
                    <option value="effect">Efecto</option>
                  </select>
                  <input
                    aria-label="Nombre del asset"
                    value={assetName}
                    onChange={(event) => setAssetName(event.target.value)}
                  />
                </div>
                <label htmlFor="asset-url">URL</label>
                <input
                  id="asset-url"
                  value={assetUrl}
                  onChange={(event) => setAssetUrl(event.target.value)}
                />
                <button type="button" onClick={() => void handleCreateAsset()}>
                  Registrar asset
                </button>
                {assetStatus ? <p>{assetStatus}</p> : null}
              </div>

              <div className="panel-section tool-panel package-panel">
                <span className="section-label">Paquetes</span>
                <div className="inline-actions">
                  <button type="button" onClick={handleExportPackage}>
                    Exportar JSON
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    disabled={!campaignPackage}
                    onClick={handleDownloadPackage}
                  >
                    Descargar
                  </button>
                </div>
                {campaignPackage ? (
                  <div className="package-summary">
                    <strong>{campaignPackage.manifest.campaignName}</strong>
                    <p>
                      {campaignPackage.manifest.counts.tokens} tokens ·{' '}
                      {campaignPackage.manifest.counts.npcs} NPCs ·{' '}
                      {campaignPackage.manifest.counts.promptRuns} IA ·{' '}
                      {campaignPackage.manifest.counts.assets} assets
                    </p>
                    <p>
                      Assets:{' '}
                      {campaignPackage.manifest.assetMode === 'metadata-only'
                        ? 'metadata'
                        : campaignPackage.manifest.assetMode}
                    </p>
                  </div>
                ) : null}
                <label htmlFor="package-import">Importar</label>
                <textarea
                  id="package-import"
                  value={packageImportText}
                  onChange={(event) => setPackageImportText(event.target.value)}
                  rows={5}
                />
                <button type="button" onClick={handleValidatePackage}>
                  Validar paquete
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={handleApplyPackageCopy}
                >
                  Aplicar copia
                </button>
                {packageReport ? (
                  <div className="package-summary">
                    <strong>
                      {packageReport.importable ? 'Importable' : 'Bloqueado'}
                    </strong>
                    <p>
                      {packageReport.campaignName ?? 'Sin campaña'} · schema{' '}
                      {packageReport.schemaVersion ?? '?'}
                    </p>
                    {packageReport.counts ? (
                      <p>{packageReport.counts.assets} assets auditados</p>
                    ) : null}
                    {packageReport.appliedResources ? (
                      <p>
                        Nueva campaña:{' '}
                        {packageReport.appliedResources.campaignId}
                      </p>
                    ) : null}
                    {packageReport.issues.length > 0 ? (
                      <ul>
                        {packageReport.issues.map((issue) => (
                          <li key={`${issue.code}-${issue.message}`}>
                            {issue.severity}: {issue.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {packageStatus ? <p>{packageStatus}</p> : null}
              </div>

              <div className="panel-section narrative-editor">
                <label htmlFor="narrative">Narrativa pública</label>
                <textarea
                  id="narrative"
                  value={narrativeValue}
                  onChange={(event) => setDraftNarrative(event.target.value)}
                  rows={6}
                />
                <button type="button" onClick={handleNarrativeSubmit}>
                  Publicar narrativa
                </button>
              </div>
            </>
          ) : (
            <>
              {isPlayer ? (
                <div className="panel-section tool-panel dice-panel">
                  <label htmlFor="player-dice-formula">Tus dados</label>
                  <input
                    id="player-dice-formula"
                    value={diceFormula}
                    onChange={(event) => setDiceFormula(event.target.value)}
                  />
                  <button type="button" onClick={handleDiceRoll}>
                    Tirar público
                  </button>
                </div>
              ) : null}

              <div className="panel-section display-narrative">
                <span className="section-label">Narrativa</span>
                <p>
                  {scene?.narrativeText ?? 'Sin narrativa pública todavía.'}
                </p>
              </div>

              {activeAudioCues.length > 0 || previousAudioCues.length > 0 ? (
                <div className="panel-section ambience-readout">
                  <span className="section-label">Ambiente</span>
                  <div className="audio-cue-list">
                    {previousAudioCues.map((cue) => {
                      const mixer = audioTransition?.previousMixer
                      const channel = mixer?.channels[cue.channel]
                      const playback = channel?.playback ?? cue.playback
                      const effectiveVolume = effectiveCueVolume(cue, mixer)

                      return (
                        <div className="audio-cue audio-cue--previous" key={cue.id}>
                          <strong>{cue.name}</strong>
                          <p>
                            {channel?.label ?? cue.type} · {playback} ·{' '}
                            volumen {Math.round(effectiveVolume * 100)}%
                          </p>
                          <AudioCuePlayer
                            cue={cue}
                            mixer={mixer}
                            transition={audioTransition}
                            transitionRole="previous"
                          />
                        </div>
                      )
                    })}
                    {activeAudioCues.map((cue) => {
                      const channel = audioMixer?.channels[cue.channel]
                      const playback = channel?.playback ?? cue.playback
                      const effectiveVolume = effectiveCueVolume(cue, audioMixer)

                      return (
                        <div className="audio-cue" key={cue.id}>
                          <strong>{cue.name}</strong>
                          <p>
                            {channel?.label ?? cue.type} · {playback} ·{' '}
                            volumen {Math.round(effectiveVolume * 100)}%
                          </p>
                          <AudioCuePlayer
                            cue={cue}
                            mixer={audioMixer}
                            transition={audioTransition}
                            transitionRole="current"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {experience?.playerHandout ? (
                <div className="panel-section handout-readout">
                  <span className="section-label">Nota</span>
                  <p>{experience.playerHandout}</p>
                </div>
              ) : null}
            </>
          )}

          {lastRoll ? (
            <div className="panel-section roll-readout">
              <span className="section-label">Última tirada</span>
              <strong>{lastRoll.output}</strong>
              <p>
                Total {lastRoll.resultTotal} · {lastRoll.visibility}
              </p>
            </div>
          ) : null}

          {activeEncounter ? (
            <div className="panel-section combat-readout">
              <span className="section-label">Combate</span>
              <strong>Ronda {activeEncounter.roundNumber}</strong>
              <p>Turno: {activeCombatant?.name ?? 'Sin combatiente activo'}</p>
              <ol>
                {activeEncounter.combatants.map((combatant) => (
                  <li
                    key={combatant.id}
                    className={
                      combatant.id === activeEncounter.activeCombatantId
                        ? 'is-active'
                        : ''
                    }
                  >
                    <span>{combatant.name}</span>
                    <code>{combatant.initiative}</code>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {lastEvent ? (
            <div className="panel-section event-log">
              <span className="section-label">Último evento</span>
              <code>{lastEvent}</code>
            </div>
          ) : null}

          {lastError ? (
            <div className="panel-section error-box">
              <span className="section-label">Error</span>
              <p>{lastError}</p>
            </div>
          ) : null}
        </aside>

        <section className="stage-panel" aria-label="Escena activa">
          {scene ? (
            <GameBoard
              canMoveTokens={isDm}
              canEditVision={isDm}
              role={role}
              scene={scene}
              mapLayers={mapLayers}
              visionEditMode={visionEditMode}
              selectedOccluderId={selectedOccluderId}
              selectedOccluderIds={selectedOccluderIds}
              pendingVisionPoint={pendingVisionPoint}
              onTokenMove={handleTokenMove}
              onVisionCanvasPoint={handleVisionCanvasPoint}
              onSelectOccluder={handleSelectOccluder}
              onOccluderChange={handleBoardOccluderChange}
              onDeleteOccluder={removeOccluderById}
            />
          ) : (
            <div className="empty-stage">Conectando con la escena...</div>
          )}
        </section>
      </section>
    </main>
  )
}

type AudioCuePlayerProps = {
  cue: ActiveAssetCue
  mixer?: AudioMixerState
  transition?: AudioTransitionState
  transitionRole?: 'current' | 'previous'
}

function AudioCuePlayer({
  cue,
  mixer,
  transition,
  transitionRole = 'current',
}: AudioCuePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const channel = mixer?.channels[cue.channel]
  const playback = channel?.playback ?? cue.playback
  const cueUrl = cue.assetUrl ? assetUrlForClient(cue.assetUrl) : undefined
  const effectiveVolume = effectiveCueVolume(cue, mixer)

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    audio.muted = Boolean(channel?.muted)

    if (playback === 'playing') {
      void audio.play().catch(() => undefined)
    } else {
      audio.pause()

      if (playback === 'stopped') {
        audio.currentTime = 0
      }
    }

    let animationFrame = 0

    function updateVolume() {
      if (!audio) {
        return
      }

      audio.volume = transitionVolume(
        effectiveVolume,
        transition,
        transitionRole,
      )

      if (isAudioTransitionActive(transition) && playback === 'playing') {
        animationFrame = window.requestAnimationFrame(updateVolume)
      }
    }

    updateVolume()

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame)
      }
    }
  }, [
    channel?.muted,
    cue.id,
    effectiveVolume,
    playback,
    transition,
    transitionRole,
  ])


  if (!cueUrl) {
    return null
  }

  return (
    <audio
      ref={audioRef}
      key={cue.id}
      className="ambience-audio"
      src={cueUrl}
      controls
      autoPlay={playback === 'playing'}
      loop={cue.loop}
    />
  )
}

async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return (await response.json()) as T
}

async function getJson<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: authHeaders(),
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return (await response.json()) as T
}

async function readApiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string | { message?: string } }
    | null

  if (typeof payload?.error === 'string') return payload.error
  return payload?.error?.message ?? `HTTP ${response.status}`
}

function formatSaveTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'reciente'
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function parseFinite(value: string, fallback: number) {
  const parsed = Number.parseFloat(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, Math.round(value)))
}

function normalizeHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#facc15'
}

function effectiveCueVolume(cue: ActiveAssetCue, mixer?: AudioMixerState) {
  const channel = mixer?.channels[cue.channel]

  return clamp01(
    cue.volume *
      (channel?.volume ?? 1) *
      (mixer?.masterVolume ?? 1) *
      (channel?.muted ? 0 : 1),
  )
}

function isAudioTransitionActive(
  transition?: AudioTransitionState,
  now = Date.now(),
) {
  return Boolean(transition && audioTransitionRemainingMs(transition, now) > 0)
}

function audioTransitionRemainingMs(
  transition: AudioTransitionState,
  now = Date.now(),
) {
  const startedAt = Date.parse(transition.startedAt)

  if (!Number.isFinite(startedAt)) {
    return 0
  }

  return Math.max(0, transition.durationMs - (now - startedAt))
}

function audioTransitionProgress(
  transition: AudioTransitionState,
  now = Date.now(),
) {
  if (transition.durationMs <= 0) {
    return 1
  }

  const elapsedMs = transition.durationMs - audioTransitionRemainingMs(
    transition,
    now,
  )

  return clamp01(elapsedMs / transition.durationMs)
}

function transitionVolume(
  targetVolume: number,
  transition: AudioTransitionState | undefined,
  role: 'current' | 'previous',
) {
  if (!transition) {
    return role === 'previous' ? 0 : targetVolume
  }

  const progress = audioTransitionProgress(transition)

  if (role === 'previous') {
    return transition.mode === 'crossfade'
      ? targetVolume * (1 - progress)
      : 0
  }

  return targetVolume * progress
}

function assetUrlForClient(value: string) {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  if (value.startsWith('/')) {
    return `${API_ORIGIN}${value}`
  }

  return value
}
