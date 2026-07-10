# Implementación 2.0.0-alpha.18 - Historial y edición por lotes

## Objetivo

Permitir correcciones seguras y operaciones coordinadas sobre varios obstáculos durante la construcción de mapas.

## Historial autoritativo

El servidor mantiene pilas de undo y redo con un máximo de 50 estados de `VisionState`. Toda mutación normal conserva el estado anterior y vacía redo. `undo` y `redo` intercambian snapshots completos, persisten la escena restaurada y publican `vision:updated` a todos los roles.

El acuse y el evento incluyen `VisionHistoryState` con `canUndo` y `canRedo`. Los snapshots DM también incluyen este estado para reconstruir correctamente los controles después de una reconexión; los snapshots públicos lo omiten.

El historial es transitorio de la sesión del servidor. No forma parte del paquete exportado porque representa acciones de edición, no contenido de campaña.

## Selección múltiple

El DM selecciona segmentos adicionales con Shift, Ctrl o Cmd. Todos los seleccionados reciben un trazo más ancho, mientras el último seleccionado conserva los manejadores de edición individual.

## Operaciones por lote

- Desplazamiento de toda la selección por una celda en cuatro direcciones.
- Activación o desactivación conjunta de bloqueo de visión.
- Activación o desactivación conjunta de bloqueo de luz.
- Eliminación atómica de la selección.

`batch-update` y `batch-remove` validan identificadores, mutan una sola vez, persisten un único snapshot y devuelven `affectedOccluders`.

## Pruebas

El smoke test modifica dos segmentos por lote, valida el evento público, deshace, rehace y elimina ambos en una operación. Build y lint cubren contratos y controles del cliente.

Completado en `2.0.0-alpha.18`.
