# Implementación 2.0.0-alpha.8 - Transiciones de audio entre presets

## Objetivo

Permitir que el DM aplique presets de audio con corte inmediato, fade in o crossfade básico entre el mixer anterior y el preset nuevo.

## Alcance

- Campo `audioTransition` en `SceneExperienceState`.
- Opción `transition` en `AudioPresetApplyCommand`.
- Modos `cut`, `fade` y `crossfade`.
- Duración configurable desde el panel del DM.
- Render de cues anteriores durante crossfade.
- Ramp de volumen en cliente para cues entrantes y salientes.
- Smoke test validando transición y `previousMixer`.

## Fuera de alcance

- Crossfade sample-perfect con continuidad del mismo elemento `<audio>`.
- Cola de presets.
- Curvas avanzadas de easing.
- Limpieza persistente automática de transición expirada.

## Criterios de aceptación

- Aplicar con `cut` mantiene el comportamiento inmediato.
- Aplicar con `fade` inicia los cues nuevos desde volumen 0 hacia su volumen efectivo.
- Aplicar con `crossfade` conserva temporalmente el mixer anterior como `previousMixer`.
- Snapshots viejos sin `audioTransition` cargan sin cambios.
- Las transiciones no modifican mapa, tokens, combate ni narrativa.

## Notas de diseño

- El backend solo declara la transición y conserva el mixer anterior cuando hace falta.
- El cliente interpreta `startedAt` y `durationMs` para calcular el volumen.
- Si la transición ya expiró, el cliente deja de renderizar cues salientes aunque el snapshot aún conserve metadata.

## Estado

Completado en `2.0.0-alpha.8`.
