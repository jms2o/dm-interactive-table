# Implementación 0.4.0 - Persistencia con Prisma/PostgreSQL

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/database/Database-Design.md`
- `docs/architecture/Architecture.md`
- `docs/modules/Core-Engine.md`
- `docs/modules/Campaign-Engine.md`
- `docs/modules/Map-Engine.md`

## Objetivo

Crear la primera capa de persistencia del motor:

- Schema Prisma para PostgreSQL.
- Modelos iniciales de campaña, sesión, escena, mapa y token.
- Contrato de repositorio de escenas.
- Implementación en memoria como fallback local.
- Implementación Prisma preparada para entornos con `DATABASE_URL`.
- Scripts para generar cliente Prisma y crear migraciones.

## Alcance

Incluido:

- `prisma/schema.prisma`.
- Capa `server/src/persistence`.
- Separación entre estado runtime y repositorio persistente.
- Fallback automático a memoria cuando `DATABASE_URL` no está configurada.
- Endpoint de health con modo de persistencia.

No incluido todavía:

- Servidor PostgreSQL local provisionado.
- Ejecución real de migraciones contra una base de datos.
- CRUD completo de campañas.
- Autenticación y usuarios reales.
- Persistencia de todos los motores futuros.

## Decisiones

- PostgreSQL es el destino formal.
- El servidor puede arrancar sin base de datos durante desarrollo temprano.
- El estado realtime sigue siendo autoritativo durante la sesión, pero los cambios relevantes se envían al repositorio.
- Prisma se mantiene como adaptador de infraestructura; el dominio no debe depender directamente de `PrismaClient`.

## Criterios de aceptación

- `npm run prisma:validate --prefix server` pasa.
- `npm run build --prefix server` pasa.
- `npm run build` pasa.
- `/api/health` reporta el modo de persistencia.
- `token:move` y `narrative:update` siguen funcionando sin `DATABASE_URL`.
