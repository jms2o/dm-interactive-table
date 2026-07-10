# Implementación 0.3.0 - Frontend DM y display

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/design-system/Design-System.md`
- `docs/networking/SocketIO-Architecture.md`
- `docs/modules/Map-Engine.md`
- `docs/implementation/phase-0.2-backend-realtime.md`

## Objetivo

Reemplazar la plantilla de Vite por una primera experiencia real:

- Ruta `/dm` para control privado del Dungeon Master.
- Ruta `/display` para pantalla pública.
- Cliente Socket.IO conectado al backend.
- Render de escena con React-Konva.
- Tokens visibles en tablero.
- Movimiento de tokens desde `/dm`.
- Narrativa pública sincronizada.

## Alcance

Incluido:

- React Router.
- Hook de conexión realtime.
- Tablero compartido para DM y display.
- Inspector lateral básico.
- Editor de narrativa pública desde DM.
- Indicadores de conexión.

No incluido todavía:

- Autenticación.
- Persistencia.
- Assets reales de mapas.
- Cliente móvil `/player`.
- Niebla de guerra avanzada.
- Iluminación dinámica.

## Contratos

El cliente consume:

- `GameStatePayload`
- `TokenMoveCommand`
- `NarrativeUpdateCommand`

El backend emite:

- `game:state`
- `token:moved`
- `narrative:updated`

## Criterios de aceptación

- `npm run build` pasa.
- `/dm` renderiza tablero, tokens y panel de control.
- `/display` renderiza solo tokens públicos.
- Arrastrar un token en `/dm` emite `token:move`.
- Cambiar narrativa pública en `/dm` actualiza el estado compartido.

