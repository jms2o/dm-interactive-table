# Implementación 2.0.0-alpha.4 - Asset Storage Engine

## Objetivo

Convertir el manifest de assets en una librería real de campaña, con API estable y conexión al sistema de paquetes.

## Alcance

- Tipos compartidos para assets de campaña.
- Servicio backend en memoria con seed demo.
- Rutas HTTP para listar, consultar y registrar assets.
- Servir `/assets` desde el workspace cuando existan archivos locales.
- Panel DM para visualizar y registrar assets.
- Exportación de paquetes basada en assets registrados.
- Importación `apply-copy` con copia de assets registrados.
- Readiness y smoke test actualizados.

## Fuera de alcance

- Upload binario.
- Almacenamiento externo.
- Reproducción real de audio.
- Render del bitmap del mapa en Konva.
- Deduplicación por checksum.

## Decisiones

- La fuente de verdad de runtime sigue siendo memoria para la demo local.
- Prisma ya contiene `Asset`; no se requiere migración en esta fase.
- El campo `status` permite distinguir assets registrados de assets que luego necesiten resolución de archivo.
- `source: "asset-storage"` diferencia assets de librería frente a swatches o cues derivados.

## Criterios de aceptación

- `GET /api/campaigns/demo-campaign/assets` devuelve assets demo.
- `POST /api/campaigns/demo-campaign/assets` registra un asset nuevo.
- El paquete exportado incluye al menos un asset con `source: "asset-storage"`.
- `apply-copy` devuelve `appliedResources.assetIds`.
- `/dm` muestra la biblioteca y permite registrar un asset.
- `npm run verify` pasa.

## Estado de implementación

Completado en `2.0.0-alpha.4`.
