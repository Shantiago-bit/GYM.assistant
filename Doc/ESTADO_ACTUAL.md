# Estado actual del repositorio · Gym Assistant

> Auditoría de P00, hecha el 2026-10-31 sobre el commit `15f115b`, antes de implementar el plan.
> La carpeta de documentos en Git se llama `Doc/` (con mayúscula); el plan la nombra `doc/`. En Windows son la misma; en Linux no. Se conserva `Doc/`.

## 1. Versiones

| Paquete | Declarada | Instalada |
|---|---|---|
| next | ^15.3.5 | 15.5.25 |
| react | ^19.0.0 | 19.3.0 |
| typescript | ^5.7.2 | 5.9.3 |
| tailwindcss | ^3.4.16 | 3.4.19 |
| pg | No existe | No existe |
| zod | ^3.23.8 | 3.25.76 |
| @supabase/supabase-js | ^2.118.0 | 2.118.0 |
| vitest | ^2.1.8 | 2.1.9 |

Otros relevantes: `@vercel/connect`, `resend`, `bcryptjs`, `framer-motion`. No existen `@supabase/ssr` ni `tsx`.

## 2. Scripts de package.json

`dev` (`node scripts/tokenVercel.mjs && next dev`), `build`, `start`, `lint`, `type-check`, `test` (`vitest run`), `test:watch`, `format`.

## 3. Estructura

Usa `src/`. Todas las rutas del plan `app/`, `lib/` y `components/` corresponden a `src/app/`, `src/lib/` y `src/components/`.

```text
src/app/
  account/password/page.tsx
  api/auth/{recuperar,restablecer}/route.ts (+ .test.ts)
  api/correo/prueba/route.ts
  api/health/route.ts (+ .test.ts)
  login/page.tsx
  prueba-correo/
  recuperar-contrasena/page.tsx
  registro/page.tsx
  restablecer-contrasena/
  globals.css  layout.tsx  page.tsx
src/components/
  auth/{ChangePasswordForm,LoginForm,RegistroForm}.tsx (+ .test.tsx)  index.ts
  home/HolaMundo.tsx
src/lib/
  correo.ts  dataService.ts  plantillasCorreo.ts  progression.ts  supabase.ts
  tokenRecuperacion.ts  urlBase.ts
src/test/setup.ts
supabase/migrations/20261017000000_create_users.sql
supabase/restablecimientos_contrasena.sql
scripts/tokenVercel.mjs
data/README.md  data/example.json
```

## 4. Alias de importación

`@/*` → `./src/*` y `@data/*` → `./data/*`. El `tsconfig.json` es estricto: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` y `noImplicitReturns`.

`next.config.ts` tiene `typedRoutes: true`.

## 5. Autenticación

- **Mecanismo:** Supabase Auth con correo y contraseña, solo desde el navegador (`supabase.auth.signInWithPassword`).
- **Archivos:** `src/lib/supabase.ts`, `src/components/auth/LoginForm.tsx`, `RegistroForm.tsx`, `ChangePasswordForm.tsx`.
- **Función que lee la sesión:** en el servidor no existe. En el cliente, `supabase.auth.getUser()` y `onAuthStateChange` en `ChangePasswordForm.tsx`.
- **Dónde vive la sesión:** en `localStorage`, porque `src/lib/supabase.ts` usa `createClient` de `supabase-js`. **El servidor no puede leerla**; esto bloquea `obtenerSesion()` y debe resolverse en P03.
- **Ruta de login:** `/login`.
- **Redirección tras entrar:** `src/components/auth/LoginForm.tsx:79`, a `/` (o `/account/password` si llega en `?next=`). `RegistroForm.tsx:59` también va a `/`.
- **Middleware o proxy:** No existe (ni `middleware.ts` ni `proxy.ts`, en la raíz o en `src/`). Con Next 15 el archivo correcto es `src/middleware.ts`.
- **Cierre de sesión:** No existe; nada llama a `signOut`.
- **Registro:** `/registro` es público, y `auth.users` tiene 2 cuentas. Ver riesgo en la sección 12.

## 6. Dónde viven los datos hoy

| Entidad | Ubicación |
|---|---|
| Ejercicios | No existe (solo constantes de ejemplo en `HolaMundo.tsx`) |
| Sesiones | No existe |
| Series | No existe |
| Usuarios | Supabase: `auth.users` y `public.users` |
| Tokens de recuperación | Supabase: `public.restablecimientos_contrasena` |

`data/` solo tiene un ejemplo y `DATA_DIR` no se usa en `src/`. No hay nada que migrar desde JSON ni memoria.

## 7. Acceso a datos

- `src/lib/supabase.ts`: cliente público del navegador.
- `src/lib/dataService.ts`: cliente `supabaseAdmin` con la `SERVICE_ROLE_KEY` y funciones de recuperación de contraseña.
- `pg`: No existe. Archivo de pool: No existe.

## 8. Migraciones

- Carpeta: `supabase/migrations/`, con un archivo: `20261017000000_create_users.sql` (formato de marca de tiempo).
- `supabase/restablecimientos_contrasena.sql` está fuera de esa carpeta.
- Tabla de control: No existe (ni `_migrations` ni `supabase_migrations.schema_migrations`).
- Cómo se aplican: no hay mecanismo; las dos tablas existen en la base, por lo que se aplicaron a mano.

## 9. Variables de entorno (solo nombres)

**`.env.local`:** `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_ANON_KEY`, `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL`, `GYMLEAD_POSTGRES_DATABASE`, `GYMLEAD_POSTGRES_HOST`, `GYMLEAD_POSTGRES_PASSWORD`, `GYMLEAD_POSTGRES_PRISMA_URL`, `GYMLEAD_POSTGRES_URL`, `GYMLEAD_POSTGRES_URL_NON_POOLING`, `GYMLEAD_POSTGRES_USER`, `GYMLEAD_SUPABASE_ANON_KEY`, `GYMLEAD_SUPABASE_JWT_SECRET`, `GYMLEAD_SUPABASE_SECRET_KEY`, `GYMLEAD_SUPABASE_SERVICE_ROLE_KEY`.

**`.env.example`:** `NODE_ENV`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_VERSION`, `DATA_DIR`, `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL`, `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY`.

