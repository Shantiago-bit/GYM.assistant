# Respaldos de la base de datos

Guía para respaldar y restaurar la base de Gym Assistant, pensada para quien nunca ha restaurado una base de
datos. Si algo sale mal en producción (se borran datos, se daña una migración, se pierde el proyecto de
Supabase), esto es lo que permite volver atrás.

## Resumen

- Cada día a las **04:00 de Bogotá** (09:00 UTC), GitHub Actions ejecuta `.github/workflows/respaldo.yml`.
- El respaldo se comprime y se **cifra con AES-256** antes de salir del servidor de GitHub. Sin la clave
  `RESPALDO_CLAVE` es ilegible.
- Se guarda **30 días** como artifact del workflow, con el nombre `respaldo-AAAA-MM-DD`.
- Una **prueba de humo** lo descifra en memoria y comprueba que tiene las tablas principales y las cuentas. Si
  falla, el workflow falla y GitHub te avisa por correo.
- En tu computadora: `npm run db:respaldar` hace lo mismo y deja el archivo en `respaldos/`, carpeta que git
  ignora. `npm run db:restaurar` lo restaura en otra base.

> El repositorio es **público**: cualquiera con una cuenta de GitHub puede descargar los artifacts. Por eso solo
> se sube el archivo cifrado, y por eso la clave tiene que ser larga y aleatoria y no puede estar en el código.

## Qué se respalda y qué no

| Se respalda | Por qué |
|---|---|
| Esquema y datos de `public`: ejercicios, sesiones, series, perfiles, días de entrenamiento, guía, chat, registros de correo, autorizaciones de tutores, `_migrations`, etc. | Son los datos de la app. Incluye tablas, funciones, índices, restricciones, RLS y permisos (los `REVOKE` para `anon` y `authenticated`). |
| Datos de `auth.users` y `auth.identities` | Para que las cuentas se puedan restaurar con su correo, su contraseña (guardada cifrada) y su confirmación, y para que las tablas de `public` que apuntan a `auth.users` no queden huérfanas. |
| Disparadores de `auth.users` que llaman a funciones de `public` (hoy `on_auth_user_created`) | `pg_dump` del esquema `public` no los incluye, porque la tabla es de `auth`. Sin ellos, una cuenta nueva no crearía su fila en `public.users`. |

| No se respalda | Qué hacer |
|---|---|
| El resto de `auth` (sesiones abiertas, tokens, auditoría, MFA) | Lo gestiona Supabase y no se debe restaurar. Tras restaurar, cada persona inicia sesión de nuevo con su contraseña. |
| La estructura de `auth`, `storage`, `realtime`, `vault`, las extensiones y los roles | Los crea Supabase en cada proyecto. Restaurarlos rompería el proyecto nuevo. |
| **Las fotos de perfil** (bucket privado `avatares` de Storage) | Hoy no hay ninguna (0 archivos). Las filas de `perfiles` guardan la ruta de cada foto, pero el archivo no. Propuesta, cuando haya fotos: un script que las descargue con la clave de servicio, las empaquete y las cifre con la misma clave, en el mismo workflow, una vez por semana. Si se pierden, la app muestra las iniciales y cada persona puede subir su foto otra vez. |
| Variables de entorno (Vercel), secretos y la configuración de Auth de Supabase (Site URL, URLs de redirección, plantillas) | Se anotan aparte, en un gestor de contraseñas. No son datos de la base. |

### Por qué `pg_dump` y no `supabase db dump`

Supabase documenta `supabase db dump`, que por dentro ejecuta `pg_dump` dentro de un contenedor Docker y separa
roles, esquema y datos. Aquí se usa `pg_dump` directamente con opciones equivalentes:

- No hace falta Docker ni la CLI de Supabase en el ejecutor ni en tu computadora.
- Se elige con precisión qué entra: `public` completo y solo los datos de `auth.users` y `auth.identities`.
- Los roles no hacen falta: la app no crea roles propios y los de Supabase (`anon`, `authenticated`,
  `service_role`) ya existen en cualquier proyecto nuevo.

El archivo tiene, en orden:

1. `SET session_replication_role = replica;`, lo mismo que recomienda Supabase al restaurar datos: así no se
   disparan disparadores mientras se cargan las filas.
2. Los datos de `auth.users` y `auth.identities`: `pg_dump --data-only --table=auth.users --table=auth.identities`.
3. Todo `public`: `pg_dump --schema=public --no-owner --no-publications --no-subscriptions`. El
   `CREATE SCHEMA public` se convierte en `CREATE SCHEMA IF NOT EXISTS`, porque en un proyecto nuevo ya existe.
4. `RESET session_replication_role;` y los disparadores de `auth.users`, como `CREATE OR REPLACE TRIGGER`.

## La conexión y la versión de Postgres

