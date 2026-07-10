# Implementación 2.0.0-alpha.16 - Editor visual de obstáculos

## Objetivo

Permitir que el DM construya y ajuste muros y puertas directamente sobre el mapa, evitando depender de coordenadas introducidas manualmente.

## Herramientas

El panel de visión ofrece tres modos mutuamente excluyentes:

- `select`: selecciona segmentos existentes y habilita sus manejadores.
- `draw-wall`: crea un muro mediante dos puntos sobre el mapa.
- `draw-door`: crea una puerta cerrada mediante dos puntos sobre el mapa.

El primer punto queda señalado en el canvas hasta que se elige el extremo final. Los segmentos de longitud cero se rechazan en la interfaz.

## Edición

Al seleccionar un segmento aparecen manejadores en ambos extremos. Arrastrar un manejador convierte su posición de pantalla a coordenadas del mapa, limita el resultado a sus dimensiones y envía un `upsert-occluder`. El panel numérico y el editor visual permanecen sincronizados porque ambos modifican el mismo contrato.

## Persistencia y red

La edición visual no introduce un formato paralelo. Creación y movimiento reutilizan `vision:update`, por lo que conservan validación, persistencia, snapshots por rol, exportación e importación existentes.

## Pruebas

El build valida los contratos Konva/React. El smoke test reproduce el comando generado por un arrastre, actualiza ambos extremos de una puerta y confirma las coordenadas publicadas mediante `vision:updated`.

Completado en `2.0.0-alpha.16`.
