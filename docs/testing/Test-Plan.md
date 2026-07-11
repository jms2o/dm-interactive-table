# Plan de Pruebas

## Objetivo

Garantizar que el motor sea confiable durante una partida real, donde una falla de sincronización o una fuga de información privada rompe la experiencia.

## Estrategia

- Unit tests para reglas puras.
- Integration tests para API, persistencia y servicios.
- Contract tests para OpenAPI y Socket.IO payloads.
- E2E tests para flujos `/dm`, `/display` y `/player`.
- Visual checks para mapa, tokens y display.
- Pruebas manuales guiadas para UX de mesa.

## Pirámide inicial

| Nivel | Herramienta sugerida | Cobertura |
| --- | --- | --- |
| Unit | Vitest | dados, reglas, filtros de visibilidad |
| Integration | Vitest/Supertest | API Express, servicios, DB |
| Realtime | Socket.IO test client | rooms, eventos, ack, reconexión |
| E2E | Playwright | flujos DM-display-player |
| Visual | Playwright screenshots | display, mapa, paneles |

## Casos críticos

### Seguridad de visibilidad

- Tokens invisibles no llegan al display.
- Luces vinculadas a tokens invisibles no llegan al display.
- Notas privadas no salen en `game:state` público.
- Tiradas privadas no aparecen en clientes no autorizados.
- Prompts y secretos de IA no se emiten por Socket.IO público.

### Sincronización

- DM mueve token y display actualiza.
- Luz vinculada a token se mueve con el token en el snapshot público.
- Display reconecta y recibe snapshot correcto.
- Jugador no autorizado no mueve token ajeno.
- Evento duplicado con mismo `requestId` no duplica estado.

### Combate

- Iniciativa ordenada correctamente.
- Turno avanza y cambia ronda.
- Daño y curación actualizan combatiente correcto.
- Estado público oculta datos configurados como secretos.

### Dados

- `d20` devuelve 1-20.
- `2d6+3` produce desglose y total correcto.
- Fórmula inválida devuelve error claro.
- Tirada privada queda restringida.

### IA

- Generación crea `PromptRun`.
- Resultado no se guarda hasta aprobación.
- Contexto enviado no incluye secretos fuera de propósito.
- Error de proveedor no rompe campaña activa.

## Criterios de release

Para cada versión:

- Build de cliente y servidor pasa.
- Pruebas del módulo cambiado pasan.
- OpenAPI y docs reflejan cambios.
- No hay regresión en flujo DM-display básico.
- No hay exposición accidental de campos privados en fixtures.

## Smoke test automatizado 1.0.0

`npm run test:smoke` levanta el backend en memoria sobre un puerto temporal y verifica:

- API raíz y `/api/demo/readiness`.
- Catálogo de rulesets y ruleset activo de campaña.
- Generación y aprobación de IA.
- Creación de NPC y conversión a token.
- Listado y registro de assets de campaña.
- Tirada pública por HTTP.
- Encuentro con `rulesetId` y condición validada.
- Exportación de paquete de campaña con assets de storage, audioScenes, validación de importación y `apply-copy`.
- Socket.IO con roles DM y jugador.
- Eventos `fog:update`, `light:update`, `asset:cue`, `audio:mixer:update`, presets, transiciones y gestión de presets recibidos por jugador con `assetUrl` reproducible y playback por canal.

`npm run verify` ejecuta build, lint, validación Prisma y smoke test.

## Pruebas manuales de Fase 2

1. Abrir `/dm` y `/display`.
2. Conectar ambos al servidor.
3. Activar una escena con mapa.
4. Mover un token desde `/dm`.
5. Confirmar movimiento en `/display`.
6. Cambiar narrativa pública.
7. Confirmar texto en display.
8. Marcar token invisible.
9. Confirmar que desaparece del display.

## Línea de visión 2.0.0-alpha.12

- Validar que solo el DM puede emitir `vision:update`.
- Comprobar creación, actualización, eliminación y limpieza de segmentos.
- Verificar persistencia y exportación dentro del snapshot de escena.
- Confirmar que `vision:updated` llega a jugadores sin nombres privados de edición.
- Comprobar visualmente las guías DM y las sombras públicas en escritorio y móvil.

## Visibilidad multipunto 2.0.0-alpha.13

- Verificar alcance circular cuando no existen obstáculos interiores.
- Confirmar que un muro recorta el polígono en su intersección más cercana.
- Comprobar la unión visual de dos o más tokens jugadores.
- Validar límites de `defaultRange` en servidor y sincronización por rol.
- Revisar que el movimiento de tokens recalcule los polígonos sin mutar el estado de escena.

## Oclusión de iluminación 2.0.0-alpha.14

- Verificar que una fuente no atraviesa un muro `blocksLight`.
- Confirmar que un muro exclusivo de luz no recorta la visión.
- Confirmar que un muro exclusivo de visión no recorta el halo luminoso.
- Validar luces manuales y vinculadas a tokens después de movimientos.
- Ejecutar `npm run test:vision` como parte de la verificación integral.

## Puertas interactivas 2.0.0-alpha.15

- Confirmar que una puerta cerrada bloquea según `blocksSight` y `blocksLight`.
- Verificar que una puerta abierta deja pasar ambos tipos de rayos.
- Rechazar `set-occluder-open` para muros o identificadores inexistentes.
- Comprobar persistencia, exportación e importación del estado abierto.
- Validar que `vision:updated` sincroniza el cambio con jugadores y display.

