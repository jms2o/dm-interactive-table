import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Focus, Hand, Home, ZoomIn, ZoomOut } from 'lucide-react'
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from 'react-konva'
import type Konva from 'konva'
import type { GameScene } from '../../../../../shared/types/game'
import type { ClientRole } from '../../../../../shared/types/realtime'
import type { TableDevicePreferences } from '../../../../../shared/types/device-experience'
import type {
  LightSource,
  VisionOccluder,
} from '../../../../../shared/types/table-experience'
import type { GameToken } from '../../../../../shared/types/token'
import { calculateVisibilityPolygon } from '../vision-geometry'
import {
  centerCameraOnMapPoint,
  frameMapBounds,
  screenToMap,
  zoomCameraAtPoint,
} from '../map-camera'
import {
  DEFAULT_MAP_LAYERS,
  type MapLayerId,
  type MapLayerSetting,
} from '../map-layers'
import { calibratedBoardWidth } from '../../device/table-device'
import demoMapImageUrl from '../../../assets/maps/demo-camp.png'

type GameBoardProps = {
  canMoveTokens: boolean
  canEditVision?: boolean
  role: ClientRole
  scene: GameScene
  visionEditMode?: VisionEditMode
  selectedOccluderId?: string
  selectedOccluderIds?: string[]
  pendingVisionPoint?: { x: number; y: number } | null
  selectedTokenId?: string | null
  focusedTokenId?: string | null
  focusRequest?: number
  interactionMode?: 'select' | 'pan'
  onTokenMove: (tokenId: string, x: number, y: number) => void
  onTokenSelect?: (tokenId: string | null) => void
  onInteractionModeChange?: (mode: 'select' | 'pan') => void
  onVisionCanvasPoint?: (x: number, y: number) => void
  onSelectOccluder?: (occluderId: string, additive?: boolean) => void
  onOccluderChange?: (occluder: VisionOccluder) => void
  onDeleteOccluder?: (occluderId: string) => void
  mapLayers?: MapLayerSetting[]
  devicePreferences: TableDevicePreferences
}

export type VisionEditMode = 'select' | 'draw-wall' | 'draw-door'

const BOARD_WIDTH = 1120
const BOARD_HEIGHT = 720
const MIN_CAMERA_ZOOM = 0.5
const MAX_CAMERA_ZOOM = 3
const CAMERA_ZOOM_STEP = 1.2
const MINIMAP_WIDTH = 220
const MINIMAP_HEIGHT = 140

