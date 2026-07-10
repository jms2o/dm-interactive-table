# Implementación 2.0.0-alpha.10 - Export/import fino de audio

## Objetivo

Hacer que los paquetes de campaña auditen y transporten explícitamente presets, cues y escenas de audio, incluyendo remapeo de assets al aplicar una copia.

## Alcance

- Manifest de audio dentro de `CampaignPackage.data.audioScenes`.
- Nuevos conteos `audioPresets` y `audioCues`.
- Inclusión de referencias de assets usadas por mixer, presets y transición.
- Validación de conteos de audio durante importación.
- Remapeo profundo de `assetId` en `ambience`, `audioMixer`, `audioPresets` y `audioTransition.previousMixer`.
- Smoke test exportando después de crear presets reales por Socket.IO.

## Fuera de alcance

- Embebido binario de audio.
- Exportación parcial de presets individuales.
- Selector visual para excluir presets del paquete.
- Activar automáticamente la escena importada.

## Criterios de aceptación

- El paquete exportado declara `data.audioScenes`.
- `manifest.counts.audioPresets` coincide con los presets exportados.
- Los assets usados por presets aparecen en `data.assets`.
- `apply-copy` remapea asset IDs dentro de presets y mixer.
- Paquetes antiguos sin `audioScenes` siguen siendo importables con advertencia o tolerancia.

## Estado

Completado en `2.0.0-alpha.10`.
