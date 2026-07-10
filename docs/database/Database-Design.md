# Diseño de Base de Datos

## Objetivo

Definir un modelo relacional inicial para campañas, mundos, escenas, mapas, tokens, personajes, NPCs, encuentros, tiradas, assets e IA. La implementación objetivo será PostgreSQL con Prisma.

## Convenciones

- IDs: `uuid`.
- Timestamps: `createdAt`, `updatedAt`.
- Borrado lógico solo donde sea útil para campañas y contenido creativo.
- Campos flexibles por sistema de reglas: `rulesData Json`.
- Campos secretos separados o marcados con visibilidad.
- Relaciones críticas con integridad referencial.

## ERD inicial

```mermaid
erDiagram
  User ||--o{ CampaignMember : joins
  Campaign ||--o{ CampaignMember : has
  World ||--o{ Campaign : contains
  Campaign ||--o{ GameSession : schedules
  Campaign ||--o{ PlayerCharacter : has
  Campaign ||--o{ NPC : has
  Campaign ||--o{ Encounter : has
  Campaign ||--o{ JournalEntry : has
  GameSession ||--o{ Scene : uses
  Scene ||--|| BattleMap : renders
  Scene ||--o{ GameToken : contains
  Encounter ||--o{ Combatant : includes
  GameToken ||--o| Combatant : represents
  User ||--o{ DiceRoll : rolls
  Campaign ||--o{ Asset : owns
  Campaign ||--o{ PromptRun : records
  Campaign ||--o{ AuditLog : records
```

## Entidades principales

### User

Representa una identidad local o autenticada.

- `id`
- `displayName`
- `email`
- `role`
- `createdAt`
- `updatedAt`

### World

Contenedor reusable de lore.

- `id`
- `name`
- `description`
- `systemTags`
- `createdAt`
- `updatedAt`

### Campaign

Campaña jugable.

- `id`
- `worldId`
- `name`
- `description`
- `ruleset`
- `status`
- `settings Json`
- `createdAt`
- `updatedAt`

### CampaignMember

Permisos por campaña.

- `id`
- `campaignId`
- `userId`
- `role`: `dm`, `player`, `viewer`
- `permissions Json`

### GameSession

Sesión de juego.

- `id`
- `campaignId`
- `title`
- `scheduledAt`
- `startedAt`
- `endedAt`
- `summaryPublic`
- `summaryPrivate`

### Scene

Escena jugable.

- `id`
- `sessionId`
- `campaignId`
- `battleMapId`
- `name`
- `narrativeText`
- `dmNotes`
- `isActive`
- `visibility`
- `sceneState Json`

### BattleMap

Mapa base.

- `id`
- `campaignId`
- `assetId`
- `name`
- `imageUrl`
- `gridSize`
- `width`
- `height`
- `scale`
- `metadata Json`

### GameToken

Representación visual en escena.

- `id`
- `sceneId`
- `entityType`: `player`, `enemy`, `npc`, `object`
- `entityId`
- `name`
- `x`
- `y`
- `size`
- `rotation`
- `color`
- `imageAssetId`
- `visible`
- `locked`
- `state Json`

### PlayerCharacter

Personaje jugador.

- `id`
- `campaignId`
- `ownerUserId`
- `name`
- `ancestry`
- `className`
- `level`
- `maxHp`
- `currentHp`
- `armorClass`
- `rulesData Json`

### NPC

Personaje no jugador narrativo.

- `id`
- `campaignId`
- `name`
- `role`
- `motivation`
- `voice`
- `publicNotes`
- `privateNotes`
- `secrets Json`
- `rulesData Json`

### Enemy

Criatura con estadísticas de combate.

- `id`
- `campaignId`
- `name`
- `creatureType`
- `maxHp`
- `currentHp`
- `armorClass`
- `challengeRating`
- `rulesData Json`

### Encounter

Encuentro de combate o reto estructurado.

- `id`
- `campaignId`
- `sceneId`
- `name`
- `status`
- `roundNumber`
- `activeCombatantId`
- `rulesData Json`

### Combatant

Participante de encuentro.

- `id`
- `encounterId`
- `tokenId`
- `entityType`
- `entityId`
- `initiative`
- `turnOrder`
- `conditions Json`
- `currentHp`
- `temporaryHp`

### DiceRoll

Tirada auditable.

- `id`
- `campaignId`
- `sessionId`
- `userId`
- `formula`
- `resultTotal`
- `breakdown Json`
- `visibility`
- `purpose`

### Asset

Archivo o recurso.

- `id`
- `campaignId`
- `type`: `map`, `token`, `portrait`, `music`, `sound`, `effect`
- `name`
- `url`
- `metadata Json`

### PromptRun

Registro de generación con IA.

- `id`
- `campaignId`
- `userId`
- `provider`
- `model`
- `purpose`
- `inputSummary`
- `outputSummary`
- `approved`
- `metadata Json`

### AuditLog

Registro de acciones relevantes.

- `id`
- `campaignId`
- `userId`
- `action`
- `entityType`
- `entityId`
- `before Json`
- `after Json`

## Índices iniciales

- `CampaignMember(campaignId, userId)`
- `Scene(campaignId, isActive)`
- `GameToken(sceneId)`
- `Encounter(sceneId, status)`
- `DiceRoll(campaignId, sessionId, createdAt)`
- `PromptRun(campaignId, createdAt)`
- `AuditLog(campaignId, createdAt)`

## Decisiones pendientes

- Autenticación local vs cuentas completas.
- Storage local vs S3-compatible.
- Estrategia exacta de snapshots de escena.
- Separación de `NPC` y `Enemy` o unificación futura como `Actor`.
- Normalización de reglas por sistema frente a `rulesData Json`.

## Implementación actual

La primera implementación vive en `prisma/schema.prisma` y usa PostgreSQL como destino formal. La migración inicial está en `prisma/migrations/20260707070000_initial_campaign_engine/migration.sql`.

El backend usa una capa de repositorio:

- Sin `DATABASE_URL`: repositorio en memoria para desarrollo local.
- Con `DATABASE_URL`: repositorio Prisma con adapter PostgreSQL.

Esta decisión permite seguir desarrollando el flujo realtime sin bloquear el proyecto por infraestructura local, mientras el contrato relacional ya queda definido.
