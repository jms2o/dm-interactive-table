# NPC Engine

## Propósito

Gestionar NPCs, enemigos, perfiles narrativos y su relación con campañas, escenas, tokens e IA.

## Responsabilidades

- Crear NPCs con datos públicos y secretos.
- Crear enemigos con estadísticas de combate.
- Vincular NPCs/enemigos a tokens.
- Guardar vínculos con facciones, lugares y sesiones.
- Solicitar sugerencias al AI Engine.

## Campos narrativos recomendados

- Nombre.
- Rol en la campaña.
- Motivación.
- Miedo o presión.
- Voz o forma de hablar.
- Relación con personajes.
- Secreto.
- Estado actual.

## Visibilidad

El NPC puede tener:

- Perfil público.
- Notas privadas del DM.
- Secretos nunca enviados a jugadores.
- Datos de combate visibles solo cuando el DM los revele.

## Criterios de aceptación para MVP

- Crear NPC manualmente.
- Crear enemigo básico.
- Convertir NPC/enemigo en token.
- Generar borrador con IA y aprobarlo antes de guardar.

## Implementación actual

La fase `0.6.0` implementa el motor inicial en `server/src/modules/npc`.
La fase `0.7.0` agrega generación asistiva de borradores desde `server/src/modules/ai`.

Contratos:

- HTTP: `GET /api/campaigns/:campaignId/npcs`.
- HTTP: `POST /api/campaigns/:campaignId/npcs`.
- HTTP: `POST /api/campaigns/:campaignId/npcs/:npcId/token`.
- HTTP: `GET /api/campaigns/:campaignId/enemies`.
- HTTP: `POST /api/campaigns/:campaignId/enemies`.
- HTTP: `POST /api/campaigns/:campaignId/enemies/:enemyId/token`.
- HTTP: `POST /api/campaigns/:campaignId/ai/generate` con `purpose: "npc"`.
- Tipos compartidos: `shared/types/npc.ts`.
- Tipos compartidos de IA: `shared/types/ai.ts`.

El borrador generado por IA requiere aprobación manual. La conversión automática del borrador aprobado a un NPC persistente queda fuera de esta fase.
