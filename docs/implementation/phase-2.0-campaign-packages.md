# Implementación 2.0.0-alpha.1 - Paquetes de campaña

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/modules/Import-Export-Engine.md`
- `docs/modules/Campaign-Engine.md`
- `docs/modules/AI-Engine.md`
- `docs/modules/Ruleset-Engine.md`

## Objetivo

Crear la primera capacidad avanzada de portabilidad:

- Exportar una campaña en JSON versionado.
- Incluir snapshot jugable de la escena demo.
- Incluir NPCs, enemigos y PromptRuns.
- Validar paquetes importados antes de aplicar cambios.
- Mostrar export/validate en el panel DM.

## Alcance

Incluido:

- Contratos compartidos para `CampaignPackage`.
- Servicio de exportación e importación en modo validación.
- Endpoints HTTP de export/import.
- Panel DM para descargar paquete y validar JSON pegado.
- Smoke test extendido.

No incluido todavía:

- Importación con escritura real en memoria o PostgreSQL.
- Resolución de conflictos entre paquetes y campañas existentes.
- Paquetes públicos sin secretos.
- Empaquetado binario de assets.
- Versionado migratorio entre schemas.

## Decisiones

- `schemaVersion: 1` inicia el formato portable.
- La exportación actual se considera DM/private export.
- `POST /api/campaign-packages/import` opera en modo `validate` por defecto.
- La UI permite descargar JSON y validar texto pegado para mantener el flujo simple y verificable.

## Criterios de aceptación

- `npm run verify` pasa.
- `GET /api/campaigns/demo-campaign/package/export` devuelve paquete versionado.
- `POST /api/campaign-packages/import` valida un paquete exportado.
- `/dm` permite exportar y validar paquete.
