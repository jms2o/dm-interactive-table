# Implementación 1.0.0 - Motor de campañas usable

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/roadmap/Roadmap.md`
- `docs/testing/Test-Plan.md`
- `docs/demo/Demo-Runbook.md`
- `docs/modules/README.md`

## Objetivo

Convertir el motor en una demo integrada y verificable:

- Exponer estado de preparación de demo desde API.
- Mostrar checklist de flujo completo en el panel del DM.
- Validar campaña, ruleset, mapa, tokens, NPCs, IA, dados, combate, niebla, ambiente y cliente jugador.
- Agregar smoke test automatizado del flujo crítico.
- Dejar instrucciones claras de portafolio/demo pública.

## Alcance

Incluido:

- `shared/types/demo.ts`.
- `server/src/modules/demo`.
- `server/src/routes/demo.routes.ts`.
- `GET /api/demo/readiness`.
- Panel DM de release/demo readiness.
- `scripts/smoke-test.js`.
- Scripts `test:smoke` y `verify`.
- Runbook de demo.

No incluido todavía:

- Persistencia PostgreSQL completa de todos los módulos en servicios de dominio.
- Autenticación real por usuario.
- Import/export de campañas.
- Audio real con reproducción de assets.
- Línea de visión e iluminación dinámica avanzada.

## Decisiones

- El smoke test prueba el runtime local por API y Socket.IO, porque ese es el riesgo principal del producto.
- El checklist de demo es compartido entre documentación, API y UI para evitar estados divergentes.
- `1.0.0` no significa producto comercial final; significa demo integrada, ejecutable y defendible como portafolio.

## Criterios de aceptación

- `npm run build` pasa.
- `npm run lint --prefix client` pasa.
- `npm run prisma:validate --prefix server` pasa.
- `npm run test:smoke` pasa contra servidor local.
- `/api/demo/readiness` reporta todos los puntos críticos como `ready`.
- `/dm` muestra el estado de demo.
- README incluye flujo de ejecución y URLs.
