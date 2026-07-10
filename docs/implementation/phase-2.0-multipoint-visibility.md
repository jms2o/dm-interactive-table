# Implementación 2.0.0-alpha.13 - Visibilidad multipunto

## Objetivo

Sustituir la proyección aproximada de sombras por polígonos de visibilidad geométricos para todos los personajes jugadores presentes en la escena.

## Algoritmo

Cada token jugador actúa como fuente de visión. El cliente lanza rayos uniformes alrededor de la fuente y rayos adicionales a ambos lados de cada extremo de muro. Para cada dirección conserva la intersección más cercana entre el alcance configurado, los obstáculos y los límites del mapa.

Los puntos resultantes se ordenan por ángulo y forman un polígono. La vista pública recorta la máscara de oscuridad con todos los polígonos, produciendo una unión de visión compartida para el grupo. El DM ve sus contornos como guías de diagnóstico.

## Decisiones

- El cálculo se mantiene en un módulo puro y separado de React/Konva.
- Se usan 96 rayos base para conservar un límite de alcance visualmente circular.
- Los extremos de obstáculos reciben tres rayos con una desviación mínima para evitar huecos en las esquinas.
- `VisionState.defaultRange` configura el alcance compartido y se normaliza contra el tamaño del mapa.

## Límites conocidos

La fase calcula visión compartida de todos los tokens de tipo `player`. Aún no asigna propiedad de token por usuario ni rangos individuales derivados del sistema de reglas. La oclusión de cada fuente de luz se incorporó posteriormente en `2.0.0-alpha.14`.

Completado en `2.0.0-alpha.13`.
