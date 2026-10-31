# Fase 3 completada · Servidor

Verificado en local, con Edge y un usuario temporal:

| Comprobación | Resultado |
|---|---|
| `GET /api/gym/sesion` sin sesión | 401 con `NO_AUTORIZADO` en el formato de la sección 11.1 |
| `GET /gym` sin sesión | 307 a `/login` |
| Login real con correo y contraseña | Llega a `/gym` |
| `GET /api/gym/sesion` con sesión | 200 con `{ email }` y `Cache-Control: no-store` |

## Cambios en el login y la protección

| Archivo | Cambio | Motivo |
|---|---|---|
| `src/components/auth/LoginForm.tsx` | El destino por defecto pasa de `/` a `/gym` | Lo pide P03 |
| `src/components/auth/LoginForm.test.tsx` | La prueba espera `/gym` | Sigue el cambio anterior |
| `src/lib/supabase.ts` | `createClient` pasa a `createBrowserClient` de `@supabase/ssr` | Ver abajo |
| `src/middleware.ts` | Archivo nuevo; protege `/gym/:path*` y `/api/gym/:path*` | No había middleware |

## Desviación necesaria del plan

La sección 1.3 pide no tocar el login, salvo la redirección. Sin embargo, el login guardaba la sesión en `localStorage`, y el servidor no puede leerla: ni `obtenerSesion()` ni el middleware podían funcionar. `createBrowserClient` guarda la misma sesión en cookies, con un cambio de una línea y la misma API en los formularios. Efecto: quien tuviera una sesión abierta debe volver a iniciar sesión una vez.

## Otras notas

- `src/app/gym/page.tsx` es un marcador temporal: `typedRoutes` exige que `/gym` exista para compilar. P06 lo reemplaza.
- `traducirErrorPostgres` también se aplica en `consultar` y `conTransaccion`, porque `probar:flujo` usa `dataService` sin pasar por la API y necesita recibir los códigos de negocio.
- Se agregó `esquemaPrueba` para el cuerpo de `POST .../prueba`, y topes a reps y kilos para responder 400 en lugar de desbordar las columnas.
