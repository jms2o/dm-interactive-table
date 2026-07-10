# Demo Runbook

## Objetivo

Presentar DM Interactive Table como un motor de campañas de rol extensible, no como una app aislada para una sola partida.

## Preparación

1. Ejecutar `npm run dev`.
2. Abrir `http://localhost:5173/dm`.
3. Abrir `http://localhost:5173/display` en una segunda pantalla.
4. Abrir `http://localhost:5173/player` en teléfono o ventana móvil.
5. Confirmar `GET http://localhost:4000/api/demo/readiness`.

## Recorrido recomendado

1. Mostrar el panel del DM con campaña demo, ruleset D&D 5e y tokens visibles.
2. Mover un token en el mapa y confirmar sincronización en display.
3. Crear un NPC o enemigo y convertirlo en token.
4. Generar un borrador de IA y aprobarlo manualmente.
5. Tirar dados públicos.
6. Iniciar encuentro y avanzar turno.
7. Activar niebla de guerra y revelar el centro.
8. Mostrar la biblioteca de assets y registrar un asset de prueba.
9. Sincronizar ambiente y handout para jugadores usando un asset registrado.
10. Confirmar el reproductor de ambiente en `/display` y `/player`.
11. Mostrar `/player` con dados públicos y nota.
12. Exportar paquete JSON de campaña y mostrar assets de storage.
13. Validar el paquete y aplicarlo como copia nueva.
14. Cerrar con el roadmap: overwrite/merge, mixer avanzado, iluminación dinámica, línea de visión y empaquetado binario de assets.

## Comandos de verificación

```bash
npm run build
npm run lint --prefix client
npm run prisma:validate --prefix server
npm run test:smoke
```

## Mensaje de portafolio

DM Interactive Table demuestra arquitectura full stack, diseño de módulos, sincronización realtime, motor de reglas extensible, integración asistiva de IA y una experiencia multipantalla para campañas de rol.
