# Combat Engine

## Propósito

Administrar encuentros, iniciativa, rondas, turnos, daño, curación y condiciones.

## Responsabilidades

- Crear encuentros desde escena y tokens.
- Calcular o registrar iniciativa.
- Mantener orden de turnos.
- Avanzar rondas.
- Aplicar daño, curación y condiciones.
- Exponer estado público y privado.

## Separación de reglas

El núcleo de combate no debe asumir reglas fijas de D&D. Debe delegar detalles a un adaptador de ruleset:

- cálculo de iniciativa.
- tipos de acciones.
- condiciones disponibles.
- reglas de muerte o inconsciencia.
- descansos o recuperación.

## Estado mínimo de encuentro

- `id`
- `sceneId`
- `status`
- `roundNumber`
- `activeCombatantId`
- `combatants[]`

## Eventos relevantes

- `encounter:start`
- `encounter:update`
- `encounter:end`
- `combatant:damage`
- `combatant:condition:add`
- `turn:advance`

## Criterios de aceptación para MVP

- Crear encuentro con combatientes seleccionados.
- Registrar iniciativa manual.
- Ordenar turnos.
- Avanzar turno.
- Mostrar estado público reducido en display.

## Implementación actual

La fase `0.5.0` implementa el motor en `server/src/modules/combat`.

Contratos:

- HTTP: `POST /api/campaigns/:campaignId/encounters`.
- HTTP: `GET /api/campaigns/:campaignId/encounters/active?sceneId=...`.
- HTTP: `POST /api/campaigns/:campaignId/encounters/:encounterId/turn/advance`.
- Socket.IO: `encounter:start`, `encounter:update` y `turn:advance`.
- Tipos compartidos: `shared/types/combat.ts`.

Desde la fase `0.9.0`, cada encuentro registra `rulesetId` y valida condiciones contra el Ruleset Engine activo para la campaña. El orden de iniciativa sigue siendo descendente y neutral, pero las condiciones ya vienen del adaptador.
