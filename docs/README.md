# DM Interactive Table - Documentación Técnica

Este directorio contiene la base documental del proyecto. La intención es trabajar como un estudio de software: primero definimos el producto, los módulos, los contratos y los criterios de calidad; después implementamos código con contexto estable.

## Visión

DM Interactive Table evolucionará de una mesa digital para una campaña concreta a un motor de campañas de rol extensible. El primer sistema objetivo es D&D, pero la arquitectura debe permitir otros sistemas de rol mediante reglas, hojas, dados, condiciones y flujos configurables.

## Principios de documentación

- Cada módulo importante requiere un documento de diseño antes de implementarse.
- Los contratos compartidos viven en `shared/` y deben reflejar lo definido en estos documentos.
- El backend es la fuente de verdad para estado persistente y sincronización.
- El frontend puede optimizar la experiencia, pero no debe inventar reglas de dominio no documentadas.
- Socket.IO transporta eventos en tiempo real; HTTP expone recursos, consultas y operaciones administrativas.
- La IA se diseña como un módulo asistivo y auditable, no como autoridad invisible sobre el estado de juego.

## Mapa de documentos

- [SRS](srs/SRS.md): requisitos funcionales, no funcionales, alcance y trazabilidad.
- [Arquitectura](architecture/Architecture.md): capas, límites, runtime y decisiones principales.
- [Diseño de base de datos](database/Database-Design.md): entidades, relaciones y criterios de persistencia.
- [Design System](design-system/Design-System.md): lenguaje visual, componentes y experiencias por pantalla.
- [Diagramas UML](uml/README.md): casos de uso, clases y secuencias.
- [Socket.IO](networking/SocketIO-Architecture.md): rooms, eventos, payloads y reglas de sincronización.
- [Módulos](modules/README.md): motores del sistema y documentos de diseño por módulo.
- [OpenAPI](api/openapi.yaml): contrato inicial de API HTTP.
- [Plan de pruebas](testing/Test-Plan.md): estrategia de calidad y matriz de pruebas.
- [Seguridad de sesión](security/Session-Security.md): cuentas, códigos, permisos HTTP/Socket.IO y operación segura.
- [Roadmap](roadmap/Roadmap.md): fases, versiones y entregables.
- [Implementaciones](implementation/README.md): briefs de fase que conectan diseño con código.
- [Runbook de demo](demo/Demo-Runbook.md): recorrido para presentar el producto.
- [Plantilla de diseño de módulo](templates/Module-Design-Template.md): formato obligatorio antes de construir.
- [ADR 0001](adr/0001-architecture-first.md): decisión de trabajar con documentación primero.

## Flujo recomendado para Codex

1. Leer el SRS y el documento del módulo afectado.
2. Revisar contratos en `shared/types`.
3. Crear o actualizar el documento de diseño del módulo si falta contexto.
4. Implementar cambios pequeños y verificables.
5. Actualizar pruebas, documentación y roadmap cuando cambie el comportamiento.

## Estado actual

Versión documental: `2.0.0-alpha.23`

El repositorio ya contiene la estructura raíz definida por la guía inicial:

- `client/`: React + Vite + TypeScript.
- `server/`: Node.js + Express + Socket.IO.
- `shared/`: tipos compartidos de dominio.
- `prisma/`: esquema, migraciones y persistencia PostgreSQL.
- `assets/`: mapas, tokens, música, sonidos, efectos y retratos.
- `docs/`: documentación técnica.
