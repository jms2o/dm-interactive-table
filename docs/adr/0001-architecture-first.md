# ADR 0001: Documentación y Arquitectura Antes de Implementar Módulos

## Estado

Aceptada.

## Contexto

El proyecto busca crecer de una herramienta de mesa para D&D a un motor profesional de campañas de rol. Si los módulos se implementan de forma reactiva, el riesgo de acoplamiento, duplicación y reestructuración temprana aumenta.

## Decisión

Antes de implementar módulos principales, el proyecto mantendrá documentos de diseño con:

- Responsabilidades.
- Límites.
- Contratos.
- Eventos.
- Entidades.
- Criterios de aceptación.
- Pruebas mínimas.

## Consecuencias positivas

- Codex y cualquier desarrollador tendrán contexto claro.
- Los contratos serán más estables.
- La arquitectura podrá escalar.
- El proyecto funcionará mejor como portafolio técnico.

## Costos

- Más trabajo inicial de documentación.
- Necesidad de mantener docs actualizados.
- Algunas decisiones pueden cambiar al validar el MVP.

## Regla práctica

Si una feature toca un motor principal, primero se actualiza o crea su documento de diseño.

