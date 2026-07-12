# Roadmap

## 0.1.0 - Fundación

- Estructura raíz del monorepo.
- README inicial.
- Tipos compartidos mínimos.
- Documentación profesional base.
- Backend preparado para Express y Socket.IO.

Estado: completado.

## 0.2.0 - Backend mínimo jugable

- `GET /api/health`.
- Configuración de entorno.
- Servidor Socket.IO.
- Estado de juego en memoria.
- Eventos `game:state`, `token:move`, `narrative:update`.
- Tipos compartidos de payloads.

Estado: completado.

## 0.3.0 - Frontend DM y display

- Rutas `/dm` y `/display`.
- Cliente Socket.IO.
- Render de mapa con React-Konva.
- Tokens visibles.
- Movimiento sincronizado.
- Narrativa pública sincronizada.

Estado: completado.

## 0.4.0 - Persistencia

- Prisma + PostgreSQL.
- Modelos de campaña, sesión, escena, mapa y token.
- Guardar y cargar escena activa.
- Migraciones iniciales.

Estado: completado.

## 0.5.0 - Combate y dados

- Dice Engine.
- Combat Engine básico.
- Iniciativa, turnos y rondas.
- Daño, curación y condiciones iniciales.

Estado: completado.

## 0.6.0 - NPCs y campaña

- Campaign Engine.
- NPC Engine.
- Lore, notas, facciones y localizaciones.
- Conversión de NPC/enemigo a token.

Estado: completado.

## 0.7.0 - IA asistiva

- AI Engine.
- Generación de NPCs, escenas y eventos.
- Registro `PromptRun`.
- Aprobación manual antes de persistir.

Estado: completado.

## 0.8.0 - Experiencia de mesa

- Niebla de guerra básica.
- Audio y efectos iniciales.
- Mejoras de display.
- Cliente móvil de jugador.

Estado: completado.

## 0.9.0 - Extensibilidad de rulesets

- Abstracción formal de reglas.
- D&D como primer adaptador.
- Configuración de dados, condiciones y hojas.

Estado: completado.

## 1.0.0 - Motor de campañas usable

- Flujo completo de campaña.
- Mapas, tokens, combate, dados, NPCs e IA integrados.
- Documentación actualizada.
- Pruebas críticas automatizadas.
- Preparación para portafolio y demo pública.

Estado: completado.

## 2.0.0 - Ambición avanzada

- Iluminación dinámica.
- Línea de visión.
- Animaciones avanzadas.
- Sonido ambiental por escena.
- Importación/exportación de campañas.
- Soporte robusto para múltiples sistemas de rol.

Estado: en progreso.

### 2.0.0-alpha.1 - Paquetes de campaña

- Exportar campaña demo como JSON versionado.
- Validar paquetes importados.
- Preparar base para importación aplicada y migraciones.

Estado: completado.

### 2.0.0-alpha.2 - Importación aplicada segura

- Aplicar paquete validado como copia nueva.
- Remapear IDs de mundo, campaña, sesiones, NPCs, enemigos, PromptRuns y escena.
- Mantener la mesa en vivo sin sobrescribir estado actual.

Estado: completado.

### 2.0.0-alpha.3 - Manifest de assets empaquetados

- Incluir metadata de mapas, tokens y cues de ambiente en el paquete.
- Declarar modo `metadata-only`.
- Validar assets incompletos antes de importar.

Estado: completado.

### 2.0.0-alpha.4 - Asset Storage Engine

- Registrar assets por campaña.
- Exponer API de biblioteca de assets.
- Conectar assets registrados con exportación e importación aplicada.

Estado: completado.

### 2.0.0-alpha.5 - Audio ambiental real

- Resolver cues de ambiente contra Asset Storage.
- Reproducir música/sonido en display y jugador.
- Mantener controles manuales cuando autoplay sea bloqueado.

Estado: completado.

### 2.0.0-alpha.6 - Mixer y escenas de audio

- Controlar volumen maestro y por canal.
- Pausar, reanudar y detener cues de audio.
- Sincronizar estado de mixer por Socket.IO.

Estado: completado.

### 2.0.0-alpha.7 - Presets de audio por escena

- Guardar combinaciones de mixer y cues activos.
- Aplicar presets desde el panel del DM.
- Reiniciar cues en display/jugador al aplicar preset.

Estado: completado.

### 2.0.0-alpha.8 - Transiciones de audio entre presets

- Aplicar presets con corte, fade o crossfade.
- Conservar mixer anterior durante crossfade.
- Calcular ramp de volumen en display/jugador.

Estado: completado.

### 2.0.0-alpha.9 - Gestión fina de presets de audio

- Renombrar presets de audio.
- Borrar presets sin detener el mixer activo.
- Reordenar presets desde el panel del DM.

Estado: completado.

### 2.0.0-alpha.10 - Export/import fino de audio

- Auditar escenas de audio en paquetes de campaña.
- Exportar conteos de presets y cues.
- Remapear assets dentro de presets, mixer y transición.

Estado: completado.

### 2.0.0-alpha.11 - Iluminación dinámica básica

- Añadir estado `lighting` por escena con oscuridad global y fuentes.
- Sincronizar `light:update`/`light:updated` por Socket.IO.
- Vincular luces a tokens y moverlas junto con su token.
- Renderizar oscuridad y halos de luz en el tablero Konva.

Estado: completado.

### 2.0.0-alpha.12 - Línea de visión y obstáculos

