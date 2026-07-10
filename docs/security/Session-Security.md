# Seguridad de sesión y mesa

## Alcance

Este documento define la frontera de confianza implementada en `2.0.0-alpha.21`. El backend es la única autoridad para identidad, campaña y rol.

## Identidades

### DM

- La primera instalación permite crear una sola cuenta administradora.
- La contraseña se almacena con bcrypt, coste 12.
- El login emite un JWT HS256 y una cookie `dit_dm_session` `httpOnly`, `SameSite=Lax`.
- En producción, `AUTH_SECRET` es obligatorio y debe tener al menos 32 caracteres.

### Jugador y display

- El DM genera un código de seis caracteres con expiración.
- En PostgreSQL solo se conserva un HMAC del código; en modo local se aplica el mismo criterio.
- El canje fija `role`, `campaignId` y `sessionId` dentro de un token temporal.
- Regenerar revoca el código anterior sin interrumpir clientes ya conectados.
- Cerrar el acceso marca todas las concesiones vigentes, expulsa sockets de jugador/display e impide su reconexión.

## HTTP

Las rutas `/api/health`, `/api/auth/status`, `/api/auth/login`, `/api/auth/register` y `/api/table-access/join` son públicas. El resto requiere cookie o `Authorization: Bearer`.

- DM: lectura y mutación de campañas autorizadas; una cuenta administradora puede preparar campañas nuevas.
- Player: lectura de su campaña y tiradas de dados.
- Display: lectura de su campaña.
- Cualquier campaña distinta a la incluida en el token se rechaza con `403`.

Los endpoints de credenciales y código tienen rate limit. Express limita JSON a `JSON_LIMIT` y Helmet añade cabeceras defensivas.

## Socket.IO

El middleware del handshake valida `auth.token`; `role` y `campaignId` enviados por el cliente solo pueden coincidir con los claims firmados. Cada comando vuelve a comprobar rol y campaña antes de llegar al motor de dominio.

Los comandos con `requestId` se cachean durante cinco minutos por identidad y evento. Un reintento devuelve el mismo acknowledgment sin aplicar la mutación dos veces. Cada socket limita frecuencia y payload a 64 KiB.

## Datos privados

`gameState.getSnapshot(role)` elimina tokens ocultos y fuentes de luz privadas para jugador/display. Los nombres internos de oclusores tampoco salen en snapshots públicos. Las notas DM solo se persisten y emiten a la room del DM.

## Operación

- En HTTPS: `COOKIE_SECURE=true`.
- Detrás de proxy: `TRUST_PROXY=true`.
- Si el servidor no puede descubrir la IP del host (por ejemplo dentro de Docker), configurar `PUBLIC_BASE_URL=http://IP-LAN:PUERTO` o editar la dirección en el modal antes de compartir el QR.
- Rotar `AUTH_SECRET` invalida todas las sesiones.
- Los códigos de mesa no sustituyen cuentas para operaciones administrativas.
- No publicar el puerto de PostgreSQL fuera del host.
