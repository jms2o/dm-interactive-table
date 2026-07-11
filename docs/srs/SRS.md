# Software Requirements Specification

Producto: DM Interactive Table  
Versión del documento: 0.1.0  
Fecha base: 2026-07-07  
Estado: Borrador arquitectónico vivo

## 1. Propósito

Este SRS define los requisitos de un motor de campañas de rol con mesa digital, sincronización en tiempo real, herramientas de dirección para el DM, pantallas públicas para jugadores, soporte móvil, módulos de mapas, combate, dados, NPCs, campañas e IA.

El documento inicia como base profesional y crecerá por iteraciones hasta convertirse en el SRS completo del producto. Su función práctica es darle a cada implementación un contexto estable y trazable.

## 2. Alcance

El sistema permitirá:

- Crear y administrar mundos, campañas, sesiones, escenas y encuentros.
- Mostrar mapas interactivos en una pantalla pública.
- Controlar tokens, narrativa, enemigos y estado de combate desde un panel privado del DM.
- Sincronizar varias pantallas mediante Socket.IO.
- Permitir conexión de jugadores desde teléfonos.
- Gestionar dados, reglas, personajes, NPCs, activos, audio, iluminación, niebla de guerra y efectos.
- Usar IA para acelerar preparación, improvisación, generación de contenido y resúmenes.
- Extender reglas para soportar otros sistemas de rol además de D&D.

Quedan fuera de alcance inicial:

- Marketplace público de contenido.
- Editor 3D completo.
- Multitenancy empresarial complejo.
- Pagos, licencias comerciales y publicación en tiendas.

## 3. Contexto del producto

El producto se compone de tres experiencias principales:

- `/dm`: panel privado del director de juego.
- `/display`: pantalla pública para mesa, televisión o proyector.
- `/player`: cliente móvil o navegador para jugadores.

El backend mantiene la fuente de verdad y emite cambios en tiempo real. El frontend representa el estado, permite interacciones y ofrece herramientas especializadas por rol.

## 4. Usuarios y roles

### Dungeon Master

Administra campañas, controla escenas, revela información, mueve tokens, prepara encuentros, lanza ayudas de IA y decide qué se comparte con jugadores.

### Jugador

Consulta su personaje, tira dados, recibe handouts, ve el mapa, actúa en combate y puede interactuar con información permitida por el DM.

### Espectador o pantalla pública

Representa información compartida sin exponer secretos del DM: mapa, tokens visibles, narrativa pública, efectos, clima, música y estado de turno.

### Administrador local

Configura entorno, base de datos, claves de IA, assets y despliegue.

## 5. Requisitos funcionales

### 5.1 Campañas y mundos

- FR-CAM-001: El sistema debe permitir crear campañas con nombre, descripción, sistema de reglas, estado y metadatos.
- FR-CAM-002: El sistema debe permitir agrupar campañas dentro de mundos reutilizables.
- FR-CAM-003: El sistema debe permitir crear localizaciones, facciones, líneas temporales, rumores y notas privadas.
- FR-CAM-004: El sistema debe permitir importar o generar contenido inicial con IA bajo aprobación del DM.
- FR-CAM-005: El sistema debe registrar sesiones jugadas y vincularlas con escenas, encuentros y notas.
- FR-CAM-006: El sistema debe separar contenido público, privado y secreto.
- FR-CAM-007: El DM debe poder seleccionar campaña y sesión desde un lobby.
- FR-CAM-008: Una sesión debe transitar por preparación, partida en vivo y cierre.
- FR-CAM-009: Jugadores y display no deben recibir la escena antes del inicio formal.
- FR-CAM-010: El jugador debe poder consultar y actualizar su hoja persistente.
- FR-CAM-011: El DM debe poder deshacer, rehacer y restaurar snapshots nombrados.

### 5.2 Escenas y mapas

- FR-MAP-001: El sistema debe permitir crear mapas con imagen base, dimensiones y tamaño de cuadrícula.
- FR-MAP-002: El sistema debe permitir cargar una escena activa con mapa, tokens, capas y narrativa.
- FR-MAP-003: El DM debe poder mover tokens en el mapa y sincronizar los cambios en tiempo real.
- FR-MAP-004: El sistema debe soportar capas de mapa: fondo, grid, terreno, tokens, efectos, niebla e iluminación.
- FR-MAP-005: El sistema debe permitir ocultar tokens o elementos a la pantalla pública.
- FR-MAP-006: El sistema debe almacenar posiciones en coordenadas independientes de la resolución.
- FR-MAP-007: El sistema debe preparar soporte para medición de distancia y plantillas de área.

### 5.3 Tokens

