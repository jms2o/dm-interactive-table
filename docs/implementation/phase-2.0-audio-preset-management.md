# Implementación 2.0.0-alpha.9 - Gestión fina de presets de audio

## Objetivo

Permitir que el DM administre presets de audio de una escena: renombrar, borrar y reordenar presets sin alterar el mixer activo salvo que aplique explícitamente un preset.

## Alcance

- Comando Socket.IO `audio:preset:manage`.
- Acciones `rename`, `delete` y `move`.
- Validación de nombres únicos por escena.
- Reordenamiento local de la lista de presets.
- Limpieza de transición si se borra un preset referenciado por `audioTransition`.
- Controles DM para renombrar, borrar y mover presets.
- Smoke test cubriendo rename, move y delete.

## Fuera de alcance

- Carpetas o etiquetas de presets.
- Presets globales compartidos entre campañas.
- Deshacer cambios.
- Export/import selectivo de presets como recurso independiente.

## Criterios de aceptación

- Renombrar conserva el ID y actualiza `updatedAt`.
- No se puede renombrar a un nombre vacío o duplicado.
- Borrar elimina el preset sin detener el audio activo.
- Mover arriba/abajo conserva todos los presets y cambia su orden.
- Los clientes reciben `audio:preset:managed` y snapshot actualizado.

## Estado

Completado en `2.0.0-alpha.9`.