- La base es **Postgres 17**: `SHOW server_version_num` devolvió `170011` en noviembre de 2026. `pg_dump` tiene que
  ser de la misma versión mayor. El workflow instala `postgresql-client-17`, y los scripts comprueban la versión y
  fallan con un mensaje claro si no coincide. Si un día Supabase pasa a Postgres 18, cambia el `17` del workflow.
- `pg_dump` necesita una conexión con sesión propia: la **directa** o el **pooler en modo sesión (puerto 5432)**.
  El pooler en **modo transacción (puerto 6543)**, el de `GYMLEAD_POSTGRES_URL`, no sirve, y los scripts lo
  rechazan.
- Usa el **pooler en modo sesión**. La conexión directa (`db.<proyecto>.supabase.co`) solo funciona por IPv6 en el
  plan gratuito, y los ejecutores de GitHub no tienen IPv6.
- La URL va en variables `PG*` del proceso, nunca en los argumentos ni en los registros. Además, se verifica el
  certificado del servidor con `supabase/ca.crt`.

## Configuración (una sola vez)

### 1. Generar la clave del respaldo

En una terminal, en la carpeta del proyecto:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Te da 43 caracteres aleatorios (256 bits), por ejemplo `q3V…`. Esa es tu `RESPALDO_CLAVE`.

- **Guárdala ya en un gestor de contraseñas** (Bitwarden, 1Password, el de Google o el de tu navegador), con un
  nombre como "Gym Assistant · clave de respaldos".
- No la pegues en ningún archivo del repositorio, issue ni chat.
- Los scripts exigen al menos 24 caracteres.

### 2. Crear los secretos en GitHub

En GitHub: el repositorio → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
Crea dos:

| Nombre | Valor |
|---|---|
| `RESPALDO_POSTGRES_URL` | La URL del **pooler en modo sesión**, la que termina en `:5432/postgres`. Es el valor de `GYMLEAD_POSTGRES_URL_NON_POOLING` de tu `.env.local`. También está en Supabase → tu proyecto → **Connect** → "Session pooler". |
| `RESPALDO_CLAVE` | La clave del paso 1. |

GitHub oculta los secretos en los registros (aparecen como `***`) y no se los entrega a pull requests de forks.

### 3. Para usar los scripts en tu computadora

1. Agrega a `.env.local` la línea `RESPALDO_CLAVE=<la clave>`. `.env.local` está en `.gitignore`.
   `db:respaldar` usa `GYMLEAD_POSTGRES_URL_NON_POOLING`, que ya está ahí.
2. Instala el **cliente de Postgres 17**. En Windows tienes dos opciones:
   - `winget install PostgreSQL.PostgreSQL.17` (en el instalador basta "Command Line Tools").
   - El zip "binaries" de EnterpriseDB, descomprimido en una carpeta.

   Después, si `pg_dump` no queda en el PATH, define `PG_BIN` con su carpeta `bin`. En PowerShell:
   `$env:PG_BIN = "C:\Program Files\PostgreSQL\17\bin"`.
3. `gpg` ya viene con Git for Windows, y los scripts lo encuentran solos.

## Hacer un respaldo

- **Automático**: todos los días a las 04:00 de Bogotá. No hay que hacer nada.
- **Manual en GitHub**: **Actions** → **Respaldo de la base de datos** → **Run workflow** → **Run workflow**. El
  botón aparece cuando el workflow ya está en `main`.
- **En tu computadora**: `npm run db:respaldar`. Deja `respaldos/respaldo-AAAA-MM-DD.sql.gz.gpg`.

Un respaldo correcto termina con una línea como esta:
`Listo: respaldo-2026-11-13.sql.gz.gpg, 85.3 KB. Prueba de humo: 7 marcas encontradas, 1 disparador(es) de auth, no se abre con otra clave.`

## Descargar un respaldo de GitHub

1. **Actions** → **Respaldo de la base de datos** → elige una ejecución con ✓ verde.
2. Abajo, en **Artifacts**, pulsa `respaldo-AAAA-MM-DD`. Se descarga un `.zip`.
3. Descomprímelo: adentro está `respaldo-AAAA-MM-DD.sql.gz.gpg`. Ponlo en la carpeta `respaldos/` del proyecto.

Los artifacts duran **30 días**. Si necesitas guardar uno más tiempo (por ejemplo, antes de una migración
grande), descárgalo y guárdalo cifrado tal cual, en tu nube personal.

## Restaurar en un proyecto nuevo de Supabase, paso a paso

Restaura siempre en una base **vacía**. La restauración es una sola transacción: si algo falla (por ejemplo,
porque las tablas ya existen), no cambia nada y muestra el error.

1. **Crea el proyecto**: en <https://supabase.com/dashboard>, **New project**. Usa la misma región (us-east-1) y
   anota la contraseña de la base. Comprueba en **Settings → Infrastructure** que sea Postgres 17.
2. **Copia su URL del pooler en modo sesión**: **Connect** → "Session pooler", la que termina en `:5432/postgres`.
   Reemplaza `[YOUR-PASSWORD]` por la contraseña del paso 1.
