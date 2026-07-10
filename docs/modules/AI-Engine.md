# AI Engine

## Propósito

Proveer generación asistiva y auditable para campañas, NPCs, narrativa, encuentros, villanos, eventos, resúmenes y preparación.

## Principios

- La IA propone; el DM decide.
- Ninguna generación modifica estado persistente sin aprobación.
- Cada ejecución relevante queda registrada.
- El contexto enviado debe ser intencional y mínimo.
- El proveedor debe ser intercambiable.

## Casos de uso

- Generar NPC.
- Generar villano.
- Generar escena.
- Generar rumor.
- Resumir sesión.
- Proponer encuentro.
- Improvisar consecuencia narrativa.
- Convertir notas sueltas en estructura de campaña.

## Pipeline

1. Recibir intención del DM.
2. Seleccionar contexto permitido.
3. Construir prompt.
4. Ejecutar proveedor.
5. Validar forma de salida.
6. Guardar `PromptRun`.
7. Mostrar borrador editable.
8. Persistir solo si el DM aprueba.

## Riesgos

- Filtrar secretos a jugadores.
- Generar contenido contradictorio con canon de campaña.
- Guardar resultados sin revisión.
- Depender de un proveedor concreto.

## Criterios de aceptación para MVP

- Generar texto narrativo corto.
- Generar NPC estructurado.
- Guardar registro de prompt.
- Permitir aprobación manual antes de persistir.

## Implementación actual

La fase `0.7.0` implementa el primer motor asistivo en `server/src/modules/ai`.

Contratos:

- HTTP: `POST /api/campaigns/:campaignId/ai/generate`.
- HTTP: `GET /api/campaigns/:campaignId/ai/runs`.
- HTTP: `POST /api/campaigns/:campaignId/ai/runs/:promptRunId/approve`.
- Tipos compartidos: `shared/types/ai.ts`.

El proveedor actual es `local-draft`, un generador determinístico para validar producto, UI, contratos y auditoría sin depender todavía de credenciales externas.

La IA no persiste entidades de campaña en esta fase. Solo genera borradores estructurados, registra `PromptRun` en memoria y permite marcar la ejecución como aprobada o rechazada.
