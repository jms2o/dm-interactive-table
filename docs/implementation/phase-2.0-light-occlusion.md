# Implementación 2.0.0-alpha.14 - Oclusión precisa de iluminación

## Objetivo

Impedir que la iluminación dinámica atraviese muros configurados con `blocksLight`, conservando la independencia entre obstrucción visual y luminosa.

## Diseño

Cada fuente luminosa obtiene un polígono mediante el mismo motor geométrico de visibilidad, con su posición como origen, su radio como alcance y únicamente los obstáculos que bloquean luz. Las fuentes vinculadas a tokens usan las coordenadas actuales del token.

El polígono cumple dos funciones en Konva:

- Recorta la capa de oscuridad con composición `destination-out`.
- Delimita el halo radial coloreado para impedir que atraviese el obstáculo.

Un segmento puede bloquear solo visión, solo luz, ambas o ninguna. El cálculo de visión usa `blocksSight`; el cálculo luminoso usa `blocksLight`.

## Pruebas

`scripts/vision-geometry-test.mjs` transpila el módulo TypeScript real y valida alcance, bloqueo completo e independencia entre ambos tipos de obstáculo. La prueba forma parte de `npm run verify` mediante `npm run test:vision`.

## Límites conocidos

El modelo aún no incluye penumbra, altura, puertas ni luz indirecta. Los bordes son geométricamente duros y adecuados para una primera implementación de mesa virtual.

Completado en `2.0.0-alpha.14`.
