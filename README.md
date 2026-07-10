# DM Interactive Table

Plataforma web para dirigir campañas de D&D con una pantalla interactiva para jugadores y un panel privado para el Dungeon Master.

## Objetivo

Crear una mesa digital para partidas de rol donde el DM pueda controlar mapas, tokens, narrativa, enemigos, efectos y herramientas asistidas por IA.

## Stack inicial

- React + TypeScript
- Node.js + Express
- Socket.IO
- PostgreSQL + Prisma
- Konva.js
- IA para generación de narrativa, NPCs, villanos y eventos

## Módulos principales

- Display público
- Panel del DM
- Motor de mapas
- Motor de tokens
- Motor de dados
- Motor de combate
- Motor de narrativa
- Motor de IA
- Sincronización en tiempo real

## Versión actual

2.0.0-alpha.20 - Capas locales y minimapa navegable para escenas grandes.

## Ejecutar

```bash
npm run install:all
npm run dev
```

URLs locales:

- DM: `http://localhost:5173/dm`
- Display: `http://localhost:5173/display`
- Jugador: `http://localhost:5173/player`
- Readiness API: `http://localhost:4000/api/demo/readiness`
- Assets campaña demo: `http://localhost:4000/api/campaigns/demo-campaign/assets`
- Export campaña demo: `http://localhost:4000/api/campaigns/demo-campaign/package/export`

## Verificar

```bash
npm run verify
```

## Documentación técnica

El proyecto ahora sigue una metodología de arquitectura primero. La documentación principal vive en [docs/README.md](docs/README.md) e incluye SRS, arquitectura, diseño de base de datos, design system, diagramas UML, Socket.IO, módulos del motor, OpenAPI, plan de pruebas y roadmap.
