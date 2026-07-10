# Implementación 2.0.0-alpha.12 - Línea de visión y obstáculos

## Objetivo

Incorporar obstáculos persistentes que permitan al DM definir muros y límites capaces de bloquear visión o iluminación en una escena.

## Modelo

`SceneExperienceState.vision` contiene el estado habilitado y una colección de segmentos. Cada segmento almacena dos extremos en coordenadas del mapa y dos capacidades independientes: `blocksSight` y `blocksLight`.

## Sincronización

El DM administra segmentos mediante `vision:update`. El servidor valida, normaliza y persiste el cambio, emite `vision:updated` y publica snapshots específicos por rol. Los nombres de edición se eliminan de la representación pública, pero la geometría necesaria para calcular la obstrucción permanece disponible.

## Representación inicial

- El DM ve líneas de guía y nombres de obstáculos.
- Jugadores y display ven sombras proyectadas desde el token jugador de referencia.
- Las coordenadas se conservan en unidades del mapa y se escalan al tablero Konva.
- Los segmentos forman parte del paquete exportable de campaña al estar incluidos en el snapshot de escena.

## Límites conocidos

Esta fase usa una fuente de visión principal y proyección geométrica básica. Los polígonos por token y las intersecciones múltiples se incorporaron en `2.0.0-alpha.13`; la oclusión específica de cada fuente luminosa permanece pendiente.

Completado en `2.0.0-alpha.12`.
