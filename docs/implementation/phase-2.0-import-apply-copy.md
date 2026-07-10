# Implementación 2.0.0-alpha.2 - Importación aplicada segura

## Contexto

Documentos base:

- `docs/modules/Import-Export-Engine.md`
- `docs/implementation/phase-2.0-campaign-packages.md`
- `docs/database/Database-Design.md`
- `docs/testing/Test-Plan.md`

## Objetivo

Permitir que un paquete validado cree una copia nueva de campaña sin sobrescribir contenido existente.

## Alcance

Incluido:

- Modo `apply-copy` en `POST /api/campaign-packages/import`.
- Remapeo de IDs para mundo, campaña, sesiones, escena, NPCs, enemigos y PromptRuns.
- Guardado del snapshot de escena importada en persistencia.
- Reporte de recursos aplicados.
- UI en `/dm` para aplicar paquete como copia nueva.
- Smoke test extendido.

No incluido todavía:

- `overwrite`.
- `merge`.
- Activar automáticamente una campaña importada en el runtime principal.
- Resolución visual de conflictos.
- Importación de assets binarios.

## Decisiones

- `apply-copy` nunca reutiliza IDs del paquete.
- El nombre de la campaña importada recibe sufijo `(Importada)`.
- La escena importada se guarda, pero no se activa como escena actual para evitar romper la mesa en vivo.
- PromptRuns importados mantienen proveedor/modelo/purpose/draft, pero reciben IDs y campaignId nuevos.

## Criterios de aceptación

- `npm run verify` pasa.
- Un paquete exportado puede validarse.
- Ese paquete puede aplicarse con `mode: "apply-copy"`.
- El reporte devuelve `applied: true` e IDs nuevos.
- `GET /api/campaigns` lista la campaña importada.
