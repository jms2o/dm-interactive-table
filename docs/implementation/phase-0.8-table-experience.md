# Implementación 0.8.0 - Experiencia de mesa

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/modules/Map-Engine.md`
- `docs/modules/Audio-Lighting-Effects-Engine.md`
- `docs/networking/SocketIO-Architecture.md`
- `docs/design-system/Design-System.md`

## Objetivo

Crear una primera capa de experiencia de mesa sincronizada:

- Controlar niebla de guerra básica desde el panel del DM.
- Exponer metadata de ambiente sonoro y efectos iniciales al display.
- Mejorar el display para modo cinemático sin controles privados.
- Agregar cliente móvil de jugador con estado público y tiradas.

## Alcance

Incluido:

- Estado compartido de experiencia de escena.
- Evento Socket.IO `fog:update`.
- Evento Socket.IO `asset:cue`.
- Render de niebla básica sobre el mapa.
- Panel DM para activar/desactivar niebla, revelar área central, ajustar opacidad y cambiar ambiente.
- Ruta `/player` para teléfonos con narrativa pública, dados y estado de combate.
- Documentación y OpenAPI/Socket.IO actualizados.

No incluido todavía:

- Línea de visión real.
- Iluminación dinámica por token.
- Reproducción real de audio con archivos cargados.
- Biblioteca de assets persistente.
- Permisos/autenticación de jugadores.
- Plantillas por sistema de reglas.

## Decisiones

- La niebla inicial se modela como máscara radial simple con áreas reveladas, suficiente para validar sincronización y UI.
- Los cues de audio/efectos son metadata pública sincronizada, no reproducción multimedia obligatoria.
- El cliente jugador reutiliza el socket existente con rol `player` y recibe solo estado público.
- La persistencia queda a nivel de snapshot de escena; el estado avanzado de assets se formalizará en una fase posterior.

## Criterios de aceptación

- `npm run build` pasa.
- `npm run lint --prefix client` pasa.
- `npm run prisma:validate --prefix server` pasa.
- `/dm` permite actualizar niebla y ambiente.
- `/display` muestra niebla, ambiente y modo de proyección.
- `/player` conecta por Socket.IO y permite tirar dados públicos.
- `fog:update` y `asset:cue` usan tipos compartidos y acknowledgements.
