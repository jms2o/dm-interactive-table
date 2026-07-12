# Implementacion 2.0.0-alpha.24 - DM Command Center

## Objetivo

Convertir la vista `/dm` en una superficie de operación compacta para dirigir
una sesión en tiempo real. El mapa conserva la prioridad visual y el backend
continúa siendo la fuente de verdad para estado, historial y sincronización.

## Referencias

- `Foto 1.jpg`: composición visual y densidad de información.
- `Prompt_Codex_DM_Command_Center.pdf`: alcance funcional, responsive,
  accesibilidad y entregables.
- Componentes y hooks existentes de `GameWorkspace`, Socket.IO, workflow,
  dispositivo, backup, assets y mapa.

## Arquitectura

`GameWorkspace` mantiene la orquestación y entrega estado tipado a componentes
visuales extraídos:

```text
features/game/
  GameWorkspace.tsx
  components/
    command-center/
      DmCommandCenter.tsx
      DmTopStatusBar.tsx
      DmSideNav.tsx
      DmMapViewport.tsx
      DmContextPanel.tsx
      QuickActionsPanel.tsx
      DmTimelineBar.tsx
      DmSystemStatusBar.tsx
      DmShortcutHelp.tsx
    token/TokenInspector.tsx
    characters/CharactersPanel.tsx
    npc/NpcPanel.tsx
    combat/CombatPanel.tsx
    notes/DmNotesPanel.tsx
    assets/AssetsPanel.tsx
    display/DisplayPanel.tsx
    system/SystemPanel.tsx
  hooks/
    useDmWorkspace.ts
    useKeyboardShortcuts.ts
  types/dm-ui.types.ts
```

El panel anterior no se elimina. Sus controles quedan dentro de
`DmAdvancedTools`, plegados por defecto, para conservar dados, IA, audio,
iluminación, visión, capas, paquetes y creación de entidades.

## Integración real

- Campaña, sesión y presencia: `GET /campaigns/:id/workflow`.
- Acceso de mesa: `GET/POST /table-access` mediante el control existente.
- Latencia y FPS: `useTableDeviceExperience` y `diagnostics:ping`.
- Tokens y escena: `useRealtimeGame` y `GameBoard`.
- Combate: `encounter:start` y `turn:advance`.
- Historial: undo, redo, crear, restaurar y eliminar snapshot.
- Assets: API existente de biblioteca por campaña.
- Narrativa: evento Socket.IO `narrative:update`.
- Backup, calibración y fullscreen: componentes existentes sin duplicación.

## Mapa

`GameBoard` ahora respeta `scene.map.imageUrl`. La escena demo usa un asset
local original y los mapas de campaña siguen aceptando URLs configuradas.
La imagen se dibuja en la capa base; cuadrícula, tokens, iluminación, visión y
niebla mantienen el orden y comportamiento anteriores.

El tablero expone selección controlada y solicitudes de foco. Esto permite que
el inspector, personajes y NPCs centren un token sin mover la cámara al estado
global ni cambiar el protocolo Socket.IO.

## Acciones soportadas

- Seleccionar, mover y centrar tokens.
- Dibujar obstáculos mediante el editor de visión existente.
- Activar o desactivar niebla y revelar el centro.
- Iniciar combate y avanzar turno.
- Publicar narrativa.
- Registrar assets y crear NPCs o enemigos.
- Crear, restaurar y eliminar snapshots; undo y redo.
- Cambiar perfil de display, calibración, Wake Lock y fullscreen.
- Diagnóstico de red, Socket.IO, release y acceso de mesa.

## Acciones deshabilitadas

No existe aún un contrato de backend para marcador persistente, texto sobre el
mapa, medición, edición/eliminación genérica de tokens, turno anterior, pausa o
fin de encuentro. Esas acciones se muestran deshabilitadas con tooltip y no se
simulan en memoria local.

## Responsive

- Full HD y ultrawide: navegación, mapa, contexto y timeline simultáneos.
- 1366x768: navegación compacta, contexto de 292 px y timeline reducido.
- Tableta horizontal: contexto como drawer y controles táctiles de 44 px.
- Teléfonos: se conservan las vistas dedicadas de jugador y display; el panel
  DM completo no se redefine para pantallas pequeñas.

## Accesibilidad

- Iconos con `aria-label` y tooltip.
- Navegación lateral con `aria-current`.
- Pestañas semánticas en el inspector.
- Foco visible y controles deshabilitados identificables sin depender del color.
- Ayuda de atajos accesible y cierre con Escape.
- Confirmación antes de finalizar sesión, restaurar o eliminar snapshots.

## Validación

- `npm run lint --workspace client`.
- `npm run build --workspace client`.
- `npm run test:command-center`.
- `npm run test:e2e`.
- `npm run verify`.
- Inspección visual a 1366x768, 1920x1080 y 1024x768.

## Siguiente paso

Player Token Ownership: asignar un personaje/token a cada jugador y limitar
sus comandos de movimiento al token autorizado por el servidor.
