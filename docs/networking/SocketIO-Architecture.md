# Arquitectura de Red con Socket.IO

## Objetivo

Sincronizar estado de juego en tiempo real entre el panel del DM, la pantalla pública y clientes de jugadores.

## Principios

- El servidor valida y aplica cambios.
- Los clientes envían comandos, no mutaciones definitivas.
- El display recibe solo estado público.
- Los eventos tienen payload explícito y versionado.
- Las operaciones críticas usan acknowledgement.
- La reconexión debe recuperar snapshot.

## Rooms

| Room | Uso |
| --- | --- |
| `campaign:{campaignId}` | Eventos generales de campaña |
| `session:{sessionId}` | Estado de sesión activa |
| `scene:{sceneId}` | Mapa, tokens y narrativa |
| `dm:{campaignId}` | Información privada para DMs |
| `player:{userId}` | Eventos privados de jugador |
| `display:{sceneId}` | Proyección pública |

## Eventos iniciales del PDF guía

### `game:state`

Snapshot o actualización del estado visible.

```ts
type GameStatePayload = {
  version: 1;
  campaignId: string;
  sessionId?: string;
  sceneId?: string;
  scene?: PublicSceneState;
};
```

### `token:move`

Comando enviado por un cliente autorizado.

```ts
type TokenMoveCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  tokenId: string;
  position: { x: number; y: number };
  requestId: string;
};
```

Respuesta:

```ts
type TokenMoveAck = {
  ok: boolean;
  requestId: string;
  error?: string;
  token?: {
    id: string;
    x: number;
    y: number;
  };
};
```

Broadcast:

```ts
type TokenMovedEvent = {
  version: 1;
  sceneId: string;
  tokenId: string;
  x: number;
  y: number;
  movedBy: string;
  updatedAt: string;
};
```

### `narrative:update`

Actualiza texto narrativo público o privado.

```ts
type NarrativeUpdateCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  text: string;
  visibility: "public" | "dm";
  requestId: string;
};
```

## Eventos implementados y futuros

| Evento | Dirección | Descripción |
| --- | --- | --- |
| `scene:activate` | DM -> Server | Activar escena |
| `scene:changed` | Server -> Clients | Escena activa cambió |
| `dice:roll` | Client -> Server | Solicitar tirada |
| `dice:rolled` | Server -> Clients | Resultado según visibilidad |
| `encounter:start` | DM -> Server | Crear encuentro activo |
| `encounter:update` | Server -> Clients | Estado del encuentro |
| `turn:advance` | DM -> Server | Avanzar turno |
| `asset:cue` | DM -> Server | Disparar sonido o efecto |
| `audio:mixer:update` | DM -> Server | Ajustar mixer de audio |
| `audio:mixer:updated` | Server -> Clients | Estado de mixer actualizado |
| `audio:preset:save` | DM -> Server | Guardar preset de audio |
| `audio:preset:saved` | Server -> Clients | Preset de audio guardado |
| `audio:preset:apply` | DM -> Server | Aplicar preset de audio |
| `audio:preset:applied` | Server -> Clients | Preset de audio aplicado |
| `audio:preset:manage` | DM -> Server | Renombrar, borrar o mover preset |
| `audio:preset:managed` | Server -> Clients | Preset gestionado |
| `fog:update` | DM -> Server | Modificar niebla de guerra |
| `light:update` | DM -> Server | Configurar iluminación dinámica |
| `light:updated` | Server -> Clients | Iluminación actualizada |
| `presence:update` | Server -> Clients | Usuarios conectados |

### Eventos de experiencia de mesa implementados en 0.8.0

#### `fog:update`

Comando enviado por el DM para activar, ajustar o revelar niebla.

```ts
type FogUpdateCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  enabled?: boolean;
  opacity?: number;
  reveal?: { x: number; y: number; radius: number; label?: string };
  clearRevealed?: boolean;
  requestId: string;
};
```

Respuesta:

