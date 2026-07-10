# Implementación 0.6.0 - Campaign Engine y NPC Engine

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/modules/Campaign-Engine.md`
- `docs/modules/NPC-Engine.md`
- `docs/database/Database-Design.md`
- `docs/modules/Map-Engine.md`

## Objetivo

Crear los motores iniciales de campañas y NPCs:

- Crear y listar mundos.
- Crear y listar campañas.
- Crear sesiones de campaña.
- Crear NPCs narrativos.
- Crear enemigos básicos.
- Convertir NPCs o enemigos en tokens de escena.
- Exponer API HTTP documentable.
- Agregar controles mínimos en el panel del DM.

## Alcance

Incluido:

- `shared/types/campaign.ts`.
- `shared/types/npc.ts`.
- `server/src/modules/campaign`.
- `server/src/modules/npc`.
- Rutas Express para mundos, campañas, sesiones, NPCs y enemigos.
- Conversión de NPC/enemigo a token usando el estado de escena actual.
- Panel DM para crear NPC/enemigo rápido y colocarlo en el mapa.

No incluido todavía:

- Persistencia PostgreSQL completa de NPCs/campañas.
- IA para generar NPCs.
- Facciones/localizaciones/timeline como CRUD formal.
- Permisos/autenticación reales.
- Cliente móvil de jugador.

## Decisiones

- Esta fase mantiene servicios en memoria para avanzar el dominio sin bloquearse por infraestructura.
- Los contratos ya están alineados con el modelo Prisma creado en `0.4.0`.
- La conversión a token usa el Core/Map state actual para que el display pueda ver entidades nuevas cuando sean visibles.
- IA queda preparada como fase posterior; en `0.6.0` la creación es manual.

## Criterios de aceptación

- `npm run build` pasa.
- `npm run lint --prefix client` pasa.
- `GET /api/campaigns` devuelve campañas.
- `POST /api/campaigns` crea una campaña.
- `POST /api/campaigns/:campaignId/npcs` crea NPC.
- `POST /api/campaigns/:campaignId/enemies` crea enemigo.
- `POST /api/campaigns/:campaignId/npcs/:npcId/token` crea token de escena.
- `/dm` permite crear NPC/enemigo y añadirlo al mapa.

