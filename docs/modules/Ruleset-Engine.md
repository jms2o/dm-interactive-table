# Ruleset Engine

## Propósito

Aislar reglas de sistema de rol para que el núcleo de campaña, combate, dados y personajes no dependa de D&D como estructura fija.

## Responsabilidades

- Registrar rulesets disponibles.
- Exponer metadatos de dados, atributos, habilidades, condiciones y acciones.
- Definir plantilla básica de hoja de personaje.
- Proveer configuración de combate como iniciativa y condiciones.
- Resolver el ruleset activo de una campaña.
- Permitir que futuros sistemas agreguen adaptadores sin cambiar el núcleo.

## Principios

- El núcleo usa `rulesetId`, no reglas implícitas.
- Cada adaptador declara capacidades, no código disperso en UI o servicios.
- Las condiciones y checks deben salir del ruleset activo.
- La UI puede renderizar controles genéricos a partir de la definición.
- D&D 5e es el primer adaptador, no el único destino del motor.

## Contrato mínimo

Un ruleset debe definir:

- `id`.
- `name`.
- `version`.
- `dice.notationExamples`.
- `dice.checks`.
- `combat.initiativeFormula`.
- `combat.conditions`.
- `characterSheet.sections`.
- `metadata.tags`.

## Adaptador inicial: D&D 5e

La fase inicial define:

- Atributos: fuerza, destreza, constitución, inteligencia, sabiduría, carisma.
- Checks comunes: ataque, salvación, habilidad, daño y ventaja/desventaja como presets.
- Condiciones estándar frecuentes.
- Hoja básica con identidad, atributos, combate y notas.

## Casos borde

- Campaña con `ruleset` desconocido.
- Condición no soportada por el ruleset activo.
- UI con definición incompleta.
- Migración futura de campañas creadas con un ruleset anterior.

## Criterios de aceptación para MVP

- Listar rulesets disponibles.
- Obtener definición del ruleset activo de campaña.
- Exponer condiciones y checks de D&D 5e.
- Mostrar resumen del ruleset en `/dm`.
- No acoplar nuevas reglas directamente al Combat Engine ni al Dice Engine.

## Implementación actual

La fase `0.9.0` implementa `server/src/modules/ruleset` y el contrato `shared/types/ruleset.ts`.

Contratos:

- HTTP: `GET /api/rulesets`.
- HTTP: `GET /api/rulesets/:rulesetId`.
- HTTP: `GET /api/campaigns/:campaignId/ruleset`.

El servicio actual mantiene definiciones en memoria y resuelve `dnd5e` como fallback para campañas antiguas o rulesets desconocidos.
