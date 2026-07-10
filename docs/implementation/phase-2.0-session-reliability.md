# Implementación 2.0.0-alpha.21 - Session Reliability

## Objetivo

Permitir una sesión completa en LAN con identidad confiable, acceso simple desde televisión/teléfonos, persistencia ante reinicios y una instalación reproducible.

## Contratos

- `shared/types/auth.ts`: principal, sesión, estado y concesión de mesa.
- `POST /api/auth/register|login`: crea la sesión del DM.
- `POST /api/table-access`: genera y revoca el código anterior.
- `POST /api/table-access/join`: emite identidad `player` o `display`.
- `socket.handshake.auth.token`: única fuente de identidad realtime.

## Decisiones

1. bcryptjs evita una dependencia nativa sin rebajar el algoritmo de contraseña.
2. JWT permite recuperar la sesión sin un almacén adicional; la cookie `httpOnly` protege el flujo HTTP y el token explícito autentica Socket.IO.
3. Los códigos se buscan mediante HMAC con `AUTH_SECRET`, no como texto plano.
4. PostgreSQL es el modo recomendado; el fallback local usa escrituras JSON temporales y renombre atómico.
5. La cola de persistencia serializa cambios y se vacía en `SIGINT`/`SIGTERM`.
6. Socket.IO recupera conexión y los `requestId` hacen idempotentes los reintentos.

## Superficie entregada

- Pantallas de setup, login y entrada por código.
- Modal DM con código, QR, enlaces para rol y revocación.
- Detección de orígenes LAN y dirección editable para QR en Docker/proxy.
- Middleware de autorización HTTP y Socket.IO.
- Expulsión realtime e invalidación persistente al cerrar el acceso.
- Migración `TableAccessCode` y `User.passwordHash`.
- Autosave visible, cache por pestaña y recuperación local.
- Dockerfile, Compose, setup local, CI, CodeQL, Dependabot y Playwright.

## Pruebas de aceptación automatizadas

- Hash bcrypt y recarga del repositorio de identidad.
- Revocación de códigos y rol fijo del invitado.
- Reinicio con recuperación de posición de token.
- Rechazo de HTTP anónimo y sockets anónimos o con rol falsificado.
- Aislamiento de campaña, filtrado de tokens privados e idempotencia.
- E2E DM → código → jugador móvil → offline → reconnect → reload.

## Pendiente posterior

- Selector/lobby multicampaña y membresías administrables.
- Historial general undo/redo, snapshots nombrados y panel de restauración.
- Hoja de personaje completa y permisos de movimiento por propietario.
- Calibración física, Wake Lock y safe area por display.
