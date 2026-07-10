# Design System

## Objetivo

Definir un lenguaje visual consistente para una herramienta de dirección de campañas: densa, clara, atmosférica sin perder legibilidad y preparada para uso durante una partida real.

## Principios

- Priorizar control y lectura rápida sobre decoración.
- Separar claramente información pública, privada y secreta.
- Hacer que las acciones críticas del DM estén cerca del contexto.
- Mantener la pantalla pública limpia, inmersiva y legible a distancia.
- Optimizar móvil para jugadores: pocas acciones, botones grandes y feedback inmediato.

## Experiencias principales

### `/dm`

Interfaz de trabajo. Debe sentirse como una cabina de dirección:

- Barra lateral de campaña.
- Panel de escena activa.
- Inspector contextual.
- Timeline o registro de eventos.
- Herramientas de mapa, tokens, combate, dados e IA.

### `/display`

Pantalla pública. Debe mostrar:

- Mapa o escena principal.
- Tokens visibles.
- Narrativa pública.
- Estado mínimo de combate.
- Efectos visuales y ambientales.

No debe mostrar notas privadas, secretos, estadísticas ocultas o prompts.

### `/player`

Cliente de jugador. Debe ofrecer:

- Personaje propio.
- Tiradas.
- Acciones disponibles.
- Handouts públicos o asignados.
- Estado de turno.

## Tokens visuales iniciales

### Color

- `surface-base`: fondo principal.
- `surface-panel`: paneles de herramientas.
- `surface-raised`: menús, modales y popovers.
- `text-primary`: texto principal.
- `text-secondary`: metadatos.
- `accent-action`: acciones principales.
- `accent-danger`: daño, borrar o acciones destructivas.
- `accent-success`: curación, confirmación o estado activo.
- `accent-secret`: contenido privado del DM.
- `grid-line`: líneas de mapa.
- `fog`: niebla de guerra.

La paleta final debe evitar depender de un solo color dominante. El producto puede tener atmósfera fantástica, pero la UI de trabajo debe ser sobria y escaneable.

### Tipografía

- Sans system para UI.
- Mono para fórmulas de dados, IDs técnicos y logs.
- Tamaños compactos en paneles.
- Tamaños grandes solo para display público o títulos principales.

### Espaciado

- Base: 4px.
- Controles compactos: 28-32px de alto.
- Botones táctiles: 40-48px.
- Paneles: 8-16px de padding según densidad.

## Componentes esperados

- App shell.
- Sidebar de campaña.
- Toolbar de mapa con iconos.
- Inspector de token.
- Panel de iniciativa.
- Dice tray.
- Prompt panel de IA.
- Asset browser.
- Scene switcher.
- Modal de confirmación.
- Toast/log de eventos.
- Tabs para vistas de módulo.
- Menús contextuales en tokens.

## Estados

Cada componente interactivo debe contemplar:

- Default.
- Hover.
- Focus visible.
- Active.
- Disabled.
- Loading.
- Error.
- Dirty/unsaved cuando aplique.

## Accesibilidad

- Navegación por teclado en controles críticos.
- Contraste suficiente en paneles.
- Tooltips para iconos ambiguos.
- Confirmación en acciones destructivas.
- No depender solo de color para estados.

## Reglas para assets

- Mapas: imágenes inspeccionables, no decorativas.
- Tokens: silueta o retrato claro.
- Sonidos: metadatos con duración, loop y volumen por defecto.
- Efectos: intensidad configurable para evitar saturar el display.

## Criterio de aceptación visual

Una pantalla está lista cuando:

- No hay texto cortado en móvil o escritorio.
- La jerarquía visual permite actuar durante una partida.
- El display no muestra información privada.
- Los controles de mapa no cambian de tamaño al interactuar.
- El modo oscuro o mesa en sala con poca luz sigue siendo legible.

