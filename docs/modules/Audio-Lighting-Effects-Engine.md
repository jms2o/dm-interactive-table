# Audio, Lighting and Effects Engine

## Propósito

Gestionar capas sensoriales de la mesa: ambiente sonoro, música, efectos visuales, animaciones, iluminación dinámica y niebla de guerra.

## Responsabilidades

- Asociar sonido ambiente a escenas.
- Disparar cues manuales desde el DM.
- Preparar efectos visuales sincronizados.
- Controlar niebla de guerra.
- Preparar iluminación por token o fuente.
- Exponer al display solo instrucciones públicas.

## Fases

### Fase inicial

- Metadata de assets.
- Cue de sonido o efecto por evento.
- Control manual desde DM.

### Fase intermedia

- Niebla de guerra editable.
- Reproducción de audio desde Asset Storage.
- Mixer por escena con volumen y playback por canal.
- Efectos visuales sobre mapa.
- Transiciones de escena.

### Fase avanzada

- Iluminación dinámica.
- Línea de visión.
- Animaciones de hechizos o impactos.
- Automatización ligada a combate.

## Criterios de aceptación para MVP

- Registrar asset de sonido o efecto.
- Disparar cue desde DM.
- Reproducir o representar cue en display.
- No bloquear mapa si un asset falla.

## Implementación actual

La fase `0.8.0` implementa la primera capa de experiencia de mesa con estado de escena en `Scene.experience`.

Contratos:

- Socket.IO: `fog:update`.
- Socket.IO: `fog:updated`.
- Socket.IO: `light:update`.
- Socket.IO: `light:updated`.
- Socket.IO: `asset:cue`.
- Socket.IO: `asset:cued`.
- Socket.IO: `audio:mixer:update`.
- Socket.IO: `audio:mixer:updated`.
- Socket.IO: `audio:preset:save`.
- Socket.IO: `audio:preset:apply`.
- Socket.IO: `audio:preset:manage`.
- Tipos compartidos: `shared/types/table-experience.ts`.

Capacidades actuales:

- Niebla de guerra básica con opacidad y áreas reveladas.
- Cue de ambiente como metadata sincronizada.
- Desde `2.0.0-alpha.5`, cues de música/sonido pueden incluir `assetUrl` y reproducirse con controles HTML en display/jugador.
- Desde `2.0.0-alpha.6`, `SceneExperienceState.audioMixer` controla canales `music`, `sound` y `effect`.
- Desde `2.0.0-alpha.7`, `SceneExperienceState.audioPresets` guarda y aplica escenas de audio desde el mixer.
- Desde `2.0.0-alpha.8`, `SceneExperienceState.audioTransition` declara fade y crossfade al aplicar presets.
- Desde `2.0.0-alpha.9`, los presets se pueden renombrar, borrar y reordenar.
- Desde `2.0.0-alpha.11`, `SceneExperienceState.lighting` controla oscuridad global y fuentes de luz manuales o vinculadas a tokens.
- Desde `2.0.0-alpha.14`, cada fuente genera un polígono limitado por alcance, mapa y obstáculos `blocksLight`; el recorte se aplica tanto a la oscuridad como al halo radial.
- Modo de display `standard` o `cinematic`.
- Nota pública para jugadores.

Colas, ducking automático, línea de visión, obstáculos de luz y animaciones de efectos quedan para fases posteriores.
