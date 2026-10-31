# Fase 0 completada · Preparación

- **Compilación de base:** `npm run build` correcto. 26 pruebas previas en verde.
- **Dónde viven los datos hoy:** ejercicios, sesiones y series no existen todavía. Solo hay `users` y `restablecimientos_contrasena` en Supabase. No hay migración desde JSON.
- **Variable de conexión:** existe `GYMLEAD_POSTGRES_URL` (Transaction pooler, puerto 6543), en `.env.local` y en Vercel.
- **Mecanismo de login:** Supabase Auth desde el navegador, con la sesión en `localStorage`. No hay middleware ni cierre de sesión.
- **Credenciales:** rotadas, según confirmó el estudiante.

## Decisiones derivadas

| Decisión | Valor |
|---|---|
| Ruta de login | `/login` |
| Archivo de protección | `src/middleware.ts` |
| Migraciones | `scripts/migrar.mjs` con `npm run db:migrar` |
| M1 y M2 | `20261031000000_gym_tablas.sql`, `20261031000100_gym_vista_seguridad.sql` |
| Imports | `@/lib/...`, con todo el código bajo `src/` |

## Riesgos para los siguientes prompts

1. El servidor no puede leer la sesión hasta que esta viaje en cookies (P03).
2. `src/lib/dataService.ts` y `vitest.config.ts` ya existen y deben conservarse.
3. El registro público da acceso a todas las cuentas a los mismos datos.
