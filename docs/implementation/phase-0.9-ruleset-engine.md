# Implementación 0.9.0 - Ruleset Engine

## Contexto

Documentos base:

- `docs/srs/SRS.md`
- `docs/modules/Ruleset-Engine.md`
- `docs/modules/Combat-Engine.md`
- `docs/modules/Dice-Engine.md`
- `docs/modules/Campaign-Engine.md`

## Objetivo

Crear la primera abstracción formal de reglas:

- Registrar rulesets disponibles.
- Definir D&D 5e como primer adaptador.
- Exponer condiciones, checks, fórmulas de dados y plantilla de hoja.
- Resolver el ruleset activo de una campaña.
- Mostrar esa configuración en el panel del DM.

## Alcance

Incluido:

- `shared/types/ruleset.ts`.
- `server/src/modules/ruleset`.
- `server/src/routes/ruleset.routes.ts`.
- API de catálogo y ruleset por campaña.
- Panel DM con resumen de reglas, condiciones y hoja básica.
- Documentación y OpenAPI actualizados.

No incluido todavía:

- Editor visual completo de hojas.
- Reglas automatizadas de daño, muerte, descanso o acciones.
- Importación de SRD o contenido externo.
- Marketplace de adaptadores.
- Validación profunda de permisos por sistema.

## Decisiones

- El catálogo vive en memoria para esta fase.
- `dnd5e` es fallback explícito si una campaña tiene ruleset desconocido.
- La UI consume una definición genérica; no renderiza campos hardcodeados de D&D como parte del núcleo.
- Combate y dados quedan preparados para consultar ruleset sin reescribir su lógica actual.

## Criterios de aceptación

- `npm run build` pasa.
- `npm run lint --prefix client` pasa.
- `npm run prisma:validate --prefix server` pasa.
- `GET /api/rulesets` lista `dnd5e`.
- `GET /api/rulesets/dnd5e` devuelve condiciones, checks y hoja.
- `GET /api/campaigns/demo-campaign/ruleset` devuelve el ruleset activo.
- `/dm` muestra reglas, checks y condiciones desde API.
