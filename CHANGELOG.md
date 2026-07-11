# Changelog

Los cambios relevantes del producto se registran en este archivo.

## [2.0.0-alpha.22] - 2026-07-10

### Añadido

- Lobby DM con selector y creación de campañas y sesiones.
- Ciclo persistente `preparation` → `live` → `ended` y presencia por sesión.
- Sesión DM reemitida de forma segura para el contexto seleccionado.
- Sala de espera automática para jugadores y displays.
- Hoja de jugador persistente con HP, CA, nivel, notas y recursos.
- Historial global del tablero con undo/redo y límite de 50 cambios.
- Snapshots nombrados restaurables en JSON local o PostgreSQL.
- Migración `SessionPhase`, campos de personaje y `GameSnapshot`.
- Pruebas de workflow y E2E completo desde lobby hasta cierre.

### Cambiado

- El estado del tablero se activa por campaña y sesión en lugar de quedar fijado al contexto demo.
- Jugadores y displays solo reciben la escena durante una sesión en vivo.
- La versión de producto, paquetes y readiness avanza a `2.0.0-alpha.22`.

## [2.0.0-alpha.21] - 2026-07-10

### Añadido

- Alta inicial e inicio de sesión del DM con bcrypt y cookie `httpOnly`.
- Códigos temporales y QR para acceso de jugadores y display.
- Revocación persistente con expulsión inmediata de clientes de mesa.
- Tokens firmados, autorización de campaña y roles en HTTP y Socket.IO.
- Rate limiting, límite de payload e idempotencia de comandos realtime.
- Persistencia JSON atómica sin PostgreSQL y recuperación tras reinicio.
- Reconexión Socket.IO con cache de escena y estado visible de autosave.
- Docker Compose con PostgreSQL, migraciones y healthchecks.
- GitHub Actions, CodeQL, Dependabot y prueba E2E Playwright.

### Cambiado

- El cliente usa rutas same-origin y proxy Vite para funcionar correctamente en LAN.
- La versión de producto, paquetes de campaña y readiness avanzan a `2.0.0-alpha.21`.

### Seguridad

- El rol ya no se acepta como identidad declarada por el navegador.
- Las mutaciones de campaña requieren DM autenticado; jugador y display reciben permisos mínimos.
