# Import/Export Engine

## Propósito

Permitir que campañas, escenas y contenido de preparación puedan salir del runtime actual como paquetes portables y regresar al sistema con validación explícita.

## Responsabilidades

- Exportar una campaña como JSON versionado.
- Incluir mundo, campaña, sesiones, escena activa, tokens, NPCs, enemigos, PromptRuns y ruleset.
- Declarar metadata de compatibilidad.
- Validar paquetes antes de aplicar cambios.
- Reportar advertencias por ruleset desconocido, schema incompatible o contenido parcial.
- Preparar una ruta futura para importar con modo `apply`.

## Principios

- Exportar nunca debe modificar estado.
- Importar no debe aplicar cambios sin validación y confirmación explícita.
- El paquete debe poder sobrevivir cambios de versión mediante `schemaVersion`.
- El paquete debe ser legible por humanos para revisión y portafolio.
- Secrets y notas privadas pueden existir en export DM; más adelante habrá perfiles de exportación pública.

## Contrato mínimo

Un paquete contiene:

- `kind`: identificador del formato.
- `schemaVersion`.
- `packageId`.
- `appVersion`.
- `exportedAt`.
- `manifest`: resumen de campaña, conteos, ruleset y compatibilidad.
- `data`: mundo, campaña, sesiones, escena, NPCs, enemigos y PromptRuns.

## Criterios de aceptación para MVP

- Exportar `demo-campaign`.
- Validar un paquete exportado.
- Rechazar JSON sin formato esperado.
- Mostrar resumen de paquete en el panel DM.
- Cubrir export/validate en smoke test.

## Implementación actual

La fase `2.0.0-alpha.1` implementa:

- `shared/types/campaign-package.ts`.
- `server/src/modules/campaign-package`.
- `GET /api/campaigns/:campaignId/package/export`.
- `POST /api/campaign-packages/import`.

La importación actual es validación/preview. La aplicación real de paquetes queda para una fase posterior.

La fase `2.0.0-alpha.2` agrega `mode: "apply-copy"`:

- Crea una copia nueva de mundo/campaña/sesiones.
- Importa NPCs, enemigos y PromptRuns con IDs nuevos.
- Guarda snapshot de escena importada sin activar la mesa actual.
- Devuelve un reporte con recursos aplicados.

La fase `2.0.0-alpha.3` agrega manifest de assets:

- `data.assets` contiene mapas, swatches de token y cues de ambiente como metadata.
- `manifest.assetMode` declara `metadata-only`.
- `manifest.counts.assets` permite auditar portabilidad.
- La validación detecta assets incompletos antes de importar.

La fase `2.0.0-alpha.4` conecta Asset Storage:

- Assets registrados se exportan con `source: "asset-storage"`.
- Cada asset registrado conserva `storageAssetId`.
- `apply-copy` crea copias de assets en la campaña importada.
- El reporte aplicado incluye `appliedResources.assetIds`.

La fase `2.0.0-alpha.10` agrega auditoría fina de audio:

- `data.audioScenes` resume presets, cues y assets usados por audio.
- `manifest.counts.audioPresets` y `manifest.counts.audioCues` auditan la escena.
- Assets usados por mixer, presets y transición aparecen en `data.assets`.
- `apply-copy` remapea `assetId` dentro de ambiente, mixer, presets y transición.
