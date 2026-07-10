# Implementación 2.0.0-alpha.6 - Mixer y escenas de audio

## Objetivo

Convertir el audio ambiental en un mixer sincronizado por escena, no sólo en un reproductor de cue único.

## Alcance

- Estado `audioMixer` en `SceneExperienceState`.
- Canales iniciales: `music`, `sound`, `effect`.
- Volumen maestro y volumen por canal.
- Estados de reproducción: `idle`, `playing`, `paused`, `stopped`.
- Evento Socket.IO `audio:mixer:update`.
- Controles DM para pausar, reanudar, detener, mutear y ajustar volumen.
- Render de canales activos en display y jugador.
- Smoke test para cue, pausa, volumen y stop.

## Fuera de alcance

- Crossfade.
- Cola de reproducción.
- Ducking automático durante narración o combate.
- Múltiples cues simultáneos dentro del mismo canal.
- Persistencia relacional específica del mixer.

## Decisiones

- `asset:cue` inicia o reemplaza el cue activo del canal correspondiente.
- `audio:mixer:update` modifica mixer sin cambiar mapas, tokens ni narrativa.
- `ambience.activeCue` se mantiene como compatibilidad/readout principal, pero el estado autoritativo de audio vive en `audioMixer`.
- El cliente ajusta el volumen real del elemento `<audio>` con `masterVolume * channel.volume * cue.volume`.

## Criterios de aceptación

- Un cue de música activa el canal `music` en estado `playing`.
- El DM puede pausar, reanudar, detener y mutear el canal.
- Display y jugador reflejan el estado del canal.
- `stop` limpia el cue activo del canal.
- `npm run verify` pasa.

## Estado de implementación

Completado en `2.0.0-alpha.6`.

