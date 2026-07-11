# Implementacion 2.0.0-alpha.23 - Table Device Experience

## Contexto

Esta entrega responde a la auditoria tecnica del 11 de julio de 2026. La
auditoria se realizo sobre una instantanea publica sin ejecutar el proyecto, por
lo que varios hallazgos P0 ya estaban resueltos en `alpha.21` y `alpha.22`. El
trabajo de esta fase cierra los huecos verificables de B0 a B4 antes de plantear
una beta cerrada.

Documentos base:

- `docs/srs/SRS.md`
- `docs/modules/Map-Engine.md`
- `docs/networking/SocketIO-Architecture.md`
- `docs/security/Session-Security.md`
- `docs/testing/Test-Plan.md`
- `docs/design-system/Design-System.md`

## Objetivo

Convertir display, tablet y telefono en superficies de mesa operables y
medibles, y reforzar al mismo tiempo el gate de release que demuestra que la
sesion es segura, recuperable y reproducible.

## Alcance

### B0 - Consistencia

- Fuente de version compartida por runtime y paquetes exportados.
- `release:check` para comparar root, cliente, servidor, locks, README,
  OpenAPI, changelog y fuente compartida.
- Changelog, notas de implementacion, tag y automatizacion de GitHub Release.
- npm workspaces reales para cliente y servidor con un unico lockfile raiz.
- TypeScript 6 alineado en ambos workspaces.

### B1 - Gate de calidad y seguridad

- `verify:core` para compilacion, lint, documentacion, Prisma y suites locales.
- `verify` como gate integral, incluyendo E2E.
- PostgreSQL real y suites security/recovery/workflow en CI.
- JWT HS256 con `issuer` y `audience` obligatorios.
- Defensa CSRF por `Origin`/Fetch Metadata para solicitudes de navegador.
- Revocacion de accesos de mesa al terminar una sesion.
- Casos negativos de rol, campana cruzada, codigo revocado y token alterado.

### B2 - Dispositivo fisico

- Perfiles locales `tv`, `tablet` y `phone` sin datos privados.
- Calibracion de casilla en centimetros o pulgadas mediante densidad ajustable.
- Safe area configurable y soporte de `env(safe-area-inset-*)`.
- Fullscreen y modo kiosk para display.
- Screen Wake Lock con recuperacion al volver a primer plano.
- Cursor oculto y seleccion bloqueada solamente en display fullscreen.

### B3 - Resiliencia y operacion

- Se conserva autosave, recuperacion tras reinicio, snapshots e import/export.
- Acceso rapido de backup y restauracion como copia desde el topbar del DM.
- Logs JSON con `requestId` y tiempos de respuesta.
- Metricas en memoria de HTTP, sockets, persistencia y snapshots.

### B4 - Rendimiento y limites

- Latencia HTTP y Socket.IO visible por dispositivo.
- FPS, viewport, DPR, conexion y estado Wake Lock visibles en diagnostico.
- Benchmark repetible de vision/iluminacion con escena de referencia.
- Politica de assets con limites de cantidad, URL, metadata, dimensiones y
  tamano declarado.
- Evidencia E2E en desktop, TV y telefono; Playwright publica artefactos al
  fallar.

## Decisiones

### Preferencias locales

El perfil fisico se guarda en `localStorage` porque describe el hardware del
navegador, no la campana. Nunca contiene token, codigo de mesa, narrativa ni
otro estado privado. La sesion y el cache de juego siguen en `sessionStorage`.

### Calibracion

CSS no puede garantizar que `1in` mida una pulgada real en todos los paneles.
La aplicacion conserva una densidad ajustable en pixeles por pulgada y calcula
el ancho renderizado del canvas para que una casilla del mapa coincida con la
medida seleccionada. El mapa autoritativo no cambia; solo cambia su proyeccion
local.

### Kiosk

El perfil no puede suprimir controles del navegador. El modo kiosk de la
aplicacion se activa solo mientras el documento esta en fullscreen. Al salir
con `Esc`, el topbar vuelve a estar disponible.

### CSRF

Los clientes autenticados envian Bearer para HTTP y un token firmado en el
handshake de Socket.IO. La cookie `httpOnly` queda como mecanismo de
restauracion. Las mutaciones de navegador con origen ajeno se rechazan, sin
impedir clientes de automatizacion que no envian cabeceras de navegador.

### Backups

Restaurar un paquete siempre crea una copia con IDs nuevos. No se sobreescribe
la campana en vivo y el paquete conserva `schemaVersion` y `appVersion`.

## Fuera de alcance

- La reduccion general de columnas JSON requiere migraciones de dominio por
  modulo.
- Proveedores de IA externos, coste y circuit breaker pertenecen a la fase del
  proveedor de IA; el proveedor determinista local sigue siendo el modo seguro.
- Las tres sesiones reales de dos horas son evidencia operativa de beta cerrada
  y no pueden sustituirse con automatizacion.

## Criterios de aceptacion

- `npm run release:check` detecta cualquier version desalineada.
- `npm run verify` ejecuta todas las suites criticas, incluido E2E.
- Un JWT con issuer, audience, algoritmo o firma incorrectos se rechaza.
- Una mutacion cross-site con cookie se rechaza con `CSRF_REJECTED`.
- Finalizar una sesion desconecta y revoca display/jugadores.
- El display puede calibrar una casilla en cm o pulgadas.
- Wake Lock se solicita de nuevo al recuperar visibilidad.
- Fullscreen TV aplica safe area, bloquea seleccion y oculta cursor por
  inactividad.
- El panel de dispositivo muestra latencia HTTP/Socket, FPS, viewport y DPR.
- Assets fuera de politica son rechazados antes de entrar a la biblioteca.
- El benchmark de referencia y las pruebas de geometria pasan en CI.
- El DM puede descargar un backup y restaurarlo como copia desde el topbar.