```ts
type FogUpdateAck = {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  error?: string;
};
```

Broadcast público:

```ts
type FogUpdatedEvent = {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  updatedBy: string;
  updatedAt: string;
};
```

#### `light:update`

Comando enviado por el DM para activar iluminación, ajustar oscuridad global o administrar fuentes.

```ts
type LightUpdateCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  action: "configure" | "upsert-source" | "remove-source" | "clear-sources";
  enabled?: boolean;
  globalDim?: number;
  source?: {
    id?: string;
    tokenId?: string;
    name: string;
    x: number;
    y: number;
    radius: number;
    intensity: number;
    color: string;
    visible?: boolean;
  };
  sourceId?: string;
  requestId: string;
};
```

Desde `2.0.0-alpha.11`, el servidor actualiza coordenadas de luces vinculadas cuando se mueve el token y filtra luces de tokens ocultos en snapshots públicos.

Desde `2.0.0-alpha.12`, `vision:update` permite al DM configurar, crear, modificar, eliminar y limpiar obstáculos. `vision:updated` distribuye el estado por rol; la vista pública conserva geometría y capacidades de bloqueo, pero omite los nombres privados de edición.

Desde `2.0.0-alpha.15`, la acción `set-occluder-open` alterna una puerta mediante `occluderId` y `open`. Solo el DM puede emitirla; el servidor valida que el obstáculo exista y sea de tipo `door` antes de persistir y publicar el cambio.

Desde `2.0.0-alpha.17`, `duplicate-occluder` acepta desplazamientos opcionales y `split-occluder` un punto de división opcional. El acuse incluye `affectedOccluders`; el evento público continúa distribuyendo el snapshot filtrado por rol.

Desde `2.0.0-alpha.18`, `undo`, `redo`, `batch-update` y `batch-remove` son acciones DM de `vision:update`. Los acuses y eventos incluyen `history`; únicamente el snapshot DM expone ese historial de edición.

#### `asset:cue`

Comando enviado por el DM para sincronizar ambiente, modo de display y handout público.

```ts
type AssetCueCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  cue: {
    assetId?: string;
    type: "music" | "sound" | "effect";
    name: string;
    mood?: "quiet" | "mystery" | "danger" | "combat" | "wonder";
    volume?: number;
    loop?: boolean;
  };
  displayMode?: "standard" | "cinematic";
  playerHandout?: string;
  requestId: string;
};
```

Desde `2.0.0-alpha.5`, si `assetId` apunta a un asset disponible, el servidor agrega `activeCue.assetUrl` al `SceneExperienceState` emitido en `asset:cued` y `game:state`.

#### `audio:mixer:update`

Comando enviado por el DM para controlar volumen maestro, volumen por canal, mute y playback.

```ts
type AudioMixerCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  action:
    | "pause"
    | "resume"
    | "stop"
    | "set-volume"
    | "mute"
    | "unmute"
    | "set-master-volume";
  channel?: "music" | "sound" | "effect";
  volume?: number;
  requestId: string;
};
```

Respuesta:

```ts
type AudioMixerAck = {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  error?: string;
};
```

Broadcast público:

```ts
type AudioMixerUpdatedEvent = {
  version: 1;
  sceneId: string;
  experience: SceneExperienceState;
  updatedBy: string;
  updatedAt: string;
};
```

Desde `2.0.0-alpha.6`, `asset:cue` activa el canal correspondiente en `SceneExperienceState.audioMixer.channels`.

#### `audio:preset:save`

Comando enviado por el DM para guardar el mixer actual como preset de escena.

```ts
type AudioPresetSaveCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  name: string;
  description?: string;
  requestId: string;
};
```

#### `audio:preset:apply`

Comando enviado por el DM para aplicar un preset guardado.

```ts
type AudioPresetApplyCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  presetId: string;
  transition?: {
    mode: "cut" | "fade" | "crossfade";
    durationMs?: number;
  };
  requestId: string;
};
```

Ambas operaciones responden con:

