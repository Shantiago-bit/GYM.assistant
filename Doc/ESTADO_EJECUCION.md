# Estado de ejecución · Gym Assistant

| Prompt | Estado | Build | Tests | Fecha de cierre |
|---|---|---|---|---|
| P00 Auditoría | completado | correcto | 26 | 2026-10-31 |
| P01 Base de datos | completado | correcto | 26 | 2026-10-31 |
| P02 Reglas de negocio | completado | correcto | 55 | 2026-10-31 |
| P03 Servidor | completado | correcto | 55 | 2026-10-31 |
| P04 Datos | completado | correcto | 55 | 2026-10-31 |
| P05 API | completado | correcto | 55 | 2026-10-31 |
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

### P02 · Reglas de negocio

- **Creados:** `src/lib/config/gym.ts`, `src/lib/reglas/*`, `src/lib/formato.ts`, `tests/reglas/*`, `Doc/checkpoints/FASE_2_COMPLETADA.md`.
- **Modificados:** `vitest.config.ts`.
- **Comandos:** `npm test` con T-01 a T-23 en verde; `tsc --noEmit` sin errores.
- **Problemas:** ninguno. Las diferencias con el prompt están en el checkpoint de la fase 2.

### P03 · Servidor

- **Creados:** `src/lib/db/conexion.ts`, `src/lib/auth/sesion.ts`, `src/lib/http/respuestas.ts`, `src/lib/validacion/esquemas.ts`, `src/middleware.ts`, `src/app/api/gym/sesion/route.ts`, `src/app/gym/page.tsx` (temporal), `Doc/checkpoints/FASE_3_COMPLETADA.md`.
- **Modificados:** `src/lib/supabase.ts`, `src/components/auth/LoginForm.tsx` y su prueba, `package.json` (`@supabase/ssr`).
- **Comandos:** `npm run build` y `npm test` correctos; 401 sin sesión y 200 con sesión, comprobados en navegador.
- **Problemas:** la sesión vivía en `localStorage` y el servidor no podía leerla. Se resolvió guardándola en cookies; ver el checkpoint de la fase 3.

### P04 · Datos

- **Creados:** `src/lib/datos/tipos.ts`, `ejercicios.ts`, `sesiones.ts`, `recomendacion.ts`, `scripts/limpiar-prueba.mjs`, `scripts/probar-flujo.ts`, `scripts/cargar-demo.ts`.
- **Modificados:** `src/lib/dataService.ts` (la fachada se agregó sin cambiar la recuperación de contraseña), `package.json`.
- **Decisiones:**
  - `registrarSesion` calcula la recomendación vigente antes de insertar y aplica `estadoTrasSesion`. Sin esto, el paso 11 daría 50 kg en lugar de 52,5 kg.
  - `registrarPruebaInicial` fija el peso de referencia con el mayor peso de la prueba (CU-02).
  - Las series entran en kilos a la capa de datos (`SerieKg`), que las convierte a gramos antes de validar (sección 11.3).
  - Un id que no es UUID responde `EJERCICIO_NO_ENCONTRADO`, no un error interno.
  - `cerrarConexiones` se agregó a la fachada para que los scripts no importen `conexion.ts`.
- **Salida de `npm run probar:flujo`:**

```text
OK    Paso 1: creado con meta 12
OK    Paso 2: error EJERCICIO_DUPLICADO
OK    Paso 3: error DATOS_INVALIDOS
OK    Paso 4: error PRUEBA_REQUERIDA
OK    Paso 5: prueba guardada, es_prueba true
OK    Paso 6: error PRUEBA_YA_REGISTRADA
OK    Paso 7: subir_reps, 50000 g, meta 12
OK    Paso 8: sesión guardada con 3 series
OK    Paso 9: subir_peso, 52500 g, meta 8
OK    Paso 10: sesión guardada a 52500 g
OK    Paso 11: mantener, 52500 g
OK    Paso 12: subir_variante, peso null
OK    Paso 13: 3 sesiones, la más reciente primero
OK    Paso 14: archivado: fuera de la lista activa, presente con incluirArchivados
Total de fallas: 0
```

- **Salida de `npm run db:demo`:** Demo Dominadas `subir_variante`, Demo Flexiones `subir_reps`, Demo Press banca `subir_peso`, Demo Sentadilla `mantener`.

### P05 · API

- **Creados:** seis archivos de ruta bajo `src/app/api/gym/ejercicios/`, `Doc/checkpoints/FASE_4_COMPLETADA.md`.
- **Modificados:** `src/lib/http/respuestas.ts` (tipo `ContextoEjercicio`).
- **Comandos:** `npm run build` correcto; verificación HTTP con y sin sesión en el checkpoint de la fase 4.
- **Problemas:** ninguno.