- FR-TOK-001: El sistema debe representar tokens de jugador, enemigo, NPC y objeto.
- FR-TOK-002: Cada token debe tener posición, tamaño, visibilidad, color o retrato, propietario opcional y estado.
- FR-TOK-003: El DM debe poder bloquear, ocultar, agrupar, duplicar y eliminar tokens.
- FR-TOK-004: Los jugadores solo pueden controlar tokens autorizados.
- FR-TOK-005: Los cambios de token deben tener validación del servidor.

### 5.4 Combate

- FR-CBT-001: El sistema debe crear encuentros con combatientes, iniciativa, rondas y turnos.
- FR-CBT-002: El sistema debe ordenar iniciativa y permitir ajustes manuales.
- FR-CBT-003: El sistema debe registrar daño, curación, condiciones y estados temporales.
- FR-CBT-004: El DM debe poder pausar, reordenar, finalizar o reiniciar un encuentro.
- FR-CBT-005: El display debe mostrar información pública del combate sin revelar datos privados.
- FR-CBT-006: El motor de combate debe aislar reglas específicas por sistema de rol.

### 5.5 Dados

- FR-DICE-001: El sistema debe soportar expresiones de dados como `d20`, `2d6+3`, ventaja, desventaja y modificadores.
- FR-DICE-002: Las tiradas deben registrar actor, fórmula, resultado, desglose y visibilidad.
- FR-DICE-003: El DM debe poder realizar tiradas privadas.
- FR-DICE-004: Los jugadores deben poder realizar tiradas públicas o privadas según permisos.
- FR-DICE-005: El resultado debe poder vincularse con combate, pruebas, daño o narrativa.

### 5.6 NPCs y criaturas

- FR-NPC-001: El sistema debe permitir crear NPCs con perfil, rasgos, motivaciones, voz, secretos y vínculos.
- FR-NPC-002: El sistema debe permitir crear enemigos con estadísticas de combate.
- FR-NPC-003: La IA puede sugerir NPCs, pero el DM debe aprobar persistencia y exposición.
- FR-NPC-004: NPCs y enemigos deben poder convertirse en tokens de escena.

### 5.7 IA

- FR-AI-001: El sistema debe permitir generar ideas de campaña, escenas, NPCs, villanos, eventos y resúmenes.
- FR-AI-002: Toda generación debe incluir contexto explícito y salida revisable.
- FR-AI-003: La IA no debe modificar estado persistente sin confirmación del DM.
- FR-AI-004: El sistema debe registrar prompts, modelos, parámetros y resultados relevantes.
- FR-AI-005: El sistema debe soportar proveedores intercambiables de IA.

### 5.8 Red y sincronización

- FR-NET-001: El sistema debe sincronizar estado de juego con Socket.IO.
- FR-NET-002: El sistema debe soportar rooms por campaña, sesión y escena.
- FR-NET-003: El servidor debe emitir `game:state`, `token:move` y `narrative:update` en la fase inicial.
- FR-NET-004: Los eventos deben tener payload versionado y acknowledgements para operaciones críticas.
- FR-NET-005: El display debe poder reconectarse y solicitar snapshot de estado.

### 5.9 Audio, iluminación y efectos

- FR-FX-001: El sistema debe permitir activar sonidos ambientales por escena.
- FR-FX-002: El sistema debe preparar capas de iluminación dinámica.
- FR-FX-003: El sistema debe soportar niebla de guerra por escena.
- FR-FX-004: El DM debe poder disparar efectos visuales o animaciones sincronizadas.

### 5.10 API y administración

- FR-API-001: El backend debe exponer `/api/health`.
- FR-API-002: El backend debe exponer endpoints REST para campañas, escenas, mapas, personajes, encuentros e IA.
- FR-API-003: La API debe documentarse con OpenAPI.
- FR-API-004: La validación de entrada debe centralizarse con esquemas tipados.

### 5.11 Identidad y acceso de mesa

- FR-AUTH-001: La primera instalación debe permitir crear una cuenta administradora DM sin credenciales predeterminadas.
- FR-AUTH-002: Las contraseñas deben almacenarse con bcrypt o Argon2.
- FR-AUTH-003: El DM debe poder iniciar y cerrar sesión mediante cookie `httpOnly`.
- FR-AUTH-004: El DM debe poder generar y revocar un código temporal para una campaña y sesión.
- FR-AUTH-005: Jugadores y display deben recibir un rol firmado al canjear el código.
- FR-AUTH-006: HTTP y Socket.IO deben validar campaña y rol en el servidor para cada operación.
- FR-AUTH-007: El cliente debe ofrecer enlace y QR de entrada para teléfonos y display.

## 6. Requisitos no funcionales