3. **Ten a mano el respaldo** (`respaldos/respaldo-AAAA-MM-DD.sql.gz.gpg`) y la clave en `.env.local`
   (`RESPALDO_CLAVE=…`).
4. **Restaura** (en PowerShell, desde la carpeta del proyecto):

   ```powershell
   npm run db:restaurar -- respaldos/respaldo-2026-11-13.sql.gz.gpg "postgresql://postgres.<nuevo>:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
   ```

   Al terminar muestra solo conteos: cuentas, perfiles, ejercicios, sesiones y series.
5. **Verifica** con las mismas comprobaciones que producción:

   ```powershell
   $env:VERIFICAR_BD_URL = "postgresql://postgres.<nuevo>:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
   npm run db:verificar
   Remove-Item Env:VERIFICAR_BD_URL
   ```

   Debe terminar con `Total de fallas: 0`.
6. **Si este proyecto pasa a ser el de producción**:
   - En Vercel (Settings → Environment Variables), cambia `GYMLEAD_POSTGRES_URL` (pooler en modo transacción,
     6543), `GYMLEAD_POSTGRES_URL_NON_POOLING`, `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL`,
     `NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY` y `GYMLEAD_SUPABASE_SERVICE_ROLE_KEY`, y redespliega.
   - En Supabase, configura Auth (Site URL y URLs de redirección del sitio de Vercel) y crea el bucket privado
     `avatares`.
   - Actualiza el secreto `RESPALDO_POSTGRES_URL` de GitHub.
   - Las contraseñas de las cuentas se conservan, pero las sesiones abiertas no: cada persona inicia sesión de
     nuevo.

**Protección**: `db:restaurar` reconoce la base de producción, por las URLs de tu `.env.local`, y se niega a
restaurar ahí. Si alguna vez hace falta de verdad (por ejemplo, tras perder datos en el mismo proyecto), agrega
`--si-es-produccion`. Como la base no está vacía, primero hay que vaciarla, y eso conviene hacerlo con ayuda: un
error ahí borra datos reales.

## Simulacro mensual (recomendado)

Un respaldo que nunca se restauró no está probado. Una vez al mes, unos 15 minutos:

1. Descarga el respaldo más reciente de GitHub (ver arriba).
2. Restáuralo en un **proyecto de pruebas** de Supabase vacío. El plan gratuito permite dos proyectos activos.
   - Si el proyecto ya tiene datos de un simulacro anterior, bórralo y créalo de nuevo (Settings → General →
     Delete project).
   - O usa una base local de Supabase: `npx supabase start`, que necesita Docker.
3. Ejecuta `npm run db:verificar` contra esa base con `VERIFICAR_BD_URL`. Debe dar 0 fallas.
4. Revisa que el workflow siga activo (siguiente sección) y anota la fecha del simulacro en
   `Doc/ESTADO_EJECUCION.md`.

## Si se pierde `RESPALDO_CLAVE`

**Los respaldos cifrados con esa clave quedan inutilizables.** Nadie puede descifrarlos: ni GitHub, ni Supabase,
ni este proyecto. Por eso tiene que estar en un gestor de contraseñas. Si la pierdes:

1. Genera una clave nueva (paso 1 de "Configuración").
2. Reemplaza el secreto `RESPALDO_CLAVE` en GitHub y la línea de tu `.env.local`.
3. Ejecuta el workflow a mano para tener de inmediato un respaldo válido.
4. Los respaldos anteriores no sirven. Bórralos para no confundirte.

Si crees que la clave **se filtró**, haz lo mismo y borra los artifacts viejos: quien tenga la clave y un artifact
puede leer las cuentas y los datos.

## GitHub desactiva los workflows programados sin actividad

En los repositorios públicos, GitHub **desactiva los workflows programados tras 60 días sin actividad** en el
repositorio (sin commits) y avisa por correo. Para revisarlo:

1. **Actions** → **Respaldo de la base de datos**.
2. Si aparece el aviso "This scheduled workflow is disabled…", pulsa **Enable workflow**.
3. Comprueba que la última ejecución sea de hoy o de ayer.

Hazlo en cada simulacro mensual.

**Avisos de fallo.** GitHub avisa de un fallo programado a quien hizo el último cambio en la línea `cron`, pero
los commits de los agentes usan un autor local que no está ligado a tu cuenta, así que ese aviso podría no
llegarte. Por eso, si el respaldo falla, el propio workflow abre un **issue** "Falló el respaldo de la base de datos
del AAAA-MM-DD" con el enlace a la ejecución, y GitHub te avisa por correo de los issues nuevos de tu repositorio.
Para eso tiene el permiso `issues: write`. Cuando lo corrijas, cierra el issue. Revisa también GitHub → Settings
(tu perfil) → Notifications: deben estar activos los correos de "Watching" del repositorio.
