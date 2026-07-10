# Implementación 2.0.0-alpha.3 - Manifest de assets empaquetados

## Contexto

Documentos base:

- `docs/modules/Import-Export-Engine.md`
- `docs/modules/Audio-Lighting-Effects-Engine.md`
- `docs/modules/Map-Engine.md`
- `docs/implementation/phase-2.0-campaign-packages.md`
- `docs/implementation/phase-2.0-import-apply-copy.md`

## Objetivo

Incluir un manifest explícito de assets en los paquetes de campaña.

## Alcance

Incluido:

- Metadata de assets en `CampaignPackage`.
- Detección de mapa base desde la escena activa.
- Detección de swatches de tokens como assets visuales.
- Detección de cue de ambiente como asset de audio metadata.
- Validación de assets con IDs, tipos, nombres y referencias.
- UI que muestra conteo de assets exportados.
- Smoke test extendido.

No incluido todavía:

- Archivos binarios embebidos.
- Copia física a storage.
- Hash real de archivo local/remoto.
- Reproducción real de audio.
- Resolución de assets faltantes durante importación aplicada.

## Decisiones

- `assetMode: "metadata-only"` deja claro que el paquete no incluye blobs.
- Cada asset incluye `usage` para saber si se usa como mapa, token, audio o efecto.
- URLs existentes se preservan como referencia, pero no se descargan ni verifican en esta fase.

## Criterios de aceptación

- `npm run verify` pasa.
- El paquete exportado incluye `data.assets`.
- El manifest cuenta assets.
- Validación rechaza assets sin `id`, `type`, `name` o `usage`.
- Validación rechaza modos de asset no soportados y avisa conteos inconsistentes.
- `/dm` muestra el conteo de assets del paquete.
