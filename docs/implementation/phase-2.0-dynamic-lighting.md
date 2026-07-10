# Implementación 2.0.0-alpha.11 - Iluminación dinámica básica

## Objetivo

Introducir una primera capa de iluminación dinámica por escena, sincronizada en tiempo real y preparada para integrarse después con línea de visión, niebla de guerra avanzada y efectos visuales.

## Alcance

- `SceneExperienceState.lighting` con activación, oscuridad global y fuentes de luz.
- Fuentes manuales o vinculadas a un `tokenId`.
- Evento Socket.IO `light:update` para el DM y `light:updated` para clientes.
- Render en `GameBoard` con capa de oscuridad, recortes de luz y halo radial.
- Filtrado de fuentes vinculadas a tokens ocultos en snapshots públicos.
- Smoke test con alta de luz y seguimiento al mover token.

## Decisiones

- Las luces viven dentro de la experiencia de escena, junto a fog/audio, porque son estado sensorial sincronizado.
- Una fuente vinculada a token conserva su `tokenId`; el servidor actualiza sus coordenadas cuando el token se mueve.
- El tablero usa Konva y `destination-out`, siguiendo el mismo patrón de la niebla de guerra.
- La visibilidad pública filtra luces de tokens ocultos para no revelar información privada.

## Contratos

- `LightSource`
- `LightingState`
- `LightUpdateCommand`
- `LightUpdateAck`
- `LightUpdatedEvent`

## Validación

- `npm run test:smoke` verifica `light:update`, recepción por jugador, filtrado de luces ocultas y movimiento de luz con token.
- `npm run verify` debe cubrir build, lint, Prisma y smoke test.

## Fuera de alcance

- Línea de visión con obstáculos.
- Sombras por paredes.
- Persistencia geométrica de muros.
- Animaciones de flicker o colores por hechizo.

Completado en `2.0.0-alpha.11`.
