# Gym Assistant

Asistente de progresión de entrenamiento con sobrecarga progresiva. Registra tus ejercicios, parte de una prueba inicial y recibe qué hacer en la próxima sesión: subir peso, subir repeticiones, mantener o probar una variante más difícil.

El plan técnico completo está en [Doc/PLAN_GYM.md](Doc/PLAN_GYM.md).

## Funcionalidades

- Registro de ejercicios de peso o de calistenia, con su rango objetivo.
- Prueba inicial que fija el punto de partida de cada ejercicio.
- Registro de sesiones con sus series.
- Recomendación automática para la siguiente sesión.
- Histórico por ejercicio y archivado sin perder datos.
- Login, registro, recuperación y cambio de contraseña con Supabase Auth.

## Requisitos

- Node.js 20.6 o superior.
- Un proyecto de Supabase con Postgres.

## Correr en local

```bash
npm install
npm run db:migrar
npm run db:demo
npm run dev
```

Antes, crea `.env.local` con estas variables (`.env.example` trae los nombres):

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY` | Clave pública para el login |
| `GYMLEAD_SUPABASE_SERVICE_ROLE_KEY` | Recuperación de contraseña, solo en el servidor |
| `GYMLEAD_POSTGRES_URL` | Conexión a Postgres (Transaction pooler, puerto 6543) |

La aplicación abre en <http://localhost:3000>. Sin sesión lleva a `/login`; con sesión, a `/gym`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas con Vitest |
| `npm run type-check` | Revisión de tipos |
| `npm run db:migrar` | Aplica las migraciones pendientes de `supabase/migrations/` |
| `npm run db:verificar` | Comprueba tablas, seguridad y restricciones, sin dejar cambios |
| `npm run db:demo` | Carga ejercicios `Demo *` |
| `npm run db:limpiar` | Borra ejercicios `Prueba *` y `Demo *`; acepta `-- --prueba` o `-- --demo` |
| `npm run probar:flujo` | Recorre el flujo completo contra la base y limpia al terminar |

## Cómo funciona la progresión

La lógica vive en `src/lib/reglas/progresion.ts`, como funciones puras con pruebas. Se evalúa la última sesión del ejercicio contra su rango objetivo `[min, max]`.

**Ejercicios de peso (doble progresión):**

| Última sesión | Recomendación |
|---|---|
| Todas las series superan `max` | Subir 2,5 kg y volver a `min` repeticiones |
| Todas alcanzan `min`, pero no todas superan `max` | Mantener el peso y apuntar a `max` repeticiones |
| Alguna serie queda por debajo de `min` | Mantener peso y meta |

Superar es estricto: 12 repeticiones en un rango 8–12 no superan el tope.

**Calistenia:** las reglas son las mismas, pero en lugar de subir peso se sugiere una variante más difícil.

El peso se guarda en gramos enteros (2,5 kg = 2500 g) y se muestra en kilos, para evitar errores de punto flotante.

## Estructura

```text
src/
  app/gym/          pantallas
  app/api/gym/      API protegida
  components/ui/    componentes reutilizables
  components/gym/   componentes del dominio
  lib/reglas/       reglas de negocio puras
  lib/datos/        consultas y transacciones
  lib/dataService.ts  fachada de datos
  middleware.ts     protección de /gym y /api/gym
tests/reglas/       pruebas de las reglas
scripts/            migraciones, verificación y datos demo
supabase/migrations/
Doc/                plan, bitácora y aceptación
```

## Seguridad

- Las credenciales van solo en `.env.local` y en las variables de Vercel. Nunca se versionan ni se pegan en documentos.
- `service_role` y las claves secretas no deben ir en variables `NEXT_PUBLIC_*`.
- Las tablas del gimnasio tienen RLS activo sin políticas y sin permisos para `anon` ni `authenticated`: solo se accede desde el servidor.
- `/gym` y `/api/gym` exigen sesión. La sesión se guarda en cookies para que el servidor pueda verificarla.
- La migración `supabase/migrations/20261017000000_create_users.sql` crea `public.users`, con RLS para que cada cuenta solo vea su propio perfil.