```ts
type AudioPresetAck = {
  ok: boolean;
  requestId: string;
  experience?: SceneExperienceState;
  preset?: AudioScenePreset;
  error?: string;
};
```

Desde `2.0.0-alpha.7`, aplicar un preset reinstancia los cues activos con nuevos IDs para reiniciar reproducción en clientes.

Desde `2.0.0-alpha.8`, `transition` permite corte inmediato, fade in o crossfade básico. En crossfade, el servidor incluye `experience.audioTransition.previousMixer` para que los clientes rendericen los cues salientes mientras dura la transición.

#### `audio:preset:manage`

Comando enviado por el DM para administrar presets guardados.

```ts
type AudioPresetManageCommand = {
  version: 1;
  campaignId: string;
  sceneId: string;
  presetId: string;
  action: "rename" | "delete" | "move";
  name?: string;
  direction?: "up" | "down";
  requestId: string;
};
```

Desde `2.0.0-alpha.9`, `rename` valida nombres únicos por escena, `delete` no detiene el mixer activo, y `move` conserva los IDs de presets mientras cambia su orden.

## Seguridad de payload

Desde `2.0.0-alpha.21`, el handshake exige `socket.handshake.auth.token`. El servidor verifica firma, expiración, rol, `campaignId` y `sessionId`; nunca toma el rol declarado por el navegador como autoridad. Solo después une el socket a rooms autorizadas.

## Session Workflow 2.0.0-alpha.22

- Cada socket entra también a `session:{sessionId}` y registra presencia efímera.
- `session:updated` anuncia cambios `preparation`, `live` o `ended`.
- Jugador y display reciben un `game:state` sin `scene` mientras la sesión no
  esté `live`.
- Los comandos de jugador se rechazan fuera de partida.
- El contexto real de escena se resuelve en servidor; `sceneId` del handshake no
  puede redirigir el socket a otra escena.

Eventos DM de historial:

| Evento | Payload adicional | Resultado |
| --- | --- | --- |
| `history:undo` | contrato base | restaura el estado anterior completo |
| `history:redo` | contrato base | reaplica el cambio deshecho |
| `history:snapshot:create` | `name` | guarda un punto durable |
| `history:snapshot:restore` | `snapshotId` | restaura y conserva undo |
| `history:snapshot:delete` | `snapshotId` | elimina el punto nombrado |

Todos incluyen `version`, `campaignId`, `sessionId` y `requestId`; usan la misma
idempotencia y autorización que el resto de comandos críticos.

Cada comando valida nuevamente que el `campaignId` del payload coincide con el principal. Los `requestId` se cachean por identidad y evento durante cinco minutos: un reintento recibe el mismo ack sin repetir la mutación. El servidor limita cada payload a 64 KiB y aplica un límite de eventos por ventana.

Antes de emitir al display:

- Remover `dmNotes`.
- Remover estadísticas ocultas.
- Remover secretos de NPCs.
- Remover tokens invisibles.
- Remover resultados de tiradas privadas.
- Transformar entidades completas a DTOs públicos.

## Reconexión

1. Cliente conecta con un token firmado.
2. Servidor deriva identidad, rol y campaña desde el token.
3. Cliente se une a rooms autorizados.
4. Cliente solicita `game:state`.
5. Servidor responde snapshot filtrado por rol.

## Errores

Formato base:

```ts
type RealtimeError = {
  code: string;
  message: string;
  requestId?: string;
  retryable: boolean;
};
```

## Criterios de aceptación

- Si el DM mueve un token, el display lo ve sin recargar.
- Si el display se reconecta, recupera la escena activa.
- Si un jugador intenta mover un token sin permisos, el servidor rechaza.
- Un socket anónimo o con rol/campaña falsificados no completa el handshake.
- Un comando reintentado con el mismo `requestId` solo se aplica una vez.
- Los datos privados no salen por eventos públicos.
- Cada evento documentado tiene tipo compartido antes de usarse en UI.
