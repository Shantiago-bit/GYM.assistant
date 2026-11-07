# Gym Assistant

Asistente de progresión de entrenamiento con sobrecarga progresiva. Registra tus ejercicios, parte de una prueba inicial y recibe qué hacer en la próxima sesión: subir peso, subir repeticiones, mantener o probar una variante más difícil.

El plan técnico completo está en [Doc/PLAN_GYM.md](Doc/PLAN_GYM.md).

## Funcionalidades

- Registro de ejercicios de peso o de calistenia, con su rango objetivo.
- Prueba inicial que fija el punto de partida de cada ejercicio.
- Registro de sesiones con sus series.
- Recomendación automática para la siguiente sesión.
- Datos privados por cuenta.
- Histórico y tendencia por ejercicio, y archivado sin perder datos.
- Cambio de nivel o variante en calistenia.
- Entrenamiento de hoy: varios ejercicios en una sola visita.
- Resumen del periodo con el progreso de cada ejercicio.
- Login, registro, recuperación y cambio de contraseña con Supabase Auth.

## Requisitos

- Node.js 20.6 o superior.
- Un proyecto de Supabase con Postgres.

## Correr en local

```bash
npm install
npm run db:migrar
npm run dev
```

Antes, crea `.env.local` con estas variables (`.env.example` trae los nombres):

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY` | Clave pública para el login |
| `GYMLEAD_SUPABASE_SERVICE_ROLE_KEY` | Recuperación de contraseña, solo en el servidor |
| `GYMLEAD_POSTGRES_URL` | Conexión a Postgres (Transaction pooler, puerto 6543) |

La aplicación abre en <http://localhost:3000>. Sin sesión muestra el home; con sesión lleva a `/gym`.

Para que los correos de confirmación vuelvan al sitio correcto, en Supabase (Authentication > URL Configuration) la Site URL debe ser la dirección pública, y `http://localhost:3000/**` debe estar en Redirect URLs para registrarse desde local.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas con Vitest |
| `npm run type-check` | Revisión de tipos |
| `npm run db:migrar` | Aplica las migraciones pendientes de `supabase/migrations/` |
| `npm run db:verificar` | Comprueba tablas, seguridad y restricciones, sin dejar cambios |
| `npm run db:demo -- <correo>` | Carga ejercicios `Demo *` en esa cuenta |
| `npm run db:limpiar -- --correo <correo>` | Borra los ejercicios `Prueba *` y `Demo *` de esa cuenta; acepta `--prueba` o `--demo` |
| `npm run probar:flujo` | Recorre el flujo completo con dos cuentas temporales, incluido el aislamiento entre ellas, y las elimina al terminar |

## Cómo funciona la progresión

La lógica vive en `src/lib/reglas/progresion.ts`, como funciones puras con pruebas. Se evalúa la última sesión del ejercicio contra su rango objetivo `[min, max]`.

**Ejercicios de peso (doble progresión):**

| Última sesión | Recomendación |
|---|---|
| Todas las series llegan a `max` (o más) | Subir el peso y volver a `min` repeticiones |
| Lo anterior, con RIR 3 o más anotado en todas las series | Subir el doble del incremento |
| Todas alcanzan `min`, pero no todas llegan a `max` | Mantener el peso y apuntar a `max` repeticiones |
| Alguna serie queda por debajo de `min` | Mantener peso y meta |
| Segunda sesión seguida con alguna serie bajo `min` | Descarga: bajar un 10 % (redondeado a 0,5 kg) y volver a `min` |

Llegar al tope basta: 12 repeticiones en todas las series de un rango 8–12 cumplen la meta. El incremento es de 2,5 kg, o de 5 kg cuando el peso actual es de 50 kg o más (por ejemplo, 12 × 7,5 kg → 10 kg × 8).

**Enfoque:** cada ejercicio tiene un enfoque que sugiere su rango al crearlo y se puede cambiar después desde el detalle: fuerza (3–5 en peso, 3–6 en calistenia), hipertrofia (8–12 / 8–15) o resistencia (15–20 / 15–25).

**Método de series** (`src/lib/reglas/metodos.ts`): define cómo se reparte el peso y qué series deciden la progresión. El peso de referencia es siempre el de la serie más pesada; el plan de la próxima sesión calcula el resto (redondeado a 0,5 kg hacia abajo) y precarga el formulario.

| Método | Plan por serie | Series que deciden la progresión |
|---|---|---|
| Series rectas | Mismo peso en todas | Todas |
| Principal + descarga | 1.ª al peso de referencia; el resto −10 % | La principal |
| Pirámide invertida | −10 % y +2 reps por cada serie | La primera |
| Pirámide ascendente | Sube 10 % por serie hasta el peso de referencia | La última |
| Cluster | Mismo peso; cada serie en bloques de 1–2 reps con 15–30 s de pausa | Todas |

En calistenia solo están disponibles series rectas y cluster.

**RIR (repeticiones en reserva):** cada serie admite un RIR opcional de 0 a 10. Además del salto doble, se usa para el **1RM estimado** (Epley, `src/lib/reglas/fuerza.ts`): se calcula con las repeticiones que la serie permitía (reps + RIR, máximo 12) sobre la mejor serie de cada sesión, y el detalle de los ejercicios de peso lo muestra con un gráfico de evolución.

Al guardar una sesión que cumple la meta, la aplicación muestra una ventana "¡Meta alcanzada!" con el resumen de las series, el volumen y el peso y las repeticiones de la próxima rutina.

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
- La conexión a Postgres verifica al servidor con `supabase/ca.crt`, el certificado público de Supabase, que vence el 26 de abril de 2031. Si Supabase lo cambia, hay que descargarlo de nuevo desde Project Settings > Database > SSL Configuration.
- Las tablas del gimnasio tienen RLS activo sin políticas y sin permisos para `anon` ni `authenticated`: solo se accede desde el servidor.
- Cada cuenta ve solo sus datos. La capa de datos filtra por la cuenta de la sesión, y `npm run probar:flujo` comprueba el aislamiento. Eliminar una cuenta elimina sus datos.
- `/gym` y `/api/gym` exigen sesión. La sesión se guarda en cookies para que el servidor pueda verificarla.
- La migración `supabase/migrations/20261017000000_create_users.sql` crea `public.users`, con RLS para que cada cuenta solo vea su propio perfil.
