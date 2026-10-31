# Estado de ejecución · Gym Assistant

| Prompt | Estado | Build | Tests | Fecha de cierre |
|---|---|---|---|---|
| P00 Auditoría | completado | correcto | 26 | 2026-10-31 |
| P01 Base de datos | completado | correcto | 26 | 2026-10-31 |
| P02 Reglas de negocio | pendiente | | | |
| P03 Servidor | pendiente | | | |
| P04 Datos | pendiente | | | |
| P05 API | pendiente | | | |
| P06 Interfaz base y ejercicios | pendiente | | | |
| P07 Prueba inicial y sesiones | pendiente | | | |
| P08 Recomendación, histórico y aceptación | pendiente | | | |
| P09 Opcionales | pendiente | | | |

## Bitácora

Cada prompt agrega una sección con: archivos creados, archivos modificados, comandos ejecutados y su resultado, problemas y cómo se resolvieron, pendientes.

### P00 · Auditoría

- **Creados:** `Doc/ESTADO_ACTUAL.md`, `.github/copilot-instructions.md`, `Doc/ESTADO_EJECUCION.md`, `Doc/checkpoints/FASE_0_COMPLETADA.md`.
- **Modificados:** ninguno.
- **Comandos:** `npm run build` correcto; `npx vitest run` con 26 pruebas en verde; consultas de solo lectura a la base con una copia de `pg` fuera del repositorio.
- **Credenciales:** el estudiante confirmó que ya las rotó. No se puede comprobar desde el repositorio.
- **Problema:** la verificación TLS estricta contra Postgres falla por la CA privada de Supabase. El estudiante autorizó `rejectUnauthorized: false`, como dice la sección 10.7 del plan.
- **Pendientes:** ver conflictos y riesgo en la sección 12 de `ESTADO_ACTUAL.md`.

### P01 · Base de datos

- **Creados:** las dos migraciones, `scripts/conexion.mjs`, `scripts/migrar.mjs`, `scripts/verificar-bd.mjs`, `Doc/checkpoints/FASE_1_COMPLETADA.md`.
- **Modificados:** `package.json` (`db:migrar`, `db:verificar`, `pg`, `@types/pg`, `tsx`).
- **Comandos:** `npm run db:migrar` aplicó M1 y M2; `npm run db:verificar` terminó con 0 fallas (salida en el checkpoint de la fase 1); `npm run build` correcto.
- **Problemas:** el caso e de la verificación esperaba la restricción equivocada; ver el checkpoint.
- **Agregado:** `_migrations` queda con RLS activo y sin permisos para `anon` ni `authenticated`, para que no quede expuesta por la API pública.
