# ADR 0003 - Frontera CSRF para mutaciones de navegador

## Estado

Aceptado para `2.0.0-alpha.23`.

## Contexto

La aplicacion usa Bearer para comandos HTTP, token en el handshake Socket.IO y
cookies `httpOnly` para restaurar sesiones. Aunque `SameSite=Lax` reduce riesgo,
las cookies no deben convertir una mutacion cross-site en una operacion
autenticada.

## Decision

Rechazar metodos mutables cuando `Origin` no pertenece a los origenes
configurados o `Sec-Fetch-Site` indica `cross-site`. Las solicitudes no
navegador sin Fetch Metadata siguen permitidas para setup, CLI y healthchecks;
la autorizacion de dominio se aplica despues como hasta ahora.

JWT se firma y verifica exclusivamente con HS256, issuer y audience fijos por
entorno.

## Consecuencias

- Un sitio ajeno no puede aprovechar automaticamente cookies de sesion.
- Los despliegues deben declarar `CLIENT_ORIGIN` con precision.
- Las pruebas y clientes de automatizacion siguen funcionando sin token CSRF
  sincronizado.
