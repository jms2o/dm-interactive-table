# Diagramas UML y Secuencias

Estos diagramas son base inicial. Deben actualizarse cuando cambien contratos o modelos.

## Casos de uso

```mermaid
flowchart LR
  DM((Dungeon Master))
  Player((Jugador))
  Display((Pantalla pública))

  DM --> UC1[Crear campaña]
  DM --> UC2[Preparar escena]
  DM --> UC3[Mover tokens]
  DM --> UC4[Dirigir combate]
  DM --> UC5[Generar ayuda con IA]
  Player --> UC6[Tirar dados]
  Player --> UC7[Consultar personaje]
  Display --> UC8[Mostrar escena pública]
```

## Clases de dominio iniciales

```mermaid
classDiagram
  class Campaign {
    id
    name
    ruleset
    status
  }
  class GameSession {
    id
    title
    startedAt
  }
  class Scene {
    id
    name
    narrativeText
    isActive
  }
  class BattleMap {
    id
    imageUrl
    gridSize
    width
    height
  }
  class GameToken {
    id
    name
    type
    x
    y
    visible
  }
  class Encounter {
    id
    status
    roundNumber
  }
  class Combatant {
    id
    initiative
    currentHp
  }

  Campaign "1" --> "*" GameSession
  GameSession "1" --> "*" Scene
  Scene "1" --> "1" BattleMap
  Scene "1" --> "*" GameToken
  Scene "1" --> "*" Encounter
  Encounter "1" --> "*" Combatant
  GameToken "0..1" --> "0..1" Combatant
```

## Secuencia: mover token

```mermaid
sequenceDiagram
  participant DM
  participant ClientStore
  participant Socket
  participant Server
  participant DB
  participant Display

  DM->>ClientStore: drag token
  ClientStore->>Socket: emit token:move
  Socket->>Server: command payload
  Server->>Server: validate permissions and scene
  Server->>DB: persist position
  Server-->>Socket: ack success
  Socket-->>Display: token:moved
  Display->>Display: render new position
```

## Secuencia: generar NPC con IA

```mermaid
sequenceDiagram
  participant DM
  participant API
  participant AIEngine
  participant Provider
  participant DB

  DM->>API: request NPC suggestion
  API->>AIEngine: build prompt with campaign context
  AIEngine->>Provider: generate
  Provider-->>AIEngine: draft result
  AIEngine->>DB: save PromptRun
  AIEngine-->>API: draft
  API-->>DM: editable suggestion
  DM->>API: approve and save
```

## Secuencia: iniciar combate

```mermaid
sequenceDiagram
  participant DM
  participant API
  participant Combat
  participant Socket
  participant Display

  DM->>API: create encounter
  API->>Combat: initialize combatants
  Combat-->>API: encounter state
  API->>Socket: broadcast encounter:started
  Socket-->>Display: public combat state
```