**Conexión directa a Postgres:** sí existe, `GYMLEAD_POSTGRES_URL` (Transaction pooler, puerto 6543), y también está en Vercel para Preview y Production.

Hallazgos de la conexión:

- La URL trae `sslmode=require`, y `pg` da prioridad a la URL sobre la opción `ssl`. Hay que quitar ese parámetro para que `ssl` tenga efecto.
- La verificación TLS estricta falla (`SELF_SIGNED_CERT_IN_CHAIN`) porque Supabase firma con una CA privada. Se usa `ssl: { rejectUnauthorized: false }` como indica la sección 10.7 del plan, con autorización expresa del estudiante. La conexión va cifrada, pero no verifica la identidad del servidor.

`.env.local`, `.env.development.local` y `.env.respaldo.local` están ignorados por `.env*.local`, y ninguno aparece en el historial de Git. En los documentos versionados no se encontraron credenciales.

## 10. Estilos

- Tailwind 3.4: los colores se declaran en `tailwind.config.ts`, con `content: ['./src/**/*.{js,ts,jsx,tsx,mdx}']`.
- `src/app/globals.css`: variables `--background`, `--foreground`, `--muted`, `--card`, `--border`, `--accent`, `--accent-soft`, `--accent-strong`, y fondo con degradados en `body`.
- Fuente: Inter (`next/font/google`, variable `--font-inter`).
- Íconos: no hay librería.

## 11. Pruebas

Vitest con entorno `jsdom`, `src/test/setup.ts` e `include` limitado a `src/`. Línea base: 8 archivos y 26 pruebas en verde.

`vitest.config.ts` ya existe, por lo que P02 lo amplía en lugar de reemplazarlo: si se cambiara a `environment: 'node'` y a `tests/**`, las pruebas de componentes dejarían de correr.

## 12. Conflictos con el plan

| Elemento | Situación | Resolución |
|---|---|---|
| `src/app/gym`, `src/app/api/gym` | No existen | Sin conflicto |
| `src/components/ui` | No existe | Sin conflicto |
| `src/lib/dataService.ts` | **Ya existe**, con la recuperación de contraseña | Se conserva y se agrega la fachada al mismo archivo |
| `src/lib/progression.ts` | **Ya existe**, sin uso fuera de su prueba, y con reglas distintas (sube peso con `>=`, sube la meta de uno en uno) | P08 la elimina por la regla "progresión solo en `lib/reglas/progresion.ts`" |
| `src/app/page.tsx` | Tiene contenido propio (landing `HolaMundo`) | La sección 5 del plan exige redirigir y P06 pide conservarlo; prevalece el plan. El componente queda en el repositorio sin uso |
| `vitest.config.ts` | Ya existe | Se amplía |
| Tablas `ejercicios`, `sesiones`, `series` | No existen en la base | Sin conflicto |

**Riesgo:** el modelo del plan es de un solo usuario (las tablas no tienen `usuario_id`), pero `/registro` es público. Toda cuenta registrada verá y modificará los mismos ejercicios.

## 13. Decisiones derivadas

| Decisión | Valor |
|---|---|
| Ruta de login | `/login` |
| Archivo de protección | `src/middleware.ts` (no existe; lo crea P03) |
| Mecanismo de migraciones | `scripts/migrar.mjs` + `npm run db:migrar` (lo crea P01) |
| Variable de conexión | `GYMLEAD_POSTGRES_URL` |
| M1 | `supabase/migrations/20261031000000_gym_tablas.sql` |
| M2 | `supabase/migrations/20261031000100_gym_vista_seguridad.sql` |
| Prefijo de imports | `@/lib/...` |

## 14. Compilación de base

`npm run build`: **correcto** (14 páginas). Advertencia previa, sin bloquear: `ESLint: Failed to load config "prettier"`, porque `.eslintrc.json` extiende `prettier` y el paquete no está instalado. El lint no corre durante el build.
