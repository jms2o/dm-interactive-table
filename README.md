# DM Interactive Table

Motor de campañas de rol con panel privado para el DM, mapa sincronizado para mesa física y cliente móvil para jugadores.

## Versión actual

`2.0.0-alpha.22 - Session Workflow`

Esta entrega añade selector de campañas, lobby con presencia, preparación y partida separadas, inicio/cierre formal de sesiones, hoja persistente de jugador e historial global con undo/redo y snapshots nombrados. Conserva la autenticación, recuperación y operación LAN de Session Reliability.

## Inicio con Docker

Requiere Docker Desktop.

```bash
docker compose up --build
```

Abre `http://localhost:4000/dm`. La primera visita crea la cuenta administradora; no hay credenciales predeterminadas.

Para detener la mesa:

```bash
docker compose down
```

Los datos de PostgreSQL permanecen en el volumen `postgres_data`. Para que los QR usen directamente la IP del equipo, define `PUBLIC_BASE_URL=http://IP-LAN:4000`. Antes de exponer el servicio fuera de una LAN confiable, configura `AUTH_SECRET`, `POSTGRES_PASSWORD`, TLS y `COOKIE_SECURE=true` mediante un archivo `.env` basado en [.env.example](.env.example).

## Desarrollo local

Requiere Node.js 22.

```bash
npm run setup
npm run dev
```

- DM: `http://localhost:5173/dm`
- Display: `http://localhost:5173/display`
- Jugador: `http://localhost:5173/player`
- API: `http://localhost:4000/api`
- Health: `http://localhost:4000/api/health`

Sin `DATABASE_URL`, el servidor usa snapshots JSON atómicos en `server/data`. Con PostgreSQL usa Prisma y las migraciones de [prisma/migrations](prisma/migrations).

## Verificación

```bash
npm run verify
npm run test:e2e
```

`verify` ejecuta build, lint, geometría de mapa/visión/cámara, seguridad, recuperación, workflow de sesiones, validación Prisma y el flujo integrado HTTP/Socket.IO. El E2E requiere Chromium de Playwright (`npx playwright install chromium`).

## Documentación

El índice técnico está en [docs/README.md](docs/README.md). Incluye SRS, arquitectura, base de datos, design system, UML, red Socket.IO, módulos, OpenAPI, pruebas, roadmap y briefs de implementación.
