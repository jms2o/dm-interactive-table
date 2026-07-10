# Campaign Engine

## Propósito

Administrar mundos, campañas, sesiones, lore, escenas preparadas y continuidad narrativa.

## Responsabilidades

- Crear mundos y campañas.
- Definir sistema de reglas.
- Gestionar sesiones.
- Mantener notas públicas, privadas y secretas.
- Relacionar NPCs, lugares, facciones y eventos.
- Preparar contexto para IA.

## Entidades clave

- World.
- Campaign.
- GameSession.
- JournalEntry.
- Faction.
- Location.
- TimelineEvent.

## Criterios de aceptación para MVP

- Crear campaña.
- Listar campañas.
- Crear sesión.
- Asociar escena activa.
- Guardar resumen de sesión.

## Extensibilidad por sistema

Cada campaña debe declarar `ruleset`. El motor de campaña no debe asumir hojas, atributos o condiciones de D&D como estructura universal.

## Implementación actual

La fase `0.6.0` implementa el motor inicial en `server/src/modules/campaign`.

Contratos:

- HTTP: `GET /api/worlds`.
- HTTP: `POST /api/worlds`.
- HTTP: `GET /api/campaigns`.
- HTTP: `POST /api/campaigns`.
- HTTP: `GET /api/campaigns/:campaignId/sessions`.
- HTTP: `POST /api/campaigns/:campaignId/sessions`.
- Tipos compartidos: `shared/types/campaign.ts`.

El servicio actual es en memoria y está alineado con el modelo Prisma creado en la fase `0.4.0`.

Desde la fase `0.9.0`, `Campaign.ruleset` se resuelve mediante el Ruleset Engine. Si una campaña declara un ruleset desconocido, el backend usa `dnd5e` como fallback explícito y reporta `fallbackUsed`.
