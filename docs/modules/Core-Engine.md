# Core Engine

## Propósito

Coordinar el estado de juego entre campañas, sesiones, escenas, módulos de dominio y sincronización.

## Responsabilidades

- Mantener la escena activa.
- Orquestar comandos de alto nivel.
- Aplicar validaciones comunes de permisos y visibilidad.
- Crear snapshots públicos o privados según rol.
- Coordinar persistencia de estado.

## Entradas

- Comandos HTTP.
- Comandos Socket.IO.
- Acciones del DM.
- Acciones permitidas de jugadores.

## Salidas

- Snapshots de estado.
- Patches de escena.
- Eventos de dominio.
- Respuestas de API.

## No responsabilidades

- Renderizar mapas.
- Parsear dados.
- Generar texto con IA directamente.
- Implementar reglas específicas de un sistema.

## Estado inicial

Debe partir de `GameScene` en `shared/types/game.ts`, ampliándolo cuando existan campañas, sesiones y visibilidad.

## Criterios de aceptación

- Puede devolver estado público sin secretos.
- Puede devolver estado privado para DM.
- Puede aplicar un cambio de escena de forma auditable.
- Puede coordinar movimiento de token validado.

