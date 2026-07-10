# Implementación 2.0.0-alpha.19 - Cámara avanzada del mapa

## Objetivo

Permitir inspeccionar y editar mapas grandes con zoom y desplazamiento sin alterar las coordenadas persistidas de tokens, luces u obstáculos.

## Estado local

Cada cliente mantiene una cámara local `{ x, y, zoom }`. La cámara no forma parte de la escena ni se sincroniza: DM, jugadores y display pueden encuadrar el mapa de manera independiente sin generar tráfico o persistencia.

El zoom se limita entre 50% y 300%. La rueda y los botones acercan alrededor del cursor o del centro del viewport, conservando el punto de escena situado bajo el foco.

## Controles

- Activar o desactivar desplazamiento del mapa.
- Alejar y acercar por pasos multiplicativos.
- Encuadrar los obstáculos seleccionados.
- Restablecer el mapa completo a su encuadre inicial.
- Mostrar el porcentaje de zoom actual.

Durante el desplazamiento se deshabilita temporalmente el arrastre de tokens y manejadores para evitar acciones ambiguas.

## Coordenadas

`map-camera.ts` concentra las transformaciones puras:

- `screenToMap` invierte posición, zoom y escala base.
- `zoomCameraAtPoint` conserva el punto focal al cambiar zoom.
- `frameMapBounds` calcula escala y posición para centrar límites con padding.

Las herramientas visuales usan estas conversiones antes del ajuste a cuadrícula, por lo que siempre envían unidades reales del mapa al servidor.

## Pruebas

`scripts/camera-geometry-test.mjs` valida inversión de coordenadas, invariancia del punto focal, límites de zoom y centrado del encuadre. Forma parte de `npm run verify` como `npm run test:camera`.

Completado en `2.0.0-alpha.19`.
