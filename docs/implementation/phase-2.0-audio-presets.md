# Implementación 2.0.0-alpha.7 - Presets de audio por escena

## Objetivo

Permitir que el DM guarde una combinación de mixer y cues activos como preset de escena, y que pueda aplicarla después con una sola acción sincronizada por Socket.IO.

## Alcance

- Estado `audioPresets` en `SceneExperienceState`.
- Guardar preset desde el estado actual de `audioMixer`.
- Aplicar preset restaurando volumen maestro, canales, mute y cues activos.
- Reinstanciar cues al aplicar preset para que display/jugador reinicien la reproducción.
- Eventos Socket.IO `audio:preset:save`, `audio:preset:saved`, `audio:preset:apply` y `audio:preset:applied`.
- Controles DM para nombrar, guardar y aplicar presets.
- Smoke test cubriendo guardado y aplicación después de detener un cue.

## Fuera de alcance

- Biblioteca global de presets compartida entre campañas.
- Crossfade entre presets.
- Ordenamiento manual o borrado de presets.
- Persistencia de presets como recurso HTTP separado.

## Criterios de aceptación

- Un snapshot viejo sin `audioPresets` carga con lista vacía.
- El DM puede guardar el mixer actual con nombre.
- El DM puede aplicar un preset existente.
- Al aplicar, los clientes reciben estado con cues activos y IDs nuevos.
- La acción no modifica mapa, tokens, combate ni narrativa.

## Notas de diseño

- `audioMixer` sigue siendo el estado autoritativo de reproducción.
- `audioPresets` almacena copias normalizadas del mixer y sus cues.
- `ambience.activeCue` se mantiene como compatibilidad y readout principal, apuntando al primer cue activo aplicado.

## Estado

Completado en `2.0.0-alpha.7`.
