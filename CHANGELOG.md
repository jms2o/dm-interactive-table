# Changelog

Los cambios relevantes del producto se registran en este archivo.

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
