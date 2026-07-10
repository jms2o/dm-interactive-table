# Implementación 0.5.0 - Dice Engine y Combat Engine

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/modules/Dice-Engine.md`
- `docs/modules/Combat-Engine.md`
- `docs/networking/SocketIO-Architecture.md`
- `docs/testing/Test-Plan.md`

## Objetivo

Crear los motores iniciales de dados y combate:

- Dice Engine con parser especializado.
- Tiradas auditables con fórmula, total, desglose y visibilidad.
- Combat Engine con encuentros, iniciativa, rondas y turnos.
- API HTTP para dados y encuentros.
- Eventos Socket.IO para sincronizar resultados.
- Controles básicos en `/dm` y lectura en `/display`.

## Alcance

Incluido:

- `shared/types/dice.ts`.
- `shared/types/combat.ts`.
- `server/src/modules/dice`.
- `server/src/modules/combat`.
- Rutas Express para dados y combate.
- Eventos `dice:roll`, `dice:rolled`, `encounter:start`, `encounter:update`, `turn:advance`.
- Panel básico en DM para tirar dados, crear encuentro desde tokens visibles y avanzar turno.
- Panel en display para ver última tirada pública y estado de combate público.

No incluido todavía:

- Reglas completas de D&D.
- Acciones, ataques, hechizos o automatización de daño.
- Persistencia completa de cada cambio de combate en PostgreSQL.
- Permisos/autenticación reales.
- Tiradas privadas por jugador.

## Decisiones

- El Dice Engine usa `@dice-roller/rpg-dice-roller` para no crear un parser artesanal.
- El Combat Engine acepta iniciativa manual y usa el orden descendente como regla neutral.
- El servidor conserva la autoridad del estado de combate.
- El display solo recibe tiradas y encuentros públicos.

## Criterios de aceptación

- `npm run build` pasa.
- `npm run lint --prefix client` pasa.
- `POST /api/campaigns/:campaignId/dice/roll` devuelve una tirada válida.
- `POST /api/campaigns/:campaignId/encounters` crea un encuentro activo.
- `turn:advance` avanza combatiente y ronda.
- El DM puede tirar dados desde `/dm`.
- El display puede ver tiradas públicas y turno actual.

