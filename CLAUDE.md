# Gym Assistant · Reglas para agentes

Reglas para cualquier agente (Claude, Copilot u otro) que trabaje en este repositorio. Las mismas están en
`.github/copilot-instructions.md`, junto con el dominio y las convenciones del código. Documentos rectores:
`Doc/PLAN_GYM.md` (plan técnico), `README.md` y `Doc/ESTADO_EJECUCION.md` (avance).

## El repositorio es público

Cualquiera puede leer el código, los registros de GitHub Actions y descargar los artifacts. Nunca pongas en el
código, en los commits, en los logs ni en los artifacts sin cifrar:

- secretos (claves, tokens, URLs de conexión con contraseña, `RESPALDO_CLAVE`);
- correos, nombres u otros datos reales de usuarios (en pruebas y ejemplos, usa `example.com` o datos inventados);
- respaldos de la base sin cifrar.

Las variables reales van en `.env.local` (ignorado por git), en Vercel o en los secretos de GitHub Actions.

## Forma de trabajar

1. **Una rama por tarea**, creada desde `main` actualizado: `feat/…`, `fix/…`, `docs/…` o `infra/…`. Nunca hagas
   commits directos a `main`.
2. **Antes de abrir el pull request**, todo en verde: `npm run type-check`, `npm run lint`, `npm test` y
   `npm run build`.
3. **Al terminar**, abre un pull request hacia `main` con:
   - un resumen de qué cambia y por qué;
   - la lista de archivos tocados;
   - cómo probarlo (la vista previa de Vercel del pull request, comandos, cuentas de prueba sin datos reales);
   - un aviso claro si incluye migraciones o si hay pasos manuales.
4. **No fusiones el pull request**: lo revisa y lo fusiona el estudiante. El check "CI" debe pasar.
5. **Migraciones**: nunca las apliques en producción sin la autorización explícita del estudiante, y menciónalas en
   el pull request. Hoy las vistas previas de Vercel usan la misma base que producción (ver README, "Cómo
   contribuir"): probar en ellas también toca datos reales.
6. **Bitácora**: agrega una entrada en `Doc/ESTADO_EJECUCION.md`. Ese archivo guarda solo lo reciente; cuando crezca
   demasiado, mueve las entradas viejas a `Doc/historial/` sin cambiar su texto.

## Convenciones del código (resumen)

- Textos, identificadores y comentarios en español.
- Reglas de negocio puras con pruebas en `src/lib/reglas/`; consultas en `src/lib/datos/`, expuestas solo por
  `src/lib/dataService.ts`; validación con Zod en `src/lib/validacion/esquemas.ts`.
- Tablas nuevas con RLS activo, sin políticas y con `REVOKE ALL` para `anon` y `authenticated`.
- No agregues dependencias de producción sin preguntar.
- Nunca uses `SET` de sesión por `GYMLEAD_POSTGRES_URL` (pooler compartido): para leer sin escribir, `BEGIN READ ONLY`.
- Respaldos de la base: `Doc/RESPALDOS.md`.
