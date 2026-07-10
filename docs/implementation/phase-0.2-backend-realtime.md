# Implementación 0.2.0 - Backend mínimo realtime

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/architecture/Architecture.md`
- `docs/networking/SocketIO-Architecture.md`
- `docs/modules/Core-Engine.md`
- `docs/modules/Map-Engine.md`

## Objetivo

Crear el backend mínimo para que el proyecto deje de ser solo estructura y tenga una base ejecutable:

- API HTTP con `GET /api/health`.
- Servidor Socket.IO.
- Estado de escena en memoria.
- Eventos iniciales: `game:state`, `token:move`, `narrative:update`.
- Contratos TypeScript compartidos para payloads realtime.

## Alcance

Incluido:

- Configuración de entorno.
- CORS local.
- Health route.
- Snapshot de juego inicial.
- Movimiento de tokens validado.
- Actualización de narrativa pública o privada para DM.
- Filtrado básico de tokens invisibles para display.

No incluido todavía:

- Autenticación real.
- Persistencia con Prisma.
- Rooms seguras por usuario autenticado.
- UI cliente conectada.
- Sistema completo de permisos.

## Contratos Socket.IO

### `client:join`

Cliente declara rol y contexto de campaña.

### `game:state`

Servidor emite snapshot filtrado por rol.

### `token:move`

Cliente autorizado solicita mover un token. En MVP local el servidor valida forma, escena y existencia del token.

### `narrative:update`

Cliente solicita actualizar narrativa. Si la visibilidad es `public`, el display recibe el cambio; si es `dm`, queda reservado para room del DM.

## Criterios de aceptación

- `npm run build --prefix server` pasa.
- `GET /api/health` responde JSON con `status: "ok"`.
- Al conectar por Socket.IO se recibe `game:state`.
- `token:move` actualiza estado y emite snapshot.
- El snapshot de display no contiene tokens invisibles.

