# Fase 2 completada · Reglas de negocio

Reglas en `src/lib/reglas/` y configuración en `src/lib/config/gym.ts`. Salida resumida de `npm test`:

```text
tests/reglas/ejercicio.test.ts   T-01 a T-06
tests/reglas/sesion.test.ts      T-07 a T-11, T-22 y T-23
tests/reglas/progresion.test.ts  T-12 a T-21
Test Files  3 passed (3)
Tests       29 passed (29)
```

Son las 23 pruebas del plan más 6 adicionales: series vacías, `hoyBogota`, `esFechaValida` y `estadoTrasSesion`. Las pruebas previas del proyecto siguen en verde.

## Diferencias con P02

- `vitest.config.ts` ya existía. Se amplió `include` con `tests/**/*.test.ts` y se conservó `jsdom`, necesario para las pruebas de componentes. Las pruebas de reglas declaran `// @vitest-environment node`.
- `src/lib/formato.ts` se adelantó de P03 a P02, porque los mensajes de progresión usan `formatearPeso`.
- `traducirErrorPostgres` queda en `errores.ts` para que la tabla 9.4 tenga una sola implementación.
- `estadoTrasSesion` es nueva. El paso 11 de la prueba de flujo espera "mantener 52,5 kg", lo que exige actualizar el peso de referencia al aplicar la recomendación (sección 8.1). Esa decisión es lógica de progresión, así que vive aquí y está probada.
