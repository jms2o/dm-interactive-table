# Implementación 2.0.0-alpha.20 - Capas y minimapa navegable

## Objetivo

Dar al DM control editorial sobre la composición del mapa y una vista general para navegar escenas mayores que el viewport principal.

## Capas locales

El workspace mantiene seis capas locales: mapa, cuadrícula, iluminación, tokens, obstáculos y niebla. Cada configuración declara visibilidad, bloqueo y orden.

- Visibilidad oculta la capa en el tablero principal.
- Bloqueo deshabilita interacciones de las capas editables; actualmente tokens y obstáculos.
- Orden reorganiza las capas Konva mediante `zIndex` sin recrear el contenido de escena.

Las preferencias son locales a cada cliente. No se persisten ni sincronizan, por lo que un DM puede ocultar guías editoriales sin cambiar la presentación de jugadores o display.

La configuración y el algoritmo de intercambio viven en `map-layers.ts`, separados del componente para facilitar pruebas y futuras capas.

## Minimapa

El minimapa representa:

- Extensión completa de la escena.
- Tokens visibles para el rol actual.
- Segmentos de obstáculos y estado aproximado de puertas.
- Radios de las fuentes de luz.
- Rectángulo del viewport principal.

Un clic o toque convierte el punto del minimapa a coordenadas del mapa y centra allí la cámara conservando el zoom actual. En móvil el minimapa pasa de overlay a bloque inferior para no cubrir controles o contenido.

## Corrección incluida

La separación de capas corrigió la capa de obstáculos para aceptar eventos del DM. Esto restablece selección directa, manejadores y eliminación desde el canvas cuando la capa no está bloqueada.

## Pruebas

- `npm run test:layers` valida intercambio, límites y unicidad del orden.
- `npm run test:camera` valida también el centrado solicitado desde el minimapa.
- Build y lint verifican refs Konva, controles y contratos React.

Completado en `2.0.0-alpha.20`.