## Editor visual 2.0.0-alpha.16

- Dibujar muros y puertas mediante dos puntos en distintas escalas del tablero.
- Confirmar que un primer punto pendiente se cancela al cambiar de herramienta.
- Seleccionar líneas estrechas mediante un área de interacción ampliada.
- Arrastrar ambos extremos y verificar límites contra dimensiones del mapa.
- Confirmar que las coordenadas editadas llegan a jugadores mediante `vision:updated`.
- Revisar interacción táctil y ausencia de conflicto con movimiento de tokens.

## Herramientas avanzadas 2.0.0-alpha.17

- Verificar ajuste a cuadrícula en bordes y dimensiones no divisibles exactamente.
- Confirmar continuidad entre tres o más segmentos consecutivos.
- Duplicar muros y puertas preservando propiedades y aplicando desplazamiento.
- Dividir un segmento y comprobar continuidad exacta en el punto compartido.
- Rechazar divisiones coincidentes con cualquiera de los extremos.
- Eliminar desde el canvas sin propagar el clic a selección o dibujo.

## Historial y lotes 2.0.0-alpha.18

- Verificar el límite de 50 estados y que una mutación nueva vacía redo.
- Deshacer y rehacer creación, movimiento, división y eliminación.
- Reconectar un DM y recuperar `canUndo`/`canRedo` en su snapshot.
- Confirmar que snapshots de jugadores no exponen el historial editorial.
- Seleccionar con Shift/Ctrl/Cmd y alternar un elemento sin perder los demás.
- Desplazar selecciones contra los límites del mapa.
- Cambiar bloqueo de visión y luz para varios segmentos en una mutación.
- Eliminar por lote y restaurar toda la selección con un único undo.

## Cámara del mapa 2.0.0-alpha.19

- Verificar zoom mínimo y máximo mediante rueda y botones.
- Confirmar que el punto bajo el cursor no se desplaza al cambiar zoom.
- Dibujar y mover obstáculos con cámara desplazada y distintos niveles de zoom.
- Mover tokens bajo zoom sin modificar incorrectamente sus coordenadas.
- Encuadrar selecciones puntuales, verticales, horizontales y múltiples.
- Revisar controles y toolbar en escritorio y móvil.
- Ejecutar `npm run test:camera` dentro de la verificación integral.

## Capas y minimapa 2.0.0-alpha.20

- Ocultar y mostrar cada capa sin alterar el snapshot compartido.
- Bloquear tokens y obstáculos, confirmando que no reciben arrastres o clics.
- Reordenar capas activas e inactivas sin índices duplicados.
- Verificar que el minimapa respeta entidades filtradas por rol.
- Centrar la cámara desde extremos y centro del minimapa.
- Confirmar el rectángulo de viewport durante pan y zoom.
- Revisar overlay de escritorio y disposición inferior móvil.
- Ejecutar `npm run test:layers` dentro de la verificación integral.

## Session Reliability 2.0.0-alpha.21

### Seguridad unitaria

- La cuenta inicial almacena bcrypt y nunca la contraseña original.
- La cuenta sobrevive al cierre y reapertura del repositorio local.
- Un código fija el rol autorizado y deja de funcionar al revocarse.
- Un JWT expirado, alterado o firmado con otra clave se rechaza.

### Integración HTTP y Socket.IO

- Una ruta protegida responde `401` sin sesión.
- Un socket sin token o con rol falsificado no completa el handshake.
- Player y display no reciben tokens ocultos ni fuentes privadas.
- Un jugador no mueve tokens y un display no tira dados.
- Un comando dirigido a otra campaña responde `403` o ack negativo.
- Dos entregas del mismo `requestId` producen una sola mutación.

### Recuperación

- La cola de autosave termina antes del apagado controlado.
- Un proceso nuevo carga el último snapshot JSON o Prisma.
- El cliente conserva el snapshot permitido mientras reconecta.
- Al volver la red solicita el estado autoritativo y reemplaza el cache.

### E2E principal

DM crea cuenta → abre mesa → genera código → jugador móvil entra → pierde red → reconecta → recarga → conserva escena.

Comandos:

```bash
npm run test:security
npm run test:recovery
npm run test:smoke
npm run test:e2e
```

## Session Workflow 2.0.0-alpha.22

### Dominio y persistencia

- Catálogo, sesiones y fases sobreviven la recarga del repositorio local.
- Solo una sesión puede estar `live` en la instancia.
- Finalizar libera la siguiente sesión y conserva resúmenes.
- Hojas de jugador persisten y quedan aisladas por `playerKey`.
- Undo/redo restaura escena, narrativa y experiencia completas.
- Los snapshots nombrados sobreviven un reinicio.

### Autorización y realtime

- `POST /auth/context` exige DM con acceso a campaña y sesión válidas.
- Jugador y display reciben snapshot sin escena durante preparación y cierre.
- Un jugador no puede tirar dados fuera de una sesión en vivo.
- `history:*` exige DM, contexto coincidente y `requestId` idempotente.
- Cambios de fase se emiten a `session:{sessionId}`.

### E2E principal

DM crea cuenta → entra al lobby → abre preparación → genera código → jugador
edita su hoja en sala de espera → DM inicia → jugador reconecta → DM crea un
snapshot → DM finaliza → jugador ve el cierre.

Comando dedicado:

```bash
npm run test:workflow
```
