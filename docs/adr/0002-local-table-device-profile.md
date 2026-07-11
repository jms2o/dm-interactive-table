# ADR 0002 - Perfil fisico local por dispositivo

## Estado

Aceptado para `2.0.0-alpha.23`.

## Contexto

Una television, una tableta de control y un telefono requieren escala, safe
area, Wake Lock y densidad visual distintas. Estas propiedades pertenecen al
hardware y pueden cambiar aunque todos los dispositivos compartan campana y
sesion.

## Decision

Guardar `TableDevicePreferences` localmente por rol. El servidor conserva el
estado de juego y permisos; el cliente conserva solamente perfil, calibracion y
preferencias de presentacion. La calibracion modifica el tamano CSS del canvas,
no las coordenadas del mapa.

## Consecuencias

- Cada pantalla se calibra una vez sin contaminar snapshots o paquetes.
- Cambiar de navegador requiere calibrar de nuevo.
- E2E puede fijar preferencias y validar perfiles de forma determinista.
- Ningun secreto o contenido de campana se escribe en `localStorage`.
