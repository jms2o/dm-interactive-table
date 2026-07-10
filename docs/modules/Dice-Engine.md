# Dice Engine

## Propósito

Parsear, ejecutar, registrar y publicar tiradas de dados.

## Responsabilidades

- Aceptar fórmulas como `d20`, `2d6+3`, `1d8-1`.
- Soportar ventaja/desventaja para sistemas tipo d20.
- Producir desglose auditable.
- Respetar visibilidad pública, privada o de grupo.
- Integrarse con combate, pruebas y narrativa.

## Modelo de resultado

```ts
type DiceRollResult = {
  formula: string;
  total: number;
  dice: Array<{
    sides: number;
    rolls: number[];
  }>;
  modifier: number;
  visibility: "public" | "private" | "dm";
};
```

## Casos borde

- Fórmula inválida.
- Fórmula demasiado costosa.
- Modificadores múltiples.
- Tiradas privadas en display.
- Repetición accidental por reconexión.

## Criterios de aceptación para MVP

- Ejecutar fórmulas simples.
- Devolver desglose.
- Registrar tirada.
- Emitir resultado según visibilidad.

## Implementación actual

La fase `0.5.0` implementa el motor en `server/src/modules/dice` usando `@dice-roller/rpg-dice-roller` como parser especializado.

Contratos:

- HTTP: `POST /api/campaigns/:campaignId/dice/roll`.
- Socket.IO: `dice:roll` y `dice:rolled`.
- Tipos compartidos: `shared/types/dice.ts`.

El display recibe solo tiradas públicas. Las tiradas `dm` y `private` quedan restringidas al canal del DM en esta fase.

Desde la fase `0.9.0`, los presets recomendados de dados se exponen desde el Ruleset Engine. El Dice Engine sigue ejecutando fórmulas genéricas, mientras cada ruleset declara ejemplos y checks como `d20+MOD`, ventaja o daño.
