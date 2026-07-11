# Cliente web

Aplicación React + TypeScript para las vistas `/dm`, `/display` y `/player`.

## Desarrollo

Desde la raíz del repositorio:

```bash
npm run dev:client
```

Vite publica la interfaz en `http://localhost:5173` y redirige `/api`, `/assets` y `/socket.io` al backend local en el puerto `4000`.

## Sesiones

- `/dm` usa una cuenta con contraseña y cookie `httpOnly`.
- El DM entra primero al lobby, elige campaña/sesión y abre preparación o partida.
- `/player` y `/display` requieren un código temporal generado por el DM.
- Jugador y display permanecen en sala de espera hasta que la fase sea `live`.
- El jugador puede editar una hoja persistente antes y durante la partida.
- El token explícito de la pestaña autentica el handshake Socket.IO.
- El último snapshot público o privado permitido se conserva en `sessionStorage` para tolerar reconexiones breves.

## Comandos

```bash
npm run build
npm run lint
```

Los contratos compartidos se importan desde `../shared/types`.
