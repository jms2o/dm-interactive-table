# Implementación 2.0.0-alpha.15 - Puertas y obstáculos interactivos

## Objetivo

Representar puertas como obstáculos persistentes que pueden abrirse o cerrarse durante la partida sin eliminar ni reconstruir su geometría.

## Modelo

Cada `VisionOccluder` declara `kind` (`wall` o `door`) y `open`. Los datos históricos que no contienen estos campos se normalizan como muros cerrados, preservando compatibilidad con escenas y paquetes anteriores.

Una puerta cerrada aplica sus capacidades `blocksSight` y `blocksLight`. Una puerta abierta permanece en la escena y en la interfaz del DM, pero el motor geométrico la excluye de todos los cálculos de intersección.

## Tiempo real

La acción `set-occluder-open` de `vision:update` cambia el estado de una puerta existente. El servidor rechaza identificadores inexistentes y evita aplicar la acción a muros. El evento `vision:updated` y los snapshots por rol distribuyen inmediatamente el resultado.

## Interfaz

- El editor permite elegir muro o puerta y su estado inicial.
- La lista indica si cada puerta está abierta o cerrada.
- El DM puede alternar una puerta seleccionada con un comando dedicado.
- Las puertas cerradas se dibujan en azul; las abiertas, en verde discontinuo y con menor opacidad.

## Pruebas

La prueba geométrica confirma que una puerta abierta no intercepta rayos. El smoke test abre una puerta mediante Socket.IO y verifica que el estado llega a la vista pública.

Completado en `2.0.0-alpha.15`.