export function GameBoard({
  canMoveTokens,
  canEditVision = false,
  role,
  scene,
  visionEditMode = 'select',
  selectedOccluderId,
  selectedOccluderIds = [],
  pendingVisionPoint,
  selectedTokenId: controlledSelectedTokenId,
  focusedTokenId,
  focusRequest = 0,
  interactionMode,
  onTokenMove,
  onTokenSelect,
  onInteractionModeChange,
  onVisionCanvasPoint,
  onSelectOccluder,
  onOccluderChange,
  onDeleteOccluder,
  mapLayers = DEFAULT_MAP_LAYERS,
  devicePreferences,
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [internalSelectedTokenId, setInternalSelectedTokenId] = useState<
    string | null
  >(null)
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null)
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })
  const [internalPanEnabled, setInternalPanEnabled] = useState(false)
  const layerRefs = useRef<Partial<Record<MapLayerId, Konva.Layer | null>>>({})
  const layerById = useMemo(
    () => new Map(mapLayers.map((layer) => [layer.id, layer])),
    [mapLayers],
  )
  const selectedTokenId =
    controlledSelectedTokenId === undefined
      ? internalSelectedTokenId
      : controlledSelectedTokenId
  const panEnabled = interactionMode
    ? interactionMode === 'pan'
    : internalPanEnabled
  const resolvedMapImageUrl =
    scene.map.id === 'demo-map' ||
    scene.map.imageUrl === '/assets/maps/demo-camp.png'
      ? demoMapImageUrl
      : scene.map.imageUrl

  useEffect(() => {
    let cancelled = false
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (!cancelled) setMapImage(image)
    }
    image.onerror = () => {
      if (!cancelled) setMapImage(null)
    }
    image.src = resolvedMapImageUrl

    return () => {
      cancelled = true
    }
  }, [resolvedMapImageUrl])

  useEffect(() => {
    for (const [index, setting] of [...mapLayers]
      .sort((left, right) => left.order - right.order)
      .filter((setting) => layerRefs.current[setting.id])
      .entries()) {
      layerRefs.current[setting.id]?.zIndex(index)
    }
  }, [
    mapLayers,
    scene.experience.fogOfWar.enabled,
    scene.experience.lighting.enabled,
    scene.experience.vision.enabled,
  ])

  const layerVisible = (id: MapLayerId) => layerById.get(id)?.visible ?? true
  const layerLocked = (id: MapLayerId) => layerById.get(id)?.locked ?? false

  const scale = useMemo(
    () =>
      Math.min(BOARD_WIDTH / scene.map.width, BOARD_HEIGHT / scene.map.height),
    [scene.map.height, scene.map.width],
  )
  const renderedBoardWidth = useMemo(
    () =>
      calibratedBoardWidth({
        boardWidth: BOARD_WIDTH,
        mapGridSize: scene.map.gridSize,
        mapScale: scale,
        preferences: devicePreferences,
      }),
    [devicePreferences, scale, scene.map.gridSize],
  )
  const calibrated = devicePreferences.calibrationEnabled
  const boardStyle = calibrated
    ? ({
        '--board-canvas-width': `${Math.round(renderedBoardWidth)}px`,
      } as CSSProperties)
    : undefined
  const minimapScale = Math.min(
    MINIMAP_WIDTH / scene.map.width,
    MINIMAP_HEIGHT / scene.map.height,
  )
  const minimapOffset = {
    x: (MINIMAP_WIDTH - scene.map.width * minimapScale) / 2,
    y: (MINIMAP_HEIGHT - scene.map.height * minimapScale) / 2,
  }
  const minimapViewport = {
    x: minimapOffset.x + (-camera.x / camera.zoom / scale) * minimapScale,
    y: minimapOffset.y + (-camera.y / camera.zoom / scale) * minimapScale,
    width: (BOARD_WIDTH / camera.zoom / scale) * minimapScale,
    height: (BOARD_HEIGHT / camera.zoom / scale) * minimapScale,
  }

  const gridLines = useMemo(() => {
    const lines: Array<{ points: number[]; key: string }> = []
    const step = scene.map.gridSize * scale

    for (let x = 0; x <= BOARD_WIDTH; x += step) {
      lines.push({ key: `v-${x}`, points: [x, 0, x, BOARD_HEIGHT] })
    }

    for (let y = 0; y <= BOARD_HEIGHT; y += step) {
      lines.push({ key: `h-${y}`, points: [0, y, BOARD_WIDTH, y] })
    }

    return lines
  }, [scene.map.gridSize, scale])

  const tokenById = useMemo(
    () => new Map(scene.tokens.map((token) => [token.id, token])),
    [scene.tokens],
  )

  useEffect(() => {
    if (!focusedTokenId || focusRequest === 0) return
    const token = tokenById.get(focusedTokenId)
    if (!token) return

    const animationFrame = window.requestAnimationFrame(() => {
      setCamera((current) =>
        centerCameraOnMapPoint({
          camera: current,
          mapPoint: { x: token.x, y: token.y },
          baseScale: scale,
          viewportWidth: BOARD_WIDTH,
          viewportHeight: BOARD_HEIGHT,
        }),
      )
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [focusRequest, focusedTokenId, scale, tokenById])

  function toStagePosition(token: GameToken) {
    return {
      x: token.x * scale,
      y: token.y * scale,
      radius: Math.max(18, (token.size * scene.map.gridSize * scale) / 2),
    }
  }

  function toRevealPosition(area: {
    x: number
    y: number
    radius: number
  }) {
    return {
      x: area.x * scale,
      y: area.y * scale,
      radius: area.radius * scale,
    }
  }

  function toLightPosition(source: LightSource) {
    const linkedToken = source.tokenId ? tokenById.get(source.tokenId) : undefined

    return {
      x: (linkedToken?.x ?? source.x) * scale,
      y: (linkedToken?.y ?? source.y) * scale,
      radius: source.radius * scale,
    }
  }

  function handleDragEnd(token: GameToken, event: Konva.KonvaEventObject<DragEvent>) {
    const node = event.target
    onTokenMove(token.id, Math.round(node.x() / scale), Math.round(node.y() / scale))
  }

  function handleStagePoint(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (event.target === event.target.getStage() && visionEditMode === 'select') {
      selectToken(null)
    }

    if (
      !canEditVision ||
      panEnabled ||
      layerLocked('vision') ||
      visionEditMode === 'select' ||
      event.target !== event.target.getStage()
    ) {
      return
    }

    const point = event.target.getStage()?.getPointerPosition()
    if (!point) return

    const mapPoint = screenToMap(point, camera, scale)
    onVisionCanvasPoint?.(Math.round(mapPoint.x), Math.round(mapPoint.y))
  }

  function selectToken(tokenId: string | null) {
    setInternalSelectedTokenId(tokenId)
    onTokenSelect?.(tokenId)
  }

  function togglePan() {
    const next = !panEnabled
    if (interactionMode === undefined) setInternalPanEnabled(next)
    onInteractionModeChange?.(next ? 'pan' : 'select')
  }

  function setZoomAtPoint(nextZoom: number, point = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 }) {
    setCamera(
      zoomCameraAtPoint({
        camera,
        nextZoom,
        point,
        minZoom: MIN_CAMERA_ZOOM,
        maxZoom: MAX_CAMERA_ZOOM,
      }),
    )
  }

  function handleWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault()
    const point = event.target.getStage()?.getPointerPosition()
    if (!point) return
    const direction = event.evt.deltaY > 0 ? 1 / CAMERA_ZOOM_STEP : CAMERA_ZOOM_STEP
    setZoomAtPoint(camera.zoom * direction, point)
  }

  function handleCameraDragEnd(event: Konva.KonvaEventObject<DragEvent>) {
    if (event.target !== event.target.getStage()) return
    setCamera((current) => ({
      ...current,
      x: event.target.x(),
      y: event.target.y(),
    }))
  }

  function resetCamera() {
    setCamera({ x: 0, y: 0, zoom: 1 })
  }

  function handleMinimapPoint(
    event: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) {
    const point = event.target.getStage()?.getPointerPosition()
    if (!point) return
    const mapPoint = {
      x: (point.x - minimapOffset.x) / minimapScale,
      y: (point.y - minimapOffset.y) / minimapScale,
    }
    setCamera((current) =>
      centerCameraOnMapPoint({
        camera: current,
        mapPoint,
        baseScale: scale,
        viewportWidth: BOARD_WIDTH,
        viewportHeight: BOARD_HEIGHT,
      }),
    )
  }

  function frameSelection() {
    const selected = vision.occluders.filter((occluder) =>
      selectedOccluderIds.includes(occluder.id),
    )
    if (!selected.length) {
      resetCamera()
      return
    }

    const xs = selected.flatMap((occluder) => [occluder.x1, occluder.x2])
    const ys = selected.flatMap((occluder) => [occluder.y1, occluder.y2])
    setCamera(
      frameMapBounds({
        bounds: {
          minX: Math.min(...xs),
          maxX: Math.max(...xs),
          minY: Math.min(...ys),
          maxY: Math.max(...ys),
        },
        baseScale: scale,
        viewportWidth: BOARD_WIDTH,
        viewportHeight: BOARD_HEIGHT,
        padding: 120,
        minZoom: MIN_CAMERA_ZOOM,
        maxZoom: MAX_CAMERA_ZOOM,
      }),
    )
  }

  function moveOccluderEndpoint(
    occluder: VisionOccluder,
    endpoint: 'start' | 'end',
    event: Konva.KonvaEventObject<DragEvent>,
  ) {
    const x = Math.round(event.target.x() / scale)
    const y = Math.round(event.target.y() / scale)
    onOccluderChange?.({
      ...occluder,
      ...(endpoint === 'start'
        ? { x1: clampCoordinate(x, scene.map.width), y1: clampCoordinate(y, scene.map.height) }
        : { x2: clampCoordinate(x, scene.map.width), y2: clampCoordinate(y, scene.map.height) }),
    })
  }

  const fog = scene.experience.fogOfWar
  const fogOpacity =
    role === 'dm' ? Math.min(fog.opacity, 0.32) : fog.opacity
  const lighting = scene.experience.lighting
  const lightSources = lighting.sources.filter(
    (source) => source.visible || role === 'dm',
  )
  const lightingOpacity =
    role === 'dm' ? Math.min(lighting.globalDim, 0.42) : lighting.globalDim
  const vision = scene.experience.vision
  const lightPolygons = useMemo(
    () =>
      lightSources
        .map((source) => {
          const linkedToken = source.tokenId
            ? tokenById.get(source.tokenId)
            : undefined
          const origin = {
            x: linkedToken?.x ?? source.x,
            y: linkedToken?.y ?? source.y,
          }

          return {
            source,
            origin: { x: origin.x * scale, y: origin.y * scale },
            radius: source.radius * scale,
            points: calculateVisibilityPolygon({
              origin,
              range: source.radius,
              mapWidth: scene.map.width,
              mapHeight: scene.map.height,
              occluders: vision.occluders,
              blocking: 'light',
            }).flatMap((point) => [point.x * scale, point.y * scale]),
          }
        })
        .filter((polygon) => polygon.points.length >= 6),
    [
      lightSources,
      scale,
      scene.map.height,
      scene.map.width,
      tokenById,
      vision.occluders,
    ],
  )
  const visionPolygons = useMemo(
    () =>
      scene.tokens
        .filter((token) => token.type === 'player')
        .map((token) => ({
          tokenId: token.id,
          points: calculateVisibilityPolygon({
            origin: { x: token.x, y: token.y },
            range: vision.defaultRange,
            mapWidth: scene.map.width,
            mapHeight: scene.map.height,
            occluders: vision.occluders,
          }).flatMap((point) => [point.x * scale, point.y * scale]),
        }))
        .filter((polygon) => polygon.points.length >= 6),
    [
      scale,
      scene.map.height,
      scene.map.width,
      scene.tokens,
      vision.defaultRange,
      vision.occluders,
    ],
  )

  function toOccluderPoints(occluder: VisionOccluder) {
    return [
      occluder.x1 * scale,
      occluder.y1 * scale,
      occluder.x2 * scale,
      occluder.y2 * scale,
    ]
  }

  return (
    <div
      className={`board-shell${calibrated ? ' board-shell--calibrated' : ''}`}
      ref={containerRef}
      style={boardStyle}
      data-calibrated={calibrated ? 'true' : 'false'}
    >
      <div className="board-meta">
        <div>
          <span className="section-label">{scene.map.name}</span>
          <strong data-testid="scene-name">{scene.name}</strong>
        </div>
        <div className="camera-toolbar" role="group" aria-label="Cámara del mapa">
          <button
            type="button"
            title="Desplazar mapa"
            aria-label="Desplazar mapa"
            aria-pressed={panEnabled}
            onClick={togglePan}
          >
            <Hand size={17} />
          </button>
          <button
            type="button"
            title="Alejar"
            aria-label="Alejar"
            onClick={() => setZoomAtPoint(camera.zoom / CAMERA_ZOOM_STEP)}
          >
            <ZoomOut size={17} />
          </button>
          <span>{Math.round(camera.zoom * 100)}%</span>
          <button
            type="button"
            title="Acercar"
            aria-label="Acercar"
            onClick={() => setZoomAtPoint(camera.zoom * CAMERA_ZOOM_STEP)}
          >
            <ZoomIn size={17} />
          </button>
          <button
            type="button"
            title="Encuadrar selección"
            aria-label="Encuadrar selección"
            onClick={frameSelection}
          >
            <Focus size={17} />
          </button>
          <button
            type="button"
            title="Restablecer cámara"
            aria-label="Restablecer cámara"
            onClick={resetCamera}
          >
            <Home size={17} />
          </button>
        </div>
      </div>

      <Stage
        width={BOARD_WIDTH}
        height={BOARD_HEIGHT}
        className={`game-stage${panEnabled ? ' game-stage--panning' : ''}`}
        x={camera.x}
        y={camera.y}
        scaleX={camera.zoom}
        scaleY={camera.zoom}
        draggable={panEnabled}
        onDragEnd={handleCameraDragEnd}
        onWheel={handleWheel}
        onMouseDown={handleStagePoint}
        onTouchStart={handleStagePoint}
      >
        <Layer
          ref={(node) => {
            layerRefs.current.map = node
          }}
          listening={false}
          visible={layerVisible('map')}
        >
          <Rect x={0} y={0} width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="#111713" />
          {mapImage ? (
            <KonvaImage
              image={mapImage}
              x={0}
              y={0}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              listening={false}
            />
          ) : (
            <>
              <Rect
                x={34}
                y={42}
                width={310}
                height={180}
                fill="#27332d"
                opacity={0.7}
                cornerRadius={8}
              />
              <Rect
                x={742}
                y={116}
                width={260}
                height={150}
                fill="#343b35"
                opacity={0.68}
                cornerRadius={8}
              />
              <Circle x={520} y={390} radius={118} fill="#5d4a2d" opacity={0.28} />
            </>
          )}
        </Layer>

        <Layer
          ref={(node) => {
            layerRefs.current.grid = node
          }}
          listening={false}
          visible={layerVisible('grid')}
        >
          {gridLines.map((line) => (
            <Line
              key={line.key}
              points={line.points}
              stroke="#d1d5db"
              strokeWidth={1}
              opacity={0.12}
            />
          ))}
        </Layer>

        <Layer
          ref={(node) => {
            layerRefs.current.tokens = node
          }}
          listening={!layerLocked('tokens')}
          visible={layerVisible('tokens')}
        >
          {scene.tokens.map((token) => {
            const position = toStagePosition(token)
            const selected = selectedTokenId === token.id

            return (
              <Group
                key={token.id}
                x={position.x}
                y={position.y}
                draggable={canMoveTokens && !panEnabled && !layerLocked('tokens')}
                onClick={() => selectToken(token.id)}
                onTap={() => selectToken(token.id)}
                onDragEnd={(event) => handleDragEnd(token, event)}
                opacity={token.visible ? 1 : 0.58}
              >
                <Circle
                  radius={position.radius + (selected ? 8 : 4)}
                  fill={selected ? '#f8fafc' : '#111827'}
                  opacity={selected ? 0.96 : 0.72}
                />
                <Circle
                  radius={position.radius}
                  fill={token.color}
                  stroke="#f8fafc"
                  strokeWidth={3}
                  dash={token.visible ? undefined : [7, 5]}
                />
                <Text
                  text={token.name.slice(0, 2).toUpperCase()}
                  x={-position.radius}
                  y={-8}
                  width={position.radius * 2}
                  align="center"
                  fill="#ffffff"
                  fontSize={14}
                  fontStyle="bold"
                />
                <Text
                  text={token.name}
                  x={-64}
                  y={position.radius + 10}
                  width={128}
                  align="center"
                  fill="#f8fafc"
                  fontSize={13}
                />
              </Group>
            )
          })}
        </Layer>

        {lighting.enabled ? (
          <Layer
            ref={(node) => {
              layerRefs.current.lighting = node
            }}
            listening={false}
            visible={layerVisible('lighting')}
          >
            <Group>
              <Rect
                x={0}
                y={0}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                fill="#020617"
                opacity={lightingOpacity}
              />
              {lightPolygons.map(({ source, points }) => (
                  <Line
                    key={`light-cutout-${source.id}`}
                    points={points}
                    closed
                    fill="#000000"
                    opacity={Math.max(0.18, source.intensity)}
                    globalCompositeOperation="destination-out"
                  />
                ))}
            </Group>
            {lightPolygons.map(({ source, origin, radius, points }) => (
                <Line
                  key={`light-glow-${source.id}`}
                  points={points}
                  closed
                  fillRadialGradientStartPoint={origin}
                  fillRadialGradientStartRadius={0}
                  fillRadialGradientEndPoint={origin}
                  fillRadialGradientEndRadius={radius}
                  fillRadialGradientColorStops={[
                    0,
                    source.color,
                    0.56,
                    source.color,
                    1,
                    'rgba(0,0,0,0)',
                  ]}
                  opacity={0.22 + source.intensity * 0.18}
                />
              ))}
            {role === 'dm'
              ? lightSources.map((source) => {
                  const light = toLightPosition(source)

                  return (
                    <Group key={`light-outline-${source.id}`}>
                      <Circle
                        x={light.x}
                        y={light.y}
                        radius={light.radius}
                        stroke={source.color}
                        strokeWidth={2}
                        dash={[8, 8]}
                        opacity={0.7}
                      />
                      <Text
                        text={source.name}
                        x={light.x - 72}
                        y={light.y - light.radius - 22}
                        width={144}
                        align="center"
                        fill="#f8fafc"
                        fontSize={12}
                      />
                    </Group>
                  )
                })
              : null}
          </Layer>
        ) : null}

        {vision.enabled ? (
          <Layer
            ref={(node) => {
              layerRefs.current.vision = node
            }}
            listening={role === 'dm' && !layerLocked('vision')}
            visible={layerVisible('vision')}
          >
            {role !== 'dm' ? (
              <Group>
                <Rect
                  x={0}
                  y={0}
                  width={BOARD_WIDTH}
                  height={BOARD_HEIGHT}
                  fill="#020617"
                  opacity={0.94}
                />
                {visionPolygons.map((polygon) => (
                  <Line
                    key={`vision-polygon-${polygon.tokenId}`}
                    points={polygon.points}
                    closed
                    fill="#000000"
                    globalCompositeOperation="destination-out"
                  />
                ))}
              </Group>
            ) : null}
            {role === 'dm'
              ? visionPolygons.map((polygon) => (
                    <Line
                      key={`vision-range-${polygon.tokenId}`}
                      points={polygon.points}
                      closed
                      stroke="#2dd4bf"
                      strokeWidth={1.5}
                      dash={[6, 6]}
                      opacity={0.5}
                    />
                  ))
              : null}
            {role === 'dm'
              ? vision.occluders.map((occluder) => (
                  <Group
                    key={`vision-guide-${occluder.id}`}
                    onClick={(event) =>
                      onSelectOccluder?.(
                        occluder.id,
                        event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey,
                      )
                    }
                    onTap={() => onSelectOccluder?.(occluder.id)}
                  >
                    <Line
                      points={toOccluderPoints(occluder)}
                      stroke={
                        occluder.kind === 'door'
                          ? occluder.open
                            ? '#4ade80'
                            : '#38bdf8'
                          : occluder.blocksSight
                            ? '#fb7185'
                            : '#facc15'
                      }
                      strokeWidth={
                        selectedOccluderIds.includes(occluder.id) ? 8 : 5
                      }
                      lineCap="round"
                      dash={occluder.kind === 'door' ? [12, 7] : undefined}
                      opacity={occluder.open ? 0.58 : 1}
                      shadowColor="#020617"
                      shadowBlur={4}
                      hitStrokeWidth={18}
                    />
                    <Text
                      text={`${occluder.name || 'Obstáculo'}${
                        occluder.kind === 'door'
                          ? occluder.open
                            ? ' · abierta'
                            : ' · cerrada'
                          : ''
                      }`}
                      x={((occluder.x1 + occluder.x2) / 2) * scale - 60}
                      y={((occluder.y1 + occluder.y2) / 2) * scale - 22}
                      width={120}
                      align="center"
                      fill="#ffffff"
                      fontSize={12}
                    />
                    {canEditVision &&
                    !layerLocked('vision') &&
                    selectedOccluderId === occluder.id ? (
                      <>
                        <Circle
                          x={occluder.x1 * scale}
                          y={occluder.y1 * scale}
                          radius={9}
                          fill="#f8fafc"
                          stroke="#0f172a"
                          strokeWidth={3}
                          draggable={!panEnabled}
                          onDragEnd={(event) =>
                            moveOccluderEndpoint(occluder, 'start', event)
                          }
                        />
                        <Circle
                          x={occluder.x2 * scale}
                          y={occluder.y2 * scale}
                          radius={9}
                          fill="#f8fafc"
                          stroke="#0f172a"
                          strokeWidth={3}
                          draggable={!panEnabled}
                          onDragEnd={(event) =>
                            moveOccluderEndpoint(occluder, 'end', event)
                          }
                        />
                        <Group
                          x={((occluder.x1 + occluder.x2) / 2) * scale}
                          y={((occluder.y1 + occluder.y2) / 2) * scale + 24}
                          onClick={(event) => {
                            event.cancelBubble = true
                            onDeleteOccluder?.(occluder.id)
                          }}
                          onTap={(event) => {
                            event.cancelBubble = true
                            onDeleteOccluder?.(occluder.id)
                          }}
                        >
                          <Circle
                            radius={12}
                            fill="#dc2626"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                          <Text
                            text="×"
                            x={-12}
                            y={-9}
                            width={24}
                            align="center"
                            fill="#ffffff"
                            fontSize={17}
                            fontStyle="bold"
                          />
                        </Group>
                      </>
                    ) : null}
                  </Group>
                ))
              : null}
            {role === 'dm' && pendingVisionPoint ? (
              <Circle
                x={pendingVisionPoint.x * scale}
                y={pendingVisionPoint.y * scale}
                radius={10}
                fill="#ffffff"
                stroke={visionEditMode === 'draw-door' ? '#38bdf8' : '#fb7185'}
                strokeWidth={4}
              />
            ) : null}
          </Layer>
        ) : null}

        {fog.enabled ? (
          <Layer
            ref={(node) => {
              layerRefs.current.fog = node
            }}
            listening={false}
            visible={layerVisible('fog')}
          >
            <Group>
              <Rect
                x={0}
                y={0}
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                fill="#020617"
                opacity={fogOpacity}
              />
              {fog.revealedAreas.map((area) => {
                const reveal = toRevealPosition(area)

                return (
                  <Circle
                    key={area.id}
                    x={reveal.x}
                    y={reveal.y}
                    radius={reveal.radius}
                    fill="#000000"
                    globalCompositeOperation="destination-out"
                  />
                )
              })}
            </Group>
            {role === 'dm'
              ? fog.revealedAreas.map((area) => {
                  const reveal = toRevealPosition(area)

                  return (
                    <Circle
                      key={`outline-${area.id}`}
                      x={reveal.x}
                      y={reveal.y}
                      radius={reveal.radius}
                      stroke="#2dd4bf"
                      strokeWidth={2}
                      dash={[10, 8]}
                      opacity={0.72}
                    />
                  )
                })
              : null}
          </Layer>
        ) : null}
      </Stage>
      <div className="minimap-shell" aria-label="Minimapa navegable">
        <Stage
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          className="minimap-stage"
          onMouseDown={handleMinimapPoint}
          onTouchStart={handleMinimapPoint}
        >
          <Layer listening={false}>
            {mapImage ? (
              <KonvaImage
                image={mapImage}
                x={minimapOffset.x}
                y={minimapOffset.y}
                width={scene.map.width * minimapScale}
                height={scene.map.height * minimapScale}
                opacity={0.78}
              />
            ) : (
              <Rect
                x={minimapOffset.x}
                y={minimapOffset.y}
                width={scene.map.width * minimapScale}
                height={scene.map.height * minimapScale}
                fill="#111827"
              />
            )}
            <Rect
              x={minimapOffset.x}
              y={minimapOffset.y}
              width={scene.map.width * minimapScale}
              height={scene.map.height * minimapScale}
              stroke="#64748b"
              strokeWidth={1}
            />
            {layerVisible('lighting')
              ? lightSources.map((source) => {
                  const token = source.tokenId
                    ? tokenById.get(source.tokenId)
                    : undefined
                  return (
                    <Circle
                      key={`minimap-light-${source.id}`}
                      x={minimapOffset.x + (token?.x ?? source.x) * minimapScale}
                      y={minimapOffset.y + (token?.y ?? source.y) * minimapScale}
                      radius={Math.max(2, source.radius * minimapScale)}
                      fill={source.color}
                      opacity={0.18}
                    />
                  )
                })
              : null}
            {layerVisible('vision')
              ? vision.occluders.map((occluder) => (
                  <Line
                    key={`minimap-occluder-${occluder.id}`}
                    points={[
                      minimapOffset.x + occluder.x1 * minimapScale,
                      minimapOffset.y + occluder.y1 * minimapScale,
                      minimapOffset.x + occluder.x2 * minimapScale,
                      minimapOffset.y + occluder.y2 * minimapScale,
                    ]}
                    stroke={occluder.kind === 'door' ? '#38bdf8' : '#fb7185'}
                    strokeWidth={2}
                    opacity={occluder.open ? 0.45 : 0.9}
                  />
                ))
              : null}
            {layerVisible('tokens')
              ? scene.tokens.map((token) => (
                  <Circle
                    key={`minimap-token-${token.id}`}
                    x={minimapOffset.x + token.x * minimapScale}
                    y={minimapOffset.y + token.y * minimapScale}
                    radius={4}
                    fill={token.color}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                ))
              : null}
            <Rect
              x={minimapViewport.x}
              y={minimapViewport.y}
              width={minimapViewport.width}
              height={minimapViewport.height}
              stroke="#2dd4bf"
              strokeWidth={2}
              fill="rgba(45, 212, 191, 0.08)"
            />
          </Layer>
          <Layer>
            <Rect
              x={0}
              y={0}
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              fill="rgba(0,0,0,0.001)"
            />
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

function clampCoordinate(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, value))
}
