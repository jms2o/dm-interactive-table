# Map Engine

## Propósito

Gestionar mapas, capas, grid, tokens, coordenadas, medición, niebla de guerra e iluminación.

## Responsabilidades

- Cargar y describir mapas.
- Convertir coordenadas entre pantalla y mundo.
- Gestionar tokens de escena.
- Definir capas renderizables.
- Preparar medición de distancia y áreas.
- Exponer estado público filtrado.

## Modelo actual

`shared/types/map.ts` define:

- `id`
- `name`
- `imageUrl`
- `gridSize`
- `width`
- `height`

`shared/types/token.ts` define:

- tipo de token.
- posición `x`, `y`.
- tamaño, color y visibilidad.

## Capas propuestas

1. Background map.
2. Grid.
3. Terrain annotations.
4. Fog of war.
5. Lighting.
6. Tokens.
7. Effects.
8. Selection and measurement overlays.

## Eventos relevantes

- `game:state`
- `token:move`
- `scene:activate`
- `fog:update`
- `light:update`
- `effect:spawn`

## Casos borde

- Mapa sin imagen disponible.
- Token movido fuera de límites.
- Dos clientes intentan mover el mismo token.
- Cambio de escena durante arrastre.
- Display reconectado con mapa anterior cacheado.

## Criterios de aceptación para MVP

- Renderizar un mapa con grid.
- Renderizar tokens visibles.
- Mover tokens desde `/dm`.
- Sincronizar movimiento en `/display`.
- Ocultar tokens invisibles al display.

## Implementación actual de niebla

La fase `0.8.0` agrega niebla de guerra básica al estado de escena:

- `scene.experience.fogOfWar.enabled`.
- `scene.experience.fogOfWar.opacity`.
- `scene.experience.fogOfWar.revealedAreas`.

El DM controla la niebla desde `/dm`; `/display` y `/player` reciben solo el estado público y renderizan la máscara sobre el mapa.

## Implementación actual de iluminación

La fase `2.0.0-alpha.11` agrega iluminación dinámica básica:

- `scene.experience.lighting.enabled`.
- `scene.experience.lighting.globalDim`.
- `scene.experience.lighting.sources`.
- Fuentes vinculadas a `tokenId` siguen el movimiento del token.
- El display no recibe fuentes vinculadas a tokens ocultos.

La fase `2.0.0-alpha.12` agrega obstáculos y línea de visión básica:

- Segmentos definidos por dos puntos en coordenadas del mapa.
- Bloqueo independiente de visión e iluminación.
- Guías exclusivas del DM y sombras proyectadas en vistas públicas.
- Persistencia y transporte dentro del snapshot de escena.

La fase `2.0.0-alpha.13` reemplaza las sombras aproximadas por ray casting multipunto. El motor calcula intersecciones con todos los segmentos, limita la visión por distancia y combina los polígonos de los tokens jugadores en la máscara pública.

La fase `2.0.0-alpha.14` reutiliza el motor para iluminación: calcula un polígono por fuente contra los obstáculos `blocksLight`, manteniendo independientes las geometrías de visión y luz.

La fase `2.0.0-alpha.15` introduce puertas persistentes. Una puerta cerrada participa en las intersecciones según sus capacidades; una puerta abierta conserva su segmento, pero queda excluida del ray casting.

La fase `2.0.0-alpha.16` añade edición directa sobre Konva: herramientas de dibujo por dos puntos, selección de segmentos y manejadores arrastrables que actualizan coordenadas persistentes del mapa.

La fase `2.0.0-alpha.17` añade ajuste a cuadrícula, cadenas de dibujo continuo y mutaciones atómicas para duplicar o dividir obstáculos sin estados intermedios inconsistentes.

La fase `2.0.0-alpha.18` añade historial de edición en servidor, selección múltiple y mutaciones por lote para desplazar, cambiar capacidades o eliminar varios obstáculos como una sola acción.

La fase `2.0.0-alpha.19` añade una cámara local con pan, zoom focal, encuadre automático y transformaciones pantalla-mapa desacopladas del estado persistente.

La fase `2.0.0-alpha.20` organiza el render en capas locales reordenables y añade un minimapa navegable con resumen de entidades, obstáculos, iluminación y viewport.