- NFR-PERF-001: El display debe mantener interacción fluida en mapas medianos con 50 tokens visibles.
- NFR-PERF-002: Los eventos de movimiento deben percibirse con latencia baja en red local.
- NFR-SEC-001: El sistema debe separar permisos de DM, jugador y display.
- NFR-SEC-002: Los secretos de campaña no deben enviarse a clientes no autorizados.
- NFR-SEC-003: El navegador no debe poder elevar permisos modificando ruta, query o payload.
- NFR-SEC-004: Credenciales y códigos deben tener rate limit y límites de payload.
- NFR-REL-001: El cliente debe recuperarse de desconexiones con snapshot de estado.
- NFR-REL-002: Un reintento con el mismo `requestId` no debe duplicar una mutación.
- NFR-REL-003: El estado activo debe sobrevivir un reinicio con PostgreSQL o almacenamiento local atómico.
- NFR-OPS-001: La instalación recomendada debe arrancar con `docker compose up` y exponer healthchecks.
- NFR-MAINT-001: Cada motor debe tener límites claros y pruebas dedicadas.
- NFR-EXT-001: Las reglas de D&D no deben quedar acopladas al núcleo del sistema.
- NFR-A11Y-001: El panel debe ser navegable con teclado en flujos críticos.
- NFR-OBS-001: El backend debe registrar eventos relevantes para depuración.

## 7. Modelo de dominio inicial

- World: contenedor de lore, lugares, facciones e historia.
- Campaign: campaña jugable con sistema de reglas y sesiones.
- Session: instancia de juego en una fecha o ejecución.
- Scene: estado activo o preparado con mapa, tokens y narrativa.
- BattleMap: mapa con imagen, grid y dimensiones.
- GameToken: representación visual de personaje, enemigo, NPC u objeto.
- PlayerCharacter: personaje controlado por jugador.
- NPC: entidad narrativa no jugadora.
- Enemy: criatura con estadísticas de combate.
- Encounter: agrupación de combatientes y turnos.
- DiceRoll: tirada auditable.
- Asset: archivo de mapa, token, retrato, sonido o efecto.
- PromptRun: ejecución de IA auditable.

## 8. Interfaces externas

- Navegador moderno para `/dm`, `/display` y `/player`.
- Base de datos PostgreSQL.
- Socket.IO para sincronización.
- Proveedor de IA configurable.
- Sistema local de archivos o storage futuro para assets.

## 9. Criterios de aceptación por hito

### Hito 0.1

- Estructura raíz creada.
- README y documentación base existentes.
- Backend con health check y Socket.IO inicial.
- Tipos compartidos mínimos.

### Hito 0.2

- Rutas `/dm` y `/display`.
- Cliente Socket.IO conectado.
- Estado inicial recibido desde servidor.
- Mapa básico con tokens renderizados.

### Hito 0.3

- Movimiento de tokens sincronizado.
- Estado de escena persistible.
- Eventos con payload validado.
- Pruebas básicas de API y Socket.IO.

### Hito 0.4

- Combate básico con iniciativa.
- Motor de dados inicial.
- NPCs y enemigos vinculados a tokens.

### Hito 0.5

- IA asistiva para narrativa, NPCs y eventos.
- Registro de prompts.
- Revisión explícita antes de guardar contenido generado.

## 10. Matriz de trazabilidad inicial

| Requisito | Documento de diseño | Implementación esperada |
| --- | --- | --- |
| FR-MAP-001 a FR-MAP-007 | `modules/Map-Engine.md` | `client/src`, `shared/types/map.ts`, backend scenes |
| FR-CBT-001 a FR-CBT-006 | `modules/Combat-Engine.md` | combat service, shared combat types |
| FR-DICE-001 a FR-DICE-005 | `modules/Dice-Engine.md` | dice parser/service |
| FR-NPC-001 a FR-NPC-004 | `modules/NPC-Engine.md` | NPC CRUD, AI suggestions |
| FR-CAM-001 a FR-CAM-011 | `modules/Campaign-Engine.md`, `implementation/phase-2.0-session-workflow.md` | campaigns/workflow API, DB models, history socket events |
| FR-AI-001 a FR-AI-005 | `modules/AI-Engine.md` | AI adapter, prompt logs |
| FR-NET-001 a FR-NET-005 | `networking/SocketIO-Architecture.md` | `server/src/socket.ts`, client socket store |

## 11. Riesgos

- Acoplar reglas de D&D al núcleo y dificultar otros sistemas.
- Enviar información secreta al display por comodidad.
- Hacer que Socket.IO sea la única fuente de verdad sin persistencia clara.
- Integrar IA sin auditoría ni aprobación.
- Sobrediseñar módulos antes de validar el flujo mínimo de mesa.

## 12. Definición de listo para implementar un módulo

Un módulo está listo cuando tiene:

- Documento de diseño aprobado en `docs/modules`.
- Tipos de entrada y salida definidos.
- Eventos o endpoints necesarios especificados.
- Riesgos y casos borde listados.
- Pruebas mínimas descritas.
- Criterios de aceptación verificables.