- Segmentos de muro persistentes con bloqueo independiente de visión y luz.
- Administración DM y sincronización Socket.IO por rol.
- Proyección básica de sombras para jugadores y display.
- Inclusión automática en snapshots y paquetes de campaña.
- Contratos compartidos, validación de payload y smoke test de privacidad.

Estado: completado.

### 2.0.0-alpha.13 - Visibilidad multipunto

- Ray casting contra obstáculos y límites del mapa.
- Polígono de visibilidad independiente por token jugador.
- Unión de visión compartida para jugadores y display.
- Alcance de visión configurable por escena.
- Contornos de diagnóstico exclusivos del DM.

Estado: completado.

### 2.0.0-alpha.14 - Oclusión precisa de iluminación

- Polígono de iluminación independiente por fuente.
- Recorte de oscuridad y halo contra segmentos `blocksLight`.
- Posición dinámica para luces vinculadas a tokens.
- Separación geométrica entre bloqueo de visión y de luz.
- Pruebas puras del motor de intersecciones incorporadas a `verify`.

Estado: completado.

### 2.0.0-alpha.15 - Puertas y obstáculos interactivos

- Tipos de obstáculo `wall` y `door` con migración compatible.
- Apertura y cierre sin eliminar geometría.
- Sincronización Socket.IO mediante `set-occluder-open`.
- Exclusión inmediata de puertas abiertas en visión e iluminación.
- Controles y representación DM específicos para puertas.

Estado: completado.

### 2.0.0-alpha.16 - Editor visual de obstáculos

- Herramientas segmentadas de selección, muro y puerta.
- Creación de segmentos mediante dos puntos del canvas.
- Selección directa de líneas en el mapa.
- Manejadores arrastrables para ambos extremos.
- Sincronización del editor visual con el formulario numérico.

Estado: completado.

### 2.0.0-alpha.17 - Herramientas avanzadas de obstáculos

- Ajuste de puntos al tamaño de cuadrícula del mapa.
- Dibujo continuo conservando el último extremo.
- Duplicado atómico con desplazamiento configurable.
- División atómica de un segmento en dos partes.
- Eliminación directa desde el canvas seleccionado.

Estado: completado.

### 2.0.0-alpha.18 - Historial y edición por lotes

- Historial autoritativo de 50 estados con undo y redo.
- Estado de historial recuperable en snapshots DM.
- Selección múltiple mediante modificadores de teclado.
- Desplazamiento y capacidades de bloqueo por lote.
- Eliminación atómica de toda la selección.

Estado: completado.

### 2.0.0-alpha.19 - Cámara avanzada del mapa

- Zoom local entre 50% y 300% centrado en el cursor.
- Desplazamiento con modo explícito y cursor contextual.
- Encuadre automático de selección y restablecimiento del mapa.
- Conversión pantalla-mapa compatible con todas las herramientas.
- Pruebas puras de geometría de cámara integradas en `verify`.

Estado: completado.

### 2.0.0-alpha.20 - Capas y minimapa navegable

- Capas locales de mapa, cuadrícula, iluminación, tokens, obstáculos y niebla.
- Visibilidad, bloqueo y orden independientes.
- Minimapa con tokens, obstáculos, luces y viewport actual.
- Navegación por clic o toque conservando zoom.
- Corrección de interacción directa en la capa de obstáculos.

Estado: completado.

### 2.0.0-alpha.21 - Session Reliability

- Cuenta DM con bcrypt, cookie `httpOnly` y tokens firmados.
- Código temporal y QR para jugadores/display.
- Autorización HTTP y Socket.IO por campaña y rol.
- Idempotencia, límites de eventos y reconexión robusta.
- Autosave PostgreSQL o JSON atómico con recuperación tras reinicio.
- Docker Compose, migraciones, healthchecks y URLs LAN.
- CI, CodeQL, Dependabot, pruebas de seguridad/recuperación/socket y E2E.

Estado: completado.

### 2.0.0-alpha.22 - Session Workflow

- Selector de campaña y lobby.
- Separación preparación/partida.
- Inicio y cierre formal de sesión.
- Hoja funcional de jugador.
- Historial general undo/redo y snapshots restaurables.

Estado: completado.

### 2.0.0-alpha.23 - Table Device Experience

- Calibración física del mapa y perfiles de display.
- Wake Lock durante partidas y recuperación al volver a primer plano.
- Safe areas y controles optimizados para televisión, tablet y teléfono.
- Diagnóstico de red, latencia y calidad de sincronización por dispositivo.
- Fullscreen/kiosk, backup visible, límites de assets y benchmark 4K.
- Gate integral de release, JWT/CSRF y observabilidad estructurada.

Estado: completado.

### 2.0.0-alpha.24 - DM Command Center

- Shell operativo con topbar, navegación, mapa, contexto, timeline y status bar.
- Mapa de escena real bajo las capas de cuadrícula, tokens, luz, visión y niebla.
- Inspector y paneles contextuales conectados a la lógica existente.
- Drawer de tableta, controles táctiles y atajos de teclado.
- Herramientas avanzadas preservadas sin duplicar autoridad ni eventos Socket.IO.
- Evidencia visual en 1366x768, 1920x1080 y 1024x768.

Estado: completado.

### Siguiente versión - Player Token Ownership

- Asignación explícita de personaje y token por el DM.
- Movimiento del jugador limitado a su token asignado.
- Persistencia de ownership en PostgreSQL y paquete de campaña.
- Pruebas con dos jugadores y reconexión simultánea.
