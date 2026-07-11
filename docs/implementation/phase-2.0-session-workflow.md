# Implementacion 2.0.0-alpha.22 - Session Workflow

## Objetivo

Convertir el tablero persistente en una sesion de juego dirigida: el DM elige
campana, prepara una sesion, abre la partida, recibe jugadores en un lobby y
cierra la sesion sin perder el estado ni el historial.

## Contratos

- `shared/types/session-workflow.ts`: fases, lobby, presencia, hoja de jugador
  e historial global.
- `POST /api/auth/context`: reemite una sesion DM limitada a una campana y una
  sesion verificadas.
- `GET /api/campaigns/:campaignId/workflow`: devuelve sesiones y presencia.
- `POST /api/campaigns/:campaignId/workflow/sessions/:sessionId/*`: inicia,
  cierra o devuelve una sesion a preparacion.
- `GET|PATCH /api/campaigns/:campaignId/workflow/character-sheet`: consulta y
  actualiza la hoja del jugador autenticado.
- `history:*`: comandos Socket.IO para undo, redo y snapshots nombrados.

## Modelo de estado

1. `preparation`: el DM puede editar el tablero; jugadores y displays esperan
   en el lobby y no reciben la escena.
2. `live`: el tablero se sincroniza con todos los clientes autorizados.
3. `ended`: se conserva el ultimo estado, se bloquean comandos de jugador y se
   muestra el resumen de cierre.

Solo puede existir una sesion `live` por instancia. Cambiar de campana activa
un snapshot de escena propio para la sesion seleccionada.

## Historial

- Cada mutacion del tablero guarda el estado previo en una pila limitada a 50.
- Una accion nueva limpia la pila de redo.
- Los snapshots nombrados incluyen escena, notas DM y contexto de sesion.
- Restaurar un snapshot tambien es reversible mediante undo.
- El fallback local usa JSON atomico; PostgreSQL usa `GameSnapshot`.

## Seguridad

- El contexto solicitado nunca se toma directamente del navegador: se valida
  contra el principal DM y la existencia de campana/sesion.
- La fase de sesion se comprueba en HTTP y Socket.IO.
- Un jugador solo puede modificar su propia hoja.
- Los snapshots y el ciclo de sesion requieren rol DM.

## Pruebas de aceptacion

- El catalogo y las fases sobreviven una recarga del repositorio local.
- No se pueden iniciar dos sesiones simultaneas.
- Un jugador en preparacion no recibe la escena.
- Undo/redo restaura una mutacion completa y un snapshot nombrado sobrevive un
  reinicio.
- La hoja de jugador persiste cambios y queda aislada por participante.
- E2E DM -> lobby -> partida -> jugador -> snapshot -> cierre.
