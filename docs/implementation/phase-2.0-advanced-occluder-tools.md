# Implementación 2.0.0-alpha.17 - Herramientas avanzadas de obstáculos

## Objetivo

Acelerar la construcción de mapas complejos mediante ajuste a cuadrícula, cadenas continuas y operaciones estructurales sobre segmentos existentes.

## Dibujo asistido

- El ajuste a cuadrícula redondea ambos puntos al `gridSize` real del mapa y limita el resultado a sus dimensiones.
- El dibujo continuo conserva el extremo final como inicio del siguiente segmento.
- Cambiar de herramienta cancela cualquier cadena pendiente.

Estas opciones son preferencias locales del editor y no modifican el formato persistido de la escena.

## Operaciones atómicas

`vision:update` incorpora dos acciones:

- `duplicate-occluder`: crea una copia desplazada, preservando tipo, estado y capacidades.
- `split-occluder`: reemplaza un segmento por dos partes que comparten el punto de división.

El servidor ejecuta cada operación como una única mutación persistida y devuelve `affectedOccluders` en el acuse. Esto evita estados intermedios donde el segmento original desaparece antes de crear sus reemplazos.

## Eliminación directa

El segmento seleccionado presenta un control de eliminación en su punto medio. La acción reutiliza `remove-occluder` y se detiene en el canvas para no alterar accidentalmente la selección.

## Pruebas

El smoke test duplica una puerta con desplazamiento, divide la copia, verifica ambas partes en la vista pública y elimina una de ellas. Build y lint cubren los contratos de interacción Konva.

Completado en `2.0.0-alpha.17`.
