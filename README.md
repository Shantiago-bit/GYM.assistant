# Gym Assistant

Asistente de progresión de entrenamiento con sobrecarga progresiva. Registra tus ejercicios, parte de una prueba inicial y recibe qué hacer en la próxima sesión: subir peso, subir repeticiones, mantener, bajar o probar una variante más difícil. Un chat con IA responde preguntas y arma rutinas a partir de tus datos.

- Sitio publicado: <https://gymlead-five.vercel.app>
- Plan técnico completo: [Doc/PLAN_GYM.md](Doc/PLAN_GYM.md)
- Bitácora de cambios: [Doc/ESTADO_EJECUCION.md](Doc/ESTADO_EJECUCION.md)

## Funcionalidades

**Cuentas**
- Home público con acceso a registro e inicio de sesión; con sesión iniciada lleva directo a `/gym`.
- Registro con confirmación por correo, inicio de sesión, recuperación y cambio de contraseña (Supabase Auth).
- Datos privados por cuenta: nadie ve los ejercicios de otra persona.

**Entrenamiento** (`/gym`)
- Ejercicios de peso o de calistenia, con enfoque (fuerza, hipertrofia o resistencia), rango objetivo y método de series.
- Prueba inicial que fija el punto de partida de cada ejercicio.
- Registro de sesiones con sus series: repeticiones, peso, RIR y técnica (aproximación, AMRAP, rest-pause, myo-reps, drop set).
- Recomendación automática y plan por serie para la próxima sesión, con aviso "¡Meta alcanzada!" al cumplir el rango.
- Histórico, tendencia y 1RM estimado con gráfico de evolución.
- Cambio de enfoque y, en calistenia, de nivel o variante. Archivado sin perder datos.
- Entrenamiento de hoy: varios ejercicios en una sola visita (`/gym/entrenamiento`).
- Resumen de un periodo con el progreso de cada ejercicio (`/gym/resumen`).
- ATLAS, el asistente virtual: un chat con IA que consulta tus datos, responde preguntas y arma rutinas (`/gym/chat`).

## Requisitos

- Node.js 20.6 o superior.
- Un proyecto de Supabase con Postgres.
- Para el chat: una clave de la API de Anthropic.
- Para la recuperación de contraseña: una cuenta de Gmail con contraseña de aplicación.

## Correr en local

```bash
npm install
npm run db:migrar
npm run dev
```

La aplicación abre en <http://localhost:3000>. Antes, crea `.env.local` con estas variables (`.env.example` trae los nombres):

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY` | Clave pública para el login |
| `GYMLEAD_SUPABASE_SERVICE_ROLE_KEY` | Recuperación de contraseña, solo en el servidor |
| `GYMLEAD_POSTGRES_URL` | Conexión a Postgres (Transaction pooler, puerto 6543) |
| `GMAIL_USER` | Cuenta de Gmail que envía el correo de recuperación |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de esa cuenta, solo en el servidor |
| `ANTHROPIC_API_KEY` | Clave de la API de Anthropic para el chat, solo en el servidor |
| `CHAT_LIMITE_DIARIO` | Opcional: mensajes de chat por cuenta y día (40 por defecto) |
| `RESEND_API_KEY`, `RESEND_FROM` | Opcional: respaldo de correo si faltan las variables de Gmail |

En producción, las mismas variables van en Vercel (Settings > Environment Variables), con las claves marcadas como **Sensitive**. Las variables nuevas solo se aplican tras un nuevo despliegue.

`npm run dev` también descarga de Vercel el token que usa el respaldo de Resend.

## Correo

- **Recuperación de contraseña:** la envía la aplicación (`src/lib/correo.ts`). Con `GMAIL_USER` y `GMAIL_APP_PASSWORD` sale por el SMTP de Gmail, con remitente "Gym Assistant", y llega a cualquier dirección (unos 500 correos al día). Sin ellas se usa Resend, que sin un dominio verificado solo entrega al dueño de su cuenta. El enlace vence en 30 minutos y sirve una sola vez.
- **Confirmación de registro:** la envía Supabase Auth. Con su servicio por defecto el límite es de unos 2 correos por hora para todo el proyecto; para más, configura el mismo Gmail en Supabase (Authentication > Emails > SMTP Settings: `smtp.gmail.com`, puerto 465).
- En Supabase (Authentication > URL Configuration), la Site URL debe ser la dirección pública, y `http://localhost:3000/**` debe estar en Redirect URLs para registrarse desde local.

## ATLAS, el asistente virtual

ATLAS es el chat de `/gym/chat` (opción **ATLAS** del menú). Conversa con Claude (`claude-opus-5-5`, esfuerzo bajo) a través de `POST /api/gym/chat`, que responde por partes (una línea JSON por evento) para mostrar el texto a medida que llega.

