# Implementación 0.7.0 - AI Engine asistivo

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/modules/AI-Engine.md`
- `docs/modules/Campaign-Engine.md`
- `docs/modules/NPC-Engine.md`
- `docs/api/openapi.yaml`

## Objetivo

Crear el primer AI Engine usable y auditable:

- Generar borradores estructurados para NPCs, escenas, villanos, eventos, resúmenes, encuentros y campañas.
- Registrar cada ejecución como `PromptRun`.
- Mantener aprobación manual antes de cualquier persistencia futura.
- Exponer API HTTP documentable.
- Agregar un control mínimo en el panel del DM para pedir borradores y revisarlos.

## Alcance

Incluido:

- `shared/types/ai.ts`.
- `server/src/modules/ai`.
- `server/src/routes/ai.routes.ts`.
- Proveedor local determinístico `local-draft`.
- Endpoints para generar, listar ejecuciones y aprobar/rechazar borradores.
- Panel DM con propósito, prompt, generación y aprobación.

No incluido todavía:

- Integración con proveedores externos.
- Persistencia PostgreSQL de `PromptRun`.
- Conversión automática de borradores aprobados en NPCs, escenas o encuentros.
- Selección granular de contexto de campaña.
- Moderación avanzada por mesa o campaña.

## Decisiones

- La primera versión usa un proveedor local para validar contratos, UI y flujo de revisión sin depender de credenciales.
- La IA no modifica el estado de juego: solo devuelve borradores y registra aprobación.
- Los borradores son JSON estructurado para facilitar edición y futura conversión a entidades reales.
- `PromptRun` vive en memoria durante esta fase, igual que otros servicios iniciales.

## Criterios de aceptación

- `npm run build` pasa.
- `npm run lint --prefix client` pasa.
- `npm run prisma:validate --prefix server` pasa.
- `POST /api/campaigns/:campaignId/ai/generate` devuelve un borrador y `promptRunId`.
- `GET /api/campaigns/:campaignId/ai/runs` lista ejecuciones.
- `POST /api/campaigns/:campaignId/ai/runs/:promptRunId/approve` marca una ejecución como aprobada o rechazada.
- `/dm` permite generar y aprobar borradores sin afectar la pantalla pública.
