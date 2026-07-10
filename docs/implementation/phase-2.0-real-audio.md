# Implementación 2.0.0-alpha.5 - Audio ambiental real

## Objetivo

Usar Asset Storage como fuente de verdad para reproducir audio ambiental real en `/display` y `/player`.

## Alcance

- Resolver `assetId` de `asset:cue` contra la biblioteca de assets.
- Publicar `assetUrl` en `SceneExperienceState.ambience.activeCue`.
- Agregar controles HTML de audio para display y jugador.
- Mantener fallback visual cuando el navegador bloquea autoplay o el asset falla.
- Incluir un asset WAV local de demo.
- Actualizar smoke test para validar URL de audio en el evento realtime.

## Fuera de alcance

- Mixer multipista.
- Crossfade entre temas.
- Subida de archivos desde el navegador.
- Efectos visuales sincronizados.
- Normalización de volumen por archivo.

## Decisiones

- El servidor valida que el asset exista, esté disponible y coincida con el tipo de cue.
- El cliente intenta reproducir con `<audio controls autoPlay>`, pero conserva controles manuales por restricciones de autoplay del navegador.
- Los assets locales se sirven desde `/assets`.
- `music` usa `loop` por defecto; `sound` no debe depender de loop.

## Criterios de aceptación

- `asset:cue` con asset registrado incluye `activeCue.assetUrl`.
- `/display` y `/player` renderizan un reproductor cuando existe `assetUrl`.
- El smoke test valida `assetId`, `assetUrl` y estado de ambiente.
- La demo local tiene un archivo WAV reproducible.
- `npm run verify` pasa.

## Estado de implementación

Completado en `2.0.0-alpha.5`.