- El asistente usa tres herramientas de **solo lectura**: `listar_ejercicios`, `ver_ejercicio` y `resumen_periodo` (`src/lib/chat/herramientas.ts`). Siempre consultan con la cuenta de la sesión, nunca con datos que mande el modelo, y los pesos le llegan en kilos.
- No puede crear, editar ni borrar datos; explica en qué sección de la app hacerlo. No da diagnósticos médicos.
- Respaldo ante rechazos: si el modelo rechaza por error una pregunta normal, otro modelo de Claude responde en su lugar (`fallbacks: "default"`).
- Límite diario por cuenta en la tabla `chat_uso` (migración `20261110000000_chat_uso.sql`), controlado con `CHAT_LIMITE_DIARIO`. Al llegar al límite la API responde 429.
- Sin `ANTHROPIC_API_KEY`, la página muestra "El chat todavía no está disponible" (503).
- La conversación se guarda solo en la pestaña del navegador (`sessionStorage`) y se borra con **Nuevo chat**.
- Costo: según los tokens de cada mensaje, del orden de 5 a 10 centavos de dólar. El modelo se cambia en `CHAT_MODELO` (`src/lib/config/gym.ts`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas con Vitest |
| `npm run type-check` | Revisión de tipos |
| `npm run lint` | Revisión con ESLint |
| `npm run db:migrar` | Aplica las migraciones pendientes de `supabase/migrations/` |
| `npm run db:verificar` | Comprueba tablas, seguridad y restricciones, sin dejar cambios |
| `npm run db:demo -- <correo>` | Carga ejercicios `Demo *` en esa cuenta |
| `npm run db:limpiar -- --correo <correo>` | Borra los ejercicios `Prueba *` y `Demo *` de esa cuenta; acepta `--prueba` o `--demo` |
| `npm run probar:flujo` | Recorre el flujo completo con dos cuentas temporales, incluido el aislamiento entre ellas, y las elimina al terminar |

No ejecutes `npm run dev` y `npm run build` a la vez: comparten la carpeta `.next`, y la página queda sin estilos. Si pasa, detén el servidor, borra `.next` y vuelve a iniciarlo.

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

**Técnicas por serie** (`src/lib/reglas/tecnicas.ts`): cada serie puede ser normal, aproximación, AMRAP, rest-pause, myo-reps o drop set. Las tres últimas guardan sus mini series (en drop set, con el peso de cada bajada).

- La meta del rango se mide con las repeticiones de la serie principal (la de activación en myo-reps); las mini series suman al volumen y al total, no al rango.
- Las series de aproximación no cuentan para la progresión, el 1RM ni el volumen; solo aparecen en el histórico.
- En un AMRAP sin RIR anotado, el 1RM asume el fallo.

**RIR (repeticiones en reserva):** cada serie admite un RIR opcional de 0 a 10. Además del salto doble, se usa para el **1RM estimado** (Epley, `src/lib/reglas/fuerza.ts`): se calcula con las repeticiones que la serie permitía (reps + RIR, máximo 12) sobre la mejor serie de cada sesión, y el detalle de los ejercicios de peso lo muestra con un gráfico de evolución.

Al guardar una sesión que cumple la meta, la aplicación muestra una ventana "¡Meta alcanzada!" con el resumen de las series, el volumen y el peso y las repeticiones de la próxima rutina.

**Calistenia:** las reglas son las mismas, pero en lugar de subir peso se sugiere una variante más difícil.

El peso se guarda en gramos enteros (2,5 kg = 2500 g) y se muestra en kilos, para evitar errores de punto flotante.

## Estructura

```text
src/
  app/              home, login, registro y recuperación de contraseña
  app/gym/          pantallas: ejercicios, entrenamiento, resumen y chat
  app/api/gym/      API protegida (incluye /api/gym/chat)
  app/api/auth/     recuperación y restablecimiento de contraseña
  components/ui/    componentes reutilizables
  components/gym/   componentes del dominio
  components/auth/  formularios de cuenta
  lib/reglas/       reglas de negocio puras
  lib/datos/        consultas y transacciones
  lib/chat/         asistente del chat y sus herramientas
  lib/correo.ts     envío de correo (Gmail o Resend)
  lib/dataService.ts  fachada de datos
  middleware.ts     protección de /gym y /api/gym
tests/reglas/       pruebas de las reglas
scripts/            migraciones, verificación y datos demo
supabase/migrations/
Doc/                plan, bitácora y aceptación
```

## Seguridad

- Las credenciales van solo en `.env.local` y en las variables de Vercel. Nunca se versionan ni se pegan en documentos.
- `service_role`, la contraseña de Gmail, la clave de Anthropic y demás secretos no deben ir en variables `NEXT_PUBLIC_*`.
- La conexión a Postgres verifica al servidor con `supabase/ca.crt`, el certificado público de Supabase, que vence el 26 de abril de 2031. Si Supabase lo cambia, hay que descargarlo de nuevo desde Project Settings > Database > SSL Configuration.
- Las tablas del gimnasio (incluida `chat_uso`) tienen RLS activo sin políticas y sin permisos para `anon` ni `authenticated`: solo se accede desde el servidor.
- Cada cuenta ve solo sus datos. La capa de datos y las herramientas del chat filtran por la cuenta de la sesión, y `npm run probar:flujo` comprueba el aislamiento. Eliminar una cuenta elimina sus datos.
- `/gym` y `/api/gym` exigen sesión. La sesión se guarda en cookies para que el servidor pueda verificarla.
- Nunca usar `SET` a nivel de sesión por `GYMLEAD_POSTGRES_URL`: el pooler comparte conexiones. Para consultar sin escribir, usar `BEGIN READ ONLY`.
- La migración `supabase/migrations/20261017000000_create_users.sql` crea `public.users`, con RLS para que cada cuenta solo vea su propio perfil.
