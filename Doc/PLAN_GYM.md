# Gym Assistant · Plan técnico de implementación

> Asistente de progresión de entrenamiento (sobrecarga progresiva) · versión técnica 1.0, derivada del plan funcional de Santiago Carbono (segunda versión)
> Asignatura: Lógica y Programación (SIST0200) · Universidad Sergio Arboleda, Santa Marta · Docente: Jhonatan Castro Polo
> Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase Postgres · Despliegue en Vercel
> Ejecución: GitHub Copilot en modo Agente, con los prompts de `doc/PROMPTS_GYM.md`

---

## Índice

0. [Cómo se usa este documento](#0-cómo-se-usa-este-documento)
1. [Punto de partida](#1-punto-de-partida)
2. [Advertencia de seguridad previa](#2-advertencia-de-seguridad-previa)
3. [Traducción del stack del plan funcional](#3-traducción-del-stack-del-plan-funcional)
4. [Alcance](#4-alcance)
5. [Acceso](#5-acceso)
6. [La lógica de progresión](#6-la-lógica-de-progresión)
7. [Reglas de negocio](#7-reglas-de-negocio)
8. [Casos de uso](#8-casos-de-uso)
9. [Modelo de datos](#9-modelo-de-datos)
10. [Arquitectura del código](#10-arquitectura-del-código)
11. [Contratos de API](#11-contratos-de-api)
12. [Pantallas](#12-pantallas)
13. [Identidad visual](#13-identidad-visual)
14. [Números, fechas y zona horaria](#14-números-fechas-y-zona-horaria)
15. [Seguridad e integridad](#15-seguridad-e-integridad)
16. [Pruebas](#16-pruebas)
17. [Plan de ejecución](#17-plan-de-ejecución)
18. [Funcionalidades opcionales](#18-funcionalidades-opcionales)
19. [Glosario](#19-glosario)
20. [Datos por usuario](#20-datos-por-usuario)

---

## 0. Cómo se usa este documento

Este plan es el documento rector del proyecto. Copilot lo lee antes de cada tarea y los prompts remiten a sus secciones por número. Si un prompt y este plan no coinciden, prevalece el plan.

| Archivo en el repositorio | Función |
|---|---|
| `doc/PLAN_GYM.md` | Este documento |
| `doc/PROMPTS_GYM.md` | Prompts en orden de ejecución |
| `doc/ESTADO_ACTUAL.md` | Radiografía del repositorio antes de empezar (lo crea P00) |
| `doc/ESTADO_EJECUCION.md` | Avance prompt por prompt |
| `doc/checkpoints/FASE_N_COMPLETADA.md` | Evidencia del cierre de cada fase |
| `.github/copilot-instructions.md` | Reglas permanentes que Copilot aplica en todas las conversaciones |

---

## 1. Punto de partida

### 1.1 Lo que ya existe y no se reconstruye

- Proyecto Next.js con TypeScript desplegado en Vercel.
- Proyecto Supabase conectado (las credenciales del plan funcional lo confirman).
- Login funcionando.
- Variables de entorno en `.env.local` (local) y en el proyecto de Vercel (producción).

### 1.2 Lo que se verifica en P00 antes de escribir código

| Aspecto | Por qué importa |
|---|---|
| Mecanismo del login | El adaptador `lib/auth/sesion.ts` debe envolverlo sin reescribirlo |
| Ruta a la que redirige el login | Se cambia a `/gym` |
| Archivo de middleware existente | En Next.js 16 se llama `proxy.ts`; en versiones anteriores, `middleware.ts` |
| Variable de conexión directa a Postgres | El registro de sesiones y series usa transacciones con `pg`; si no existe, se obtiene en P00 |
| Mecanismo de migraciones existente | Las tablas nuevas se aplican con ese mecanismo; si no existe, se crea `npm run db:migrar` |
| Si los datos hoy están en JSON, en memoria o ya en Supabase | Define cuánto se migra en P01 y P04 |
| Versión de Tailwind | Define dónde se declaran los colores (sección 13) |
| Rutas `/gym` o `/api/gym` | No deben existir antes; si existen, se reporta el conflicto |

### 1.3 Regla sobre el login

El plan funcional deja la autenticación fuera del MVP (sección 3.3), pero en el stack del curso la aplicación queda publicada en una URL de Vercel y las credenciales muestran que ya hay login. Se usa el login existente como puerta única de acceso, sin roles ni usuarios complejos (coherente con el plan: sin "roles administrativos"). Cada cuenta ve y modifica solo sus propios datos (sección 20). El login no se reescribe; solo se agrega el adaptador `lib/auth/sesion.ts` (`obtenerSesion`, `exigirSesion`), la protección de `/gym/*` y `/api/gym/*`, y la redirección posterior al login hacia `/gym`.

---

## 2. Advertencia de seguridad previa

El plan funcional entregado incluía un bloque `.env` completo con credenciales reales de Supabase: la `anon key`, la `SERVICE_ROLE_KEY`, la `SECRET_KEY` y la contraseña de la base de datos. Antes de ejecutar estos prompts:

1. **Rotar las llaves de Supabase:** Settings, API, "Roll" de la `anon key` y la `service_role key`.
2. **Cambiar la contraseña de la base de datos:** Settings, Database, "Reset database password".
3. **Actualizar `.env.local` y las variables de Vercel** con los valores nuevos.
4. **Confirmar que `.env.local` está en `.gitignore`** y que ningún archivo del repositorio ni de la entrega contiene valores de variables de entorno.
5. **No volver a pegar un archivo `.env` en un documento.**

La `SERVICE_ROLE_KEY` salta toda la seguridad de la base de datos: mientras no se rote, cualquiera que haya visto el documento puede leer y modificar los datos. Este paso es obligatorio y previo a todo lo demás.

---

## 3. Traducción del stack del plan funcional

El plan funcional elige Next.js + TypeScript + Tailwind + Vitest (el stack del curso) con persistencia en archivos JSON. El JSON no funciona en Vercel, que es serverless y de sistema de archivos efímero, y el propio plan marca esa decisión como temporal ("deja la base lista para una evolución posterior"). La única pieza que cambia es la persistencia; toda la lógica y las reglas se conservan.

| Pieza del plan funcional | En este plan técnico | Motivo |
|---|---|---|
| Next.js + TypeScript + Tailwind + Vitest | Igual | Ya es el stack del curso |
| Persistencia en archivos JSON (`data/`) | Supabase Postgres | El JSON no persiste en Vercel; el plan ya lo preveía como temporal |
| Lógica de progresión en funciones puras | Igual, en `lib/reglas/` | El plan ya quiere lógica separada y probada con Vitest; se respeta |
| Sin autenticación (MVP) | Login existente como puerta única | La app es pública en Vercel (sección 1.3) |

Lo que **no cambia**: el modelo de dominio (ejercicio, sesión, serie), la distinción entre peso y calistenia, la lógica de doble progresión, la prueba inicial, el histórico y el enfoque minimalista con paleta de verdes.

---

## 4. Alcance

### 4.1 Módulo mínimo (el MVP del plan funcional)

| ID | Funcionalidad (plan funcional) | Casos de uso | Prompts |
|---|---|---|---|
| F1 | Registrar un ejercicio con su tipo (peso o calistenia) y su prueba inicial | CU-01, CU-02 | P04, P05, P07 |
| F2 | Calcular el rango objetivo según el tipo de ejercicio | CU-02 | P02, P04 |
| F3 | Registrar una sesión con sus series (repeticiones y peso) | CU-03 | P04, P05, P08 |
| F4 | Calcular la recomendación de la siguiente sesión (doble progresión) | CU-04 | P02, P04, P08 |
| F5 | Revisar el histórico de progreso de un ejercicio | CU-05 | P06, P08 |

### 4.2 Funcionalidades opcionales (deseables del plan)

| ID | Funcionalidad | Prompts |
|---|---|---|
| F6 | Comparativa de progreso por ejercicio (tendencia simple) | P09 |
| F7 | Varios ejercicios en un mismo entrenamiento (sesión con varios ejercicios) | P09 |
| F8 | Panel de resumen (semanal o mensual) | P09 |

Se construyen solo con la fase 5 cerrada. (El modelo soporta varios ejercicios por sesión desde el inicio; F7 es sobre todo la interfaz para registrarlos juntos.)

### 4.3 Fuera de alcance

Se mantiene la lista del plan funcional: autenticación con roles complejos y multiusuario administrativo, notificaciones por correo o SMS, integraciones con wearables, análisis de nutrición o composición corporal, generación automática de rutinas por IA, y gestión completa de entrenadores, clientes y planes.

### 4.4 Decisiones de alcance de esta versión técnica

| Decisión | Motivo |
|---|---|
| Los datos viven en Supabase Postgres | Para que persistan en producción; el JSON no sirve en Vercel (sección 3) |
| El peso se guarda en gramos enteros (se muestra en kg con decimales) | Permite cargas como 2,5 kg sin usar decimales de punto flotante en la base; 2,5 kg = 2500 g |
| El rango objetivo lo define el tipo de ejercicio, con valores por defecto configurables | El plan dice "calcular el rango objetivo según el tipo"; se fijan defaults (peso 8–12, calistenia 8–15) ajustables |
| La recomendación se calcula a partir de la última sesión del ejercicio y su estado actual (peso/nivel y meta de reps) | El plan: "a partir de la última sesión y del punto de partida real" |
| Solo se sube peso si TODAS las series superan el tope del rango; si no, se trabaja la meta de repeticiones | El plan deja ambiguo el caso mixto (algunas superan, otras no); se fija esta regla explícita (sección 6) |
| En calistenia no se sube peso: la progresión es por repeticiones y, al superar el tope sostenidamente, se sugiere una variante más difícil | El plan: "en calistenia la progresión se evalúa por repeticiones y por la necesidad de una variante más difícil, sin peso que aumentar" |
| Las sesiones y series no se editan ni se eliminan | Son el histórico que sostiene la recomendación; un error se corrige con una sesión nueva |
| Un ejercicio no se elimina; se puede archivar | Conserva su histórico |

---

## 5. Acceso

| Actor | Acceso | Puede hacer |
|---|---|---|
| Usuario (quien entrena) | Login existente como puerta | Registrar ejercicios y su prueba inicial, registrar sesiones, ver la recomendación y el histórico |
| Sistema | Interno | Calcula el rango objetivo, evalúa la sesión y produce la recomendación de progresión |

| Ruta | Sin sesión | Con sesión |
|---|:-:|:-:|
| `/` | Muestra el home | Redirige a `/gym` |
| `/gym/*` | Redirige al login | Sí |
| `/api/gym/*` | 401 | Sí |

---

## 6. La lógica de progresión

Es el núcleo del proyecto: lo que el plan quiere validar con pruebas. Se implementa como funciones puras en `lib/reglas/progresion.ts`.

### 6.1 Conceptos

- **Rango objetivo** `[min, max]`: las repeticiones que se buscan por serie (por ejemplo 8–12 en peso). Lo define el tipo de ejercicio (sección 7, RN-05).
- **Estado actual del ejercicio:** su peso de referencia (en peso) o nivel/variante (en calistenia), y su meta de repeticiones actual.
- **Sesión:** las series ejecutadas, cada una con sus repeticiones (y su peso en el caso de peso).

### 6.2 Doble progresión para ejercicios de peso (RN-06)

Dadas las repeticiones de todas las series de la última sesión y el rango `[min, max]`:

1. **Si todas las series superan el tope** (`reps > max` en todas) → **subir peso**: nuevo peso = peso actual + incremento; la meta de repeticiones vuelve a `min`.
2. **Si todas las series alcanzan al menos el mínimo** (`reps >= min` en todas) **pero no todas superan el tope** → **subir la meta de repeticiones** hacia `max` (mantener el peso; el objetivo de la próxima vez es llegar a `max` en todas).
3. **Si alguna serie queda por debajo del mínimo** (`reps < min`) → **mantener** el peso y la meta.

El incremento de peso por defecto es 2,5 kg (configurable). El caso ambiguo del plan (algunas series superan el tope pero no todas) cae en la regla 2: no se sube peso hasta que **todas** superen el tope.

### 6.3 Progresión para calistenia (RN-07)

Sin peso que aumentar. Dadas las repeticiones de las series y el rango `[min, max]`:

1. **Si todas las series superan el tope** → sugerir **una variante más difícil** (mensaje de progresión de nivel); la meta vuelve a `min` para la nueva variante.
2. **Si todas alcanzan el mínimo pero no todas superan el tope** → **subir la meta de repeticiones** hacia `max`.
3. **Si alguna queda por debajo del mínimo** → **mantener**.

### 6.4 Salida de la recomendación

`recomendarSiguiente` devuelve:

```ts
{
  accion: 'subir_peso' | 'subir_reps' | 'mantener' | 'subir_variante';
  pesoSugeridoGramos: number | null;   // solo en peso; null en calistenia
  metaRepsSugerida: number;            // la meta de reps para la próxima sesión
  mensaje: string;                     // explicación clara para el usuario
}
```

Ejemplos verificables (rango 8–12, peso actual 50 kg, incremento 2,5 kg):

| Series (reps) | Acción | Resultado |
|---|---|---|
| 13, 13, 13 | subir_peso | 52,5 kg, meta 8 |
| 10, 10, 9 | subir_reps | 50 kg, meta 12 |
| 13, 12, 13 | subir_reps | 50 kg, meta 12 (no todas superan el tope) |
| 8, 8, 8 | subir_reps | 50 kg, meta 12 |
| 12, 12, 6 | mantener | 50 kg, meta sin cambio |

---

## 7. Reglas de negocio

| ID | Regla | Origen | Dónde se aplica |
|---|---|---|---|
| RN-01 | El tipo de ejercicio es `peso` o `calistenia` | Plan, sección 3.2 | BD CHECK; `lib/reglas/ejercicio.ts` |
| RN-02 | Un ejercicio de peso tiene un peso de referencia (gramos ≥ 0); uno de calistenia no tiene peso, sino un nivel/variante (texto) | Plan, sección 5 | Dominio; BD |
| RN-03 | El nombre del ejercicio es obligatorio y único por cuenta (sin distinguir mayúsculas) | Plan, sección 5 | BD índice único; Zod |
| RN-04 | La prueba inicial registra el punto de partida: las repeticiones (y el peso, si es de peso) de la primera medición | Plan, secciones 3.1, 3.2 | Servicio: primera sesión marcada como prueba inicial |
| RN-05 | El rango objetivo `[min, max]` lo define el tipo de ejercicio (defaults: peso 8–12, calistenia 8–15), con `min ≤ max` y ambos enteros ≥ 1 | Plan, sección 8 | `lib/config/gym.ts`; `lib/reglas/ejercicio.ts` |
| RN-06 | Doble progresión en peso: todas superan el tope → subir peso; todas alcanzan el mínimo pero no todas superan → subir meta de reps; alguna falla el mínimo → mantener | Plan, sección 4 | `lib/reglas/progresion.ts` |
| RN-07 | Progresión en calistenia: por repeticiones; al superar el tope en todas, sugerir variante más difícil; sin peso que aumentar | Plan, sección 4 | `lib/reglas/progresion.ts` |
| RN-08 | Una sesión tiene al menos una serie; cada serie tiene repeticiones enteras ≥ 0 y, en peso, un peso en gramos ≥ 0 | Plan, sección 5 | `lib/reglas/sesion.ts`; Zod; BD CHECK |
| RN-09 | La recomendación se calcula sobre la última sesión del ejercicio; sin sesiones aún, se guía por la prueba inicial | Plan, sección 4 | Servicio `recomendar` |
| RN-10 | La fecha de la sesión la asigna el sistema (o se elige, no futura) | Agregada | `lib/reglas/fechas.ts` |
| RN-11 | El peso se guarda en gramos enteros; se muestra en kilos | Agregada (sección 4.4) | BD INTEGER; `lib/formato.ts` |
| RN-12 | Las sesiones y series son inmutables; un ejercicio no se elimina, se archiva | Agregada (sección 4.4) | Servicio: la aplicación no ofrece borrarlos (sección 20) |

### 7.1 Validaciones frente a reglas de negocio

| Validación (rechaza datos mal formados) | Regla de negocio (decisión del dominio) |
|---|---|
| El nombre del ejercicio no puede estar vacío | Solo se sube peso si todas las series superan el tope del rango |
| Las repeticiones de una serie son un entero ≥ 0 | En calistenia la progresión es por repeticiones, no por peso |
| El rango objetivo tiene min ≤ max | La recomendación se calcula sobre la última sesión |

---

## 8. Casos de uso

| ID | Entrada | Precondición | Efecto | Errores posibles |
|---|---|---|---|---|
| CU-01 Registrar ejercicio | nombre, tipo, (peso: peso de referencia / calistenia: nivel), rango objetivo opcional | nombre no repetido | Ejercicio creado con su rango objetivo | `DATOS_INVALIDOS`, `EJERCICIO_DUPLICADO` |
| CU-02 Registrar prueba inicial | ejercicio, series de la primera medición | el ejercicio existe y no tiene prueba inicial | Prueba inicial guardada; estado inicial del ejercicio fijado | `EJERCICIO_NO_ENCONTRADO`, `PRUEBA_YA_REGISTRADA`, `DATOS_INVALIDOS` |
| CU-03 Registrar sesión | ejercicio, series (reps y peso si aplica), fecha | el ejercicio existe y tiene prueba inicial | Sesión guardada con sus series | `EJERCICIO_NO_ENCONTRADO`, `PRUEBA_REQUERIDA`, `DATOS_INVALIDOS` |
| CU-04 Consultar recomendación | ejercicio | el ejercicio existe | Acción sugerida (subir peso/reps/variante o mantener) con su explicación | `EJERCICIO_NO_ENCONTRADO` |
| CU-05 Ver histórico | ejercicio | el ejercicio existe | Sesiones del ejercicio, de la más reciente a la más antigua, con sus series | `EJERCICIO_NO_ENCONTRADO` |
| CU-06 Archivar ejercicio | ejercicio | existe | Ejercicio archivado (sale de la lista activa; conserva histórico) | `EJERCICIO_NO_ENCONTRADO` |

### 8.1 Secuencia de CU-03 (registrar sesión)

Todo ocurre dentro de `conTransaccion`:

1. `validarSesion(series, tipo)` (al menos una serie; reps enteras ≥ 0; en peso, peso en gramos ≥ 0).
2. Verificar que el ejercicio existe y tiene prueba inicial (`PRUEBA_REQUERIDA` si no).
3. Insertar la sesión (con su fecha) y sus series.
4. Opcional: recalcular y guardar el estado sugerido del ejercicio (meta de reps, peso de referencia) según la recomendación, o dejar que la recomendación se calcule al consultarla (CU-04). Este plan calcula la recomendación al consultarla, para no acoplar el registro con la sugerencia; el estado del ejercicio (peso de referencia, meta) se actualiza solo cuando el usuario aplica la recomendación al registrar la siguiente sesión.
5. Confirmar y devolver la sesión con sus series.

```ts
export async function registrarSesion(ejercicioId: string, d: DatosSesion): Promise<Sesion> {
  return conTransaccion(async (tx) => {
    const ej = await obtenerEjercicio(tx, ejercicioId);          // EJERCICIO_NO_ENCONTRADO
    if (!ej.tienePruebaInicial) throw new ErrorDeNegocio('PRUEBA_REQUERIDA');
    validarSesion(d.series, ej.tipo);                            // RN-08
    const sesionId = await insertarSesion(tx, { ejercicioId, fecha: d.fecha ?? hoyBogota() });
    for (const [i, s] of d.series.entries()) {
      await insertarSerie(tx, { sesionId, numero: i + 1, reps: s.reps, pesoGramos: s.pesoGramos ?? null });
    }
    return leerSesion(tx, sesionId);
  });
}
```

---

## 9. Modelo de datos

### 9.1 Relaciones

```text
ejercicios 1 ──── N sesiones 1 ──── N series

v_ejercicios = ejercicios + datos de la última sesión (para la recomendación y el resumen)
```

El plan modela ejercicio, sesión y serie. La "prueba inicial" es la primera sesión del ejercicio, marcada como tal. Las migraciones se guardan en `supabase/migrations/` y continúan la numeración existente (P00 la identifica). En este documento se nombran M1 y M2.

### 9.2 M1 · Tablas

```sql
-- M1: tablas de Gym Assistant

CREATE TABLE IF NOT EXISTS ejercicios (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            VARCHAR(120)  NOT NULL,
  tipo              VARCHAR(12)   NOT NULL,                 -- 'peso' | 'calistenia' (RN-01)
  rango_min         SMALLINT      NOT NULL,                 -- rango objetivo (RN-05)
  rango_max         SMALLINT      NOT NULL,
  peso_ref_gramos   INTEGER,                                -- solo en peso (RN-02); gramos (RN-11)
  nivel             VARCHAR(80),                            -- solo en calistenia (variante)
  meta_reps         SMALLINT      NOT NULL,                 -- meta de reps actual
  archivado         BOOLEAN       NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT ejercicios_nombre_minimo CHECK (char_length(btrim(nombre)) >= 1),       -- RN-03
  CONSTRAINT ejercicios_tipo_valido   CHECK (tipo IN ('peso', 'calistenia')),         -- RN-01
  CONSTRAINT ejercicios_rango_valido  CHECK (rango_min >= 1 AND rango_max >= rango_min),  -- RN-05
  CONSTRAINT ejercicios_meta_valida   CHECK (meta_reps >= rango_min AND meta_reps <= rango_max),
  CONSTRAINT ejercicios_peso_segun_tipo CHECK (
    (tipo = 'peso' AND peso_ref_gramos IS NOT NULL AND peso_ref_gramos >= 0) OR
    (tipo = 'calistenia' AND peso_ref_gramos IS NULL))      -- RN-02
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ejercicios_nombre ON ejercicios (lower(btrim(nombre)));  -- RN-03
CREATE INDEX IF NOT EXISTS idx_ejercicios_archivado ON ejercicios (archivado);

CREATE TABLE IF NOT EXISTS sesiones (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ejercicio_id   UUID          NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,  -- RN-12
  fecha          DATE          NOT NULL,
  es_prueba      BOOLEAN       NOT NULL DEFAULT false,      -- true en la primera (prueba inicial, RN-04)
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT sesiones_fecha_no_futura CHECK (fecha <= CURRENT_DATE + 1)  -- margen de zona horaria
);
CREATE INDEX IF NOT EXISTS idx_sesiones_ejercicio ON sesiones (ejercicio_id, fecha DESC, created_at DESC);
-- Una sola prueba inicial por ejercicio:
CREATE UNIQUE INDEX IF NOT EXISTS ux_sesiones_prueba_por_ejercicio
  ON sesiones (ejercicio_id) WHERE es_prueba = true;        -- RN-04

CREATE TABLE IF NOT EXISTS series (
  id            BIGSERIAL     PRIMARY KEY,
  sesion_id     UUID          NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  numero        SMALLINT      NOT NULL,
  reps          SMALLINT      NOT NULL,
  peso_gramos   INTEGER,                                    -- null en calistenia
  CONSTRAINT series_numero_positivo CHECK (numero >= 1),
  CONSTRAINT series_reps_no_neg     CHECK (reps >= 0),      -- RN-08
  CONSTRAINT series_peso_no_neg     CHECK (peso_gramos IS NULL OR peso_gramos >= 0),  -- RN-11
  CONSTRAINT series_unica_por_sesion UNIQUE (sesion_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_series_sesion ON series (sesion_id, numero);

CREATE OR REPLACE FUNCTION gym_actualizar_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ejercicios_updated_at ON ejercicios;
CREATE TRIGGER trg_ejercicios_updated_at BEFORE UPDATE ON ejercicios
  FOR EACH ROW EXECUTE FUNCTION gym_actualizar_updated_at();
```

### 9.3 M2 · Vista de ejercicios y seguridad

```sql
-- M2: vista con la última sesión y cierre de acceso público

CREATE OR REPLACE VIEW v_ejercicios
WITH (security_invoker = true) AS
SELECT
  e.*,
  us.id          AS ultima_sesion_id,
  us.fecha       AS ultima_fecha,
  (SELECT COUNT(*) FROM sesiones s WHERE s.ejercicio_id = e.id) AS total_sesiones
FROM ejercicios e
LEFT JOIN LATERAL (
  SELECT s.id, s.fecha
  FROM sesiones s
  WHERE s.ejercicio_id = e.id
  ORDER BY s.fecha DESC, s.created_at DESC
  LIMIT 1
) us ON true;

ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE series     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ejercicios, sesiones, series FROM anon, authenticated;
REVOKE ALL ON v_ejercicios FROM anon, authenticated;
```

Las tablas quedan sin políticas: la clave pública de Supabase no puede leerlas ni escribirlas. Todo el acceso ocurre en el servidor mediante la conexión directa a Postgres.

### 9.4 Traducción de errores de la base de datos

| Código Postgres | Restricción | Código de negocio |
|---|---|---|
| `23505` | `ux_ejercicios_nombre` | `EJERCICIO_DUPLICADO` |
| `23505` | `ux_sesiones_prueba_por_ejercicio` | `PRUEBA_YA_REGISTRADA` |
| `23503` | llaves foráneas (`ON DELETE RESTRICT`) | `TIENE_SESIONES` |
| `23514` | cualquier CHECK | `DATOS_INVALIDOS` |
| Otro | | `ERROR_INTERNO` (se registra en consola, no se muestra al usuario) |

---

## 10. Arquitectura del código

### 10.1 Capas

```text
Pantallas (app/gym/*) ──────┐
                            ├──► Rutas API (app/api/gym/*) ──► lib/dataService.ts ──► lib/datos/* ──► Postgres
Componentes (components/*) ─┘          │                              │
                                       └──── lib/validacion (Zod)     └──── lib/reglas/* (funciones puras)
```

- `lib/reglas/`: la lógica de progresión, el rango objetivo y las validaciones, como funciones puras. No importan `pg`, ni red, ni el reloj (salvo `fechas.ts`). Se prueban con Vitest. Esta es la capa que el plan quiere validar.
- `lib/datos/`: consultas SQL y casos de uso con transacciones. Solo este directorio importa `lib/db/conexion.ts`.
- `lib/dataService.ts`: fachada única. Las rutas y páginas importan datos solo desde aquí.
- Rutas API: validan con Zod, verifican sesión, llaman a `dataService` y responden con `lib/http/respuestas.ts`.

### 10.2 Árbol de archivos nuevos

```text
.github/copilot-instructions.md
doc/ESTADO_ACTUAL.md
doc/ESTADO_EJECUCION.md
doc/checkpoints/FASE_N_COMPLETADA.md

supabase/migrations/NNNN_gym_tablas.sql
supabase/migrations/NNNN_gym_vista_seguridad.sql

scripts/migrar.mjs                 (solo si no existe mecanismo de migraciones)
scripts/verificar-bd.mjs
scripts/probar-flujo.ts
scripts/limpiar-prueba.mjs
scripts/cargar-demo.ts

lib/config/gym.ts
lib/reglas/errores.ts
lib/reglas/fechas.ts
lib/reglas/ejercicio.ts
lib/reglas/sesion.ts
lib/reglas/progresion.ts
lib/validacion/esquemas.ts
lib/db/conexion.ts
lib/auth/sesion.ts
lib/http/respuestas.ts
lib/formato.ts
lib/datos/tipos.ts
lib/datos/ejercicios.ts
lib/datos/sesiones.ts
lib/datos/recomendacion.ts
lib/dataService.ts

tests/reglas/ayudas.ts
tests/reglas/progresion.test.ts
tests/reglas/ejercicio.test.ts
tests/reglas/sesion.test.ts
vitest.config.ts

app/page.tsx                                  (home sin sesión; con sesión redirige a /gym)
app/gym/layout.tsx
app/gym/page.tsx                              (lista de ejercicios)
app/gym/ejercicios/nuevo/page.tsx
app/gym/ejercicios/[id]/page.tsx              (detalle: recomendación + histórico)
app/gym/ejercicios/[id]/prueba/page.tsx       (registrar prueba inicial)
app/gym/ejercicios/[id]/sesion/page.tsx       (registrar sesión)
app/gym/resumen/page.tsx                       (opcional, F8)

app/api/gym/sesion/route.ts
app/api/gym/ejercicios/route.ts
app/api/gym/ejercicios/[id]/route.ts
app/api/gym/ejercicios/[id]/prueba/route.ts
app/api/gym/ejercicios/[id]/sesiones/route.ts
app/api/gym/ejercicios/[id]/recomendacion/route.ts
app/api/gym/ejercicios/[id]/archivar/route.ts
app/api/gym/resumen/route.ts                   (opcional, F8)

components/ui/Boton.tsx
components/ui/Campo.tsx
components/ui/Selector.tsx
components/ui/Tarjeta.tsx
components/ui/Insignia.tsx
components/ui/Aviso.tsx
components/ui/Modal.tsx
components/ui/EstadoVacio.tsx
components/gym/NavegacionGym.tsx
components/gym/InsigniaTipo.tsx
components/gym/TarjetaEjercicio.tsx
components/gym/FormularioEjercicio.tsx
components/gym/FormularioSeries.tsx
components/gym/TarjetaRecomendacion.tsx
components/gym/HistorialSesiones.tsx
components/gym/ResumenProgreso.tsx            (opcional)
```

### 10.3 Responsabilidades y prohibiciones

| Regla de código | Motivo |
|---|---|
| Identificadores, comentarios y mensajes en español | Coherencia con el dominio |
| La lógica de progresión vive en `lib/reglas/progresion.ts` y se prueba | Es el núcleo que el plan quiere validar |
| El peso se maneja en gramos enteros; se convierte a kg solo para mostrar | RN-11, sección 4.4 |
| Solo se sube peso si todas las series superan el tope | RN-06, sección 6.2 |
| Solo `lib/datos/` importa `lib/db/conexion.ts` | Las rutas no escriben SQL |
| Las rutas solo importan datos desde `lib/dataService.ts` | Fachada única |
| Las rutas `/api/gym/*` llaman `exigirSesion()` como primera instrucción | Sección 1.3 |
| Las sesiones y series se insertan en una transacción | Integridad |
| Fechas como texto `YYYY-MM-DD` entre capas | Evita errores de zona horaria (sección 14) |
| `params` de rutas dinámicas se obtiene con `await params` | Next.js 15 y 16 entregan `params` como Promise |
| No modificar archivos del login salvo la redirección indicada en P03 | Sección 1.3 |

### 10.4 Configuración

```ts
// lib/config/gym.ts
export const RANGO_PESO: [number, number] = [8, 12];        // rango objetivo por defecto, peso (RN-05)
export const RANGO_CALISTENIA: [number, number] = [8, 15];  // rango objetivo por defecto, calistenia
export const INCREMENTO_PESO_GRAMOS = 2500;                 // 2,5 kg (RN-06)
export const ZONA_HORARIA = 'America/Bogota';
export const LIMITE_LISTADO = 500;
```

### 10.5 Firmas de las reglas puras

```ts
// lib/reglas/errores.ts
export type CodigoError =
  | 'DATOS_INVALIDOS' | 'NO_AUTORIZADO'
  | 'EJERCICIO_DUPLICADO' | 'EJERCICIO_NO_ENCONTRADO'
  | 'PRUEBA_YA_REGISTRADA' | 'PRUEBA_REQUERIDA'
  | 'TIENE_SESIONES' | 'ERROR_INTERNO';
export const MENSAJES: Record<CodigoError, string>;     // sección 11.2
export const ESTADO_HTTP: Record<CodigoError, number>;  // sección 11.2
export class ErrorDeNegocio extends Error {
  constructor(public codigo: CodigoError, mensaje?: string, public detalles?: unknown);
}

// lib/reglas/fechas.ts
export function hoyBogota(reloj?: Date): string;                  // 'YYYY-MM-DD'
export function esFechaValida(fecha: string): boolean;
export function esFechaFutura(fecha: string, hoy: string): boolean;

// lib/reglas/ejercicio.ts
export type TipoEjercicio = 'peso' | 'calistenia';
export function rangoPorTipo(tipo: TipoEjercicio): [number, number];  // RN-05, desde config
export function validarEjercicio(d: {
  nombre: string; tipo: TipoEjercicio; pesoRefGramos?: number | null; nivel?: string | null;
  rangoMin?: number; rangoMax?: number;
}): void;  // nombre no vacío; rango min<=max y >=1; peso según tipo (RN-01, RN-02, RN-03, RN-05)

// lib/reglas/sesion.ts
export interface SerieEntrada { reps: number; pesoGramos?: number | null }
export function validarSesion(series: SerieEntrada[], tipo: TipoEjercicio): void;
// al menos una serie; reps enteras >= 0; en peso, pesoGramos entero >= 0; en calistenia, sin peso (RN-08)

// lib/reglas/progresion.ts
export type AccionProgresion = 'subir_peso' | 'subir_reps' | 'mantener' | 'subir_variante';
export interface Recomendacion {
  accion: AccionProgresion;
  pesoSugeridoGramos: number | null;
  metaRepsSugerida: number;
  mensaje: string;
}
export function recomendarSiguiente(d: {
  tipo: TipoEjercicio;
  rango: [number, number];
  pesoActualGramos: number | null;
  metaRepsActual: number;
  repsPorSerie: number[];           // repeticiones de cada serie de la última sesión
}): Recomendacion;  // RN-06 (peso), RN-07 (calistenia); secciones 6.2 a 6.4
```

### 10.6 Firmas de `dataService`

```ts
// Sesión
obtenerSesion(): Promise<{ email: string } | null>

// Ejercicios
listarEjercicios(f?: { incluirArchivados?: boolean }): Promise<FilaEjercicio[]>
crearEjercicio(d: DatosEjercicio): Promise<{ id: string }>
obtenerEjercicio(id: string): Promise<DetalleEjercicio>        // datos + histórico + recomendación
archivarEjercicio(id: string): Promise<void>

// Prueba inicial y sesiones
registrarPruebaInicial(id: string, series: SerieEntrada[]): Promise<Sesion>   // RN-04
registrarSesion(id: string, d: DatosSesion): Promise<Sesion>                  // CU-03
listarSesiones(id: string): Promise<Sesion[]>                                 // histórico, reciente→antiguo

// Recomendación
obtenerRecomendacion(id: string): Promise<Recomendacion>                      // RN-09

// Resumen (opcional, F8)
obtenerResumen(desde: string, hasta: string): Promise<ResumenEntrenamiento>
```

Tipos (`lib/datos/tipos.ts`): `FilaEjercicio { id, nombre, tipo, rango, pesoRefGramos, nivel, metaReps, totalSesiones, ultimaFecha }`; `Serie { numero, reps, pesoGramos }`; `Sesion { id, fecha, esPrueba, series: Serie[] }`; `DetalleEjercicio { ejercicio, sesiones, recomendacion }`; `DatosEjercicio`, `DatosSesion { fecha?, series: SerieEntrada[] }`; `Recomendacion` (de reglas); `ResumenEntrenamiento`.

### 10.7 Conexión y transacciones

```ts
// lib/db/conexion.ts
import { Pool, types, type PoolClient } from 'pg';

types.setTypeParser(1082, (v) => v);                 // DATE → 'YYYY-MM-DD'
types.setTypeParser(1114, (v) => v);                 // TIMESTAMP → texto
types.setTypeParser(1184, (v) => v);                 // TIMESTAMPTZ → texto
types.setTypeParser(20, (v) => parseInt(v, 10));     // BIGINT (COUNT) → number

const globalParaPool = globalThis as unknown as { poolGym?: Pool };

export const pool = globalParaPool.poolGym ?? new Pool({
  connectionString: process.env.DATABASE_URL,        // el nombre real lo confirma P00
  ssl: { ca: fs.readFileSync(path.join(process.cwd(), 'supabase', 'ca.crt'), 'utf8'), rejectUnauthorized: true },
  max: 3,
  idleTimeoutMillis: 10_000,
});
if (process.env.NODE_ENV !== 'production') globalParaPool.poolGym = pool;

export async function consultar<T>(sql: string, valores: unknown[] = []): Promise<T[]> { /* pool.query */ }
export async function conTransaccion<T>(trabajo: (tx: PoolClient) => Promise<T>): Promise<T> { /* BEGIN/COMMIT/ROLLBACK */ }
```

El peso se guarda en gramos enteros, así que no hace falta parser para `NUMERIC`.

---

## 11. Contratos de API

### 11.1 Formato de respuesta

```json
{ "ok": true, "datos": { } }
```

```json
{ "ok": false, "error": { "codigo": "PRUEBA_REQUERIDA", "mensaje": "Registre la prueba inicial antes de la primera sesión.", "detalles": null } }
```

Todas las respuestas llevan `Cache-Control: no-store`.

### 11.2 Códigos de error

| Código | HTTP | Mensaje para el usuario |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | Revise los datos ingresados. |
| `NO_AUTORIZADO` | 401 | Debe iniciar sesión. |
| `EJERCICIO_DUPLICADO` | 409 | Ya existe un ejercicio con ese nombre. |
| `EJERCICIO_NO_ENCONTRADO` | 404 | El ejercicio no existe. |
| `PRUEBA_YA_REGISTRADA` | 409 | Este ejercicio ya tiene una prueba inicial. |
| `PRUEBA_REQUERIDA` | 409 | Registre la prueba inicial antes de la primera sesión. |
| `TIENE_SESIONES` | 409 | El ejercicio tiene sesiones registradas y no se puede eliminar; archívelo. |
| `ERROR_INTERNO` | 500 | Ocurrió un error inesperado. Intente de nuevo. |

### 11.3 Endpoints (todos requieren sesión)

| Método y ruta | Cuerpo o parámetros | Respuesta `datos` |
|---|---|---|
| `GET /api/gym/sesion` | | `{ email }` |
| `GET /api/gym/ejercicios?incluirArchivados=` | | `FilaEjercicio[]` |
| `POST /api/gym/ejercicios` | `{ nombre, tipo, pesoRefKg?, nivel?, rangoMin?, rangoMax? }` | `{ id }` (201) |
| `GET /api/gym/ejercicios/[id]` | | `DetalleEjercicio` |
| `POST /api/gym/ejercicios/[id]/prueba` | `{ series: [{ reps, pesoKg? }] }` | `Sesion` (201) |
| `POST /api/gym/ejercicios/[id]/sesiones` | `{ fecha?, series: [{ reps, pesoKg? }] }` | `Sesion` (201) |
| `GET /api/gym/ejercicios/[id]/recomendacion` | | `Recomendacion` |
| `POST /api/gym/ejercicios/[id]/archivar` | | `{ archivado: true }` |
| `GET /api/gym/resumen?desde=&hasta=` | | `ResumenEntrenamiento` (opcional, F8) |

El peso entra y sale en kilos (`pesoKg`, `pesoRefKg`) en la API y la interfaz; se convierte a gramos enteros en la capa de datos (RN-11). La recomendación llega también dentro de `DetalleEjercicio` para no hacer dos llamadas.

### 11.4 Esquemas Zod (`lib/validacion/esquemas.ts`)

| Esquema | Reglas |
|---|---|
| `esquemaEjercicio` | nombre (1 a 120), tipo enum; si peso, `pesoRefKg` ≥ 0; si calistenia, `nivel` opcional; `rangoMin`/`rangoMax` enteros ≥ 1 opcionales (si faltan, se usan los del tipo) |
| `esquemaSerie` | reps entero ≥ 0, pesoKg ≥ 0 opcional |
| `esquemaSeries` | arreglo no vacío de `esquemaSerie` |
| `esquemaSesion` | fecha opcional (no futura), series (`esquemaSeries`) |
| `esquemaFiltros` | incluirArchivados booleano opcional |

La coherencia peso/tipo y el rango min ≤ max los verifica `lib/reglas/ejercicio.ts`; la conversión de kg a gramos (y el redondeo a gramo entero) se hace al entrar a la capa de datos.

---

## 12. Pantallas

Minimalista, con paleta de verdes, como pide el plan.

| Ruta | Contenido |
|---|---|
| `/` | Sin sesión muestra el home, con datos de ejemplo por ahora; la versión final usará datos reales de los usuarios activos. Con sesión redirige a `/gym`. |
| Layout `/gym` | Verifica la sesión; sin sesión redirige al login. Barra con "Gym Assistant", navegación (Ejercicios; Resumen cuando esté activo), correo y cerrar sesión. Mobile-First. |
| `/gym` · Ejercicios | Lista de `TarjetaEjercicio`: nombre, `InsigniaTipo` (Peso / Calistenia), rango objetivo, estado actual (peso de referencia o nivel, y meta de reps), última sesión. Botón "Nuevo ejercicio". `EstadoVacio` si no hay. |
| `/gym/ejercicios/nuevo` · Nuevo ejercicio | `FormularioEjercicio`: nombre, tipo (selector); si peso, peso de referencia inicial (kg); si calistenia, nivel/variante; rango objetivo (precargado por tipo, editable). Nombre duplicado muestra el mensaje. |
| `/gym/ejercicios/[id]/prueba` · Prueba inicial | `FormularioSeries` para la primera medición (reps y, si es peso, kg por serie). Solo disponible si el ejercicio no tiene prueba aún; si ya la tiene, aviso y enlace al detalle. |
| `/gym/ejercicios/[id]/sesion` · Registrar sesión | `FormularioSeries` para la sesión de hoy (botón para agregar series; reps y kg por serie). Antes de guardar, muestra la meta actual (rango y meta de reps) como referencia. Requiere prueba inicial; si no la hay, redirige a registrarla. |
| `/gym/ejercicios/[id]` · Detalle | Encabezado con nombre, `InsigniaTipo` y estado actual. `TarjetaRecomendacion`: la acción sugerida para la próxima sesión (subir peso a X, subir la meta de reps a Y, mantener, o probar una variante más difícil) con su explicación clara. `HistorialSesiones`: cada sesión con su fecha y sus series (reps y kg), de la más reciente a la más antigua (F5). Botón "Registrar sesión" y acción "Archivar". |
| `/gym/resumen` · Resumen (opcional) | Tendencia por ejercicio y un resumen del periodo. |

### 12.1 Textos fijos

Recomendación (ejemplos que arma `mensaje`):

> Subiste todas las series por encima de 12 reps. Sube el peso a 52,5 kg y vuelve a 8 repeticiones.

> Cumpliste el rango. Mantén 50 kg y apunta a 12 repeticiones en todas las series la próxima vez.

> No alcanzaste el mínimo en todas las series. Mantén 50 kg y repite el objetivo.

> (Calistenia) Superaste el rango en todas las series. Prueba una variante más difícil y vuelve a 8 repeticiones.

---

## 13. Identidad visual

Paleta de verdes, como pide el plan (sección 7).

| Token | Valor | Uso |
|---|---|---|
| `--color-primario` | `#2E7D53` | Verde: botones principales, barra superior |
| `--color-primario-suave` | `#E4F1EA` | Fondos de selección, hover |
| `--color-subir` | `#2F7D4F` | Recomendación de subir (peso/reps/variante) |
| `--color-mantener` | `#5B6770` | Recomendación de mantener |
| `--color-peso` | `#2E7D53` | Tipo peso |
| `--color-calistenia` | `#3B7DA8` | Tipo calistenia |
| `--color-fondo` | `#F5F8F6` | Fondo de página |
| `--color-superficie` | `#FFFFFF` | Tarjetas |
| `--color-texto` | `#1F2933` | Texto principal |
| `--color-texto-suave` | `#52606D` | Texto secundario |
| `--color-borde` | `#DCE5E0` | Bordes y divisores |

Los tokens se agregan a `app/globals.css` sin borrar estilos existentes. Con Tailwind 4 se declaran en `@theme`; con Tailwind 3, en `tailwind.config`.

Criterios: minimalista y centrado en la acción (el plan lo pide); Mobile-First (se entrena con el celular); pesos y reps con fuente tabular (`tabular-nums`); peso en kg con `Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })` + " kg"; fechas con `Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })`; el tipo y la recomendación nunca se comunican solo con color (llevan texto); bordes redondeados de 10 px; sin emojis; tarjetas apiladas en móvil.

---

## 14. Números, fechas y zona horaria

| Regla | Implementación |
|---|---|
| Peso | Gramos enteros en la base y en el código; se muestra en kg. 2,5 kg = 2500 g. La conversión kg→g redondea a gramo entero al entrar a la capa de datos |
| Repeticiones y rango | Enteros |
| "Hoy" (fecha de la sesión) | Con `hoyBogota()` |
| Fechas entre capas | Texto `YYYY-MM-DD` |
| Lectura desde BD | Parsers de `pg` devuelven texto para fechas (sección 10.7) |
| Fecha de sesión no futura | El formulario limita `max` a hoy; el dominio y la base lo validan |

Vercel corre en UTC; Colombia es UTC-5 sin horario de verano. La fecha de la sesión usa `hoyBogota()`; el CHECK de la base usa `CURRENT_DATE + 1` como margen para no rechazar una sesión de "hoy" por el desfase de zona.

---

## 15. Seguridad e integridad

| Medida | Detalle |
|---|---|
| Rotación de credenciales expuestas | Obligatoria y previa (sección 2) |
| Acceso solo con sesión | Middleware o proxy existente y `exigirSesion()` en cada ruta de `/api/gym` |
| Base de datos cerrada al público | RLS activo sin políticas y permisos revocados a `anon` y `authenticated` |
| Integridad de la sesión | La sesión y sus series se insertan en una transacción; una sola prueba inicial por ejercicio (índice único) |
| Datos inmutables | Sesiones y series no se editan ni se borran; un ejercicio se archiva, no se elimina |
| Lógica probada | La progresión vive en funciones puras con pruebas (el plan lo exige como mitigación de "reglas ambiguas") |
| Validación en tres puntos | Formulario (Zod y reglas), API (Zod y reglas) y base (CHECK, UNIQUE, llaves foráneas) |
| SQL parametrizado | Ningún valor se concatena |
| Errores internos | Se registran con `console.error`; el usuario recibe `ERROR_INTERNO` sin detalles técnicos |

---

## 16. Pruebas

### 16.1 Pruebas unitarias de reglas (Vitest)

La lógica de progresión es el centro; se prueba a fondo (el plan lo pide explícitamente).

| ID | Función | Entrada | Resultado esperado |
|---|---|---|---|
| T-01 | `rangoPorTipo` | 'peso' / 'calistenia' | [8,12] / [8,15] |
| T-02 | `validarEjercicio` | nombre " " | `DATOS_INVALIDOS` |
| T-03 | `validarEjercicio` | peso, sin pesoRefGramos | `DATOS_INVALIDOS` (peso según tipo) |
| T-04 | `validarEjercicio` | calistenia con pesoRefGramos | `DATOS_INVALIDOS` |
| T-05 | `validarEjercicio` | rangoMin 12, rangoMax 8 | `DATOS_INVALIDOS` |
| T-06 | `validarEjercicio` | peso, pesoRef 50000 g, rango 8-12 | sin error |
| T-07 | `validarSesion` | [] | `DATOS_INVALIDOS` |
| T-08 | `validarSesion` | peso, serie con reps -1 | `DATOS_INVALIDOS` |
| T-09 | `validarSesion` | peso, serie sin pesoGramos | `DATOS_INVALIDOS` |
| T-10 | `validarSesion` | calistenia, serie con pesoGramos | `DATOS_INVALIDOS` |
| T-11 | `validarSesion` | peso, [{reps:10,pesoGramos:50000}] | sin error |
| T-12 | `recomendarSiguiente` | peso, rango 8-12, 50kg, meta 12, reps [13,13,13] | subir_peso, 52,5 kg (52500 g), meta 8 |
| T-13 | `recomendarSiguiente` | peso, 8-12, 50kg, meta 12, reps [10,10,9] | subir_reps, 50 kg, meta 12 |
| T-14 | `recomendarSiguiente` | peso, 8-12, 50kg, meta 12, reps [13,12,13] | subir_reps (no todas superan el tope), 50 kg, meta 12 |
| T-15 | `recomendarSiguiente` | peso, 8-12, 50kg, meta 12, reps [8,8,8] | subir_reps, 50 kg, meta 12 |
| T-16 | `recomendarSiguiente` | peso, 8-12, 50kg, meta 12, reps [12,12,6] | mantener, 50 kg |
| T-17 | `recomendarSiguiente` | peso, 8-12, 50kg, meta 12, reps [12,12,12] | subir_reps (12 no supera 12, está en el tope), meta 12 |
| T-18 | `recomendarSiguiente` | calistenia, 8-15, null, meta 15, reps [16,16,16] | subir_variante, pesoSugerido null, meta 8 |
| T-19 | `recomendarSiguiente` | calistenia, 8-15, null, meta 15, reps [12,11,10] | subir_reps, null, meta 15 |
| T-20 | `recomendarSiguiente` | calistenia, 8-15, null, meta 15, reps [8,7,9] | mantener, null |
| T-21 | `recomendarSiguiente` | peso, 8-12, 50kg, meta 12, reps [13] (una serie, supera) | subir_peso, 52,5 kg, meta 8 |
| T-22 | `esFechaFutura` | "2030-01-02", hoy "2030-01-01" | `true` |
| T-23 | `esFechaFutura` | "2030-01-01", hoy "2030-01-01" | `false` |

Nota sobre T-17: con reps exactamente en el tope (12 en rango 8–12), no "supera" el tope, así que no sube peso; sube/mantiene la meta de reps. La condición de subir peso es estrictamente `reps > max` en todas.

Comando: `npm test`. Las 23 pruebas deben pasar antes de continuar con la fase 3.

### 16.2 Prueba de flujo contra la base de datos

`scripts/probar-flujo.ts` (`npm run probar:flujo`) usa `dataService` con nombres `Prueba *`. Imprime `OK` o `FALLA` por paso y limpia al final.

| Paso | Operación | Esperado |
|---|---|---|
| 1 | Crear ejercicio "Prueba Press banca" (peso, 50 kg, rango 8-12) | Creado, meta 12 |
| 2 | Crear "prueba press banca" otra vez | `EJERCICIO_DUPLICADO` |
| 3 | Crear ejercicio de peso sin peso de referencia | `DATOS_INVALIDOS` |
| 4 | Registrar una sesión antes de la prueba inicial | `PRUEBA_REQUERIDA` |
| 5 | Registrar prueba inicial de Press banca: [10,10,10] a 50 kg | Prueba guardada (es_prueba true) |
| 6 | Registrar la prueba inicial otra vez | `PRUEBA_YA_REGISTRADA` |
| 7 | Recomendación tras la prueba [10,10,10] en 8-12 | subir_reps, 50 kg, meta 12 |
| 8 | Registrar sesión [13,13,13] a 50 kg | Sesión guardada |
| 9 | Recomendación | subir_peso, 52,5 kg, meta 8 |
| 10 | Registrar sesión [12,12,6] a 52,5 kg | Sesión guardada |
| 11 | Recomendación | mantener, 52,5 kg |
| 12 | Crear "Prueba Dominadas" (calistenia, rango 8-15); prueba inicial [16,16,16] | Creado; recomendación subir_variante |
| 13 | Histórico de Press banca | 3 sesiones (prueba + 2), la más reciente primero |
| 14 | Archivar Press banca; listar sin archivados | No aparece; con incluirArchivados sí |

### 16.3 Aceptación (criterio de terminado)

Se ejecuta en el despliegue de Vercel y se documenta en `doc/ACEPTACION.md`.

| ID | Acción | Resultado esperado |
|---|---|---|
| A-01 | Abrir `/gym` sin sesión | Redirección al login |
| A-02 | Crear el ejercicio "Press banca" (peso, 50 kg, rango 8–12) | Aparece en la lista como tipo Peso |
| A-03 | Intentar un ejercicio con el mismo nombre | Rechazo por duplicado |
| A-04 | Registrar la prueba inicial [10,10,10] a 50 kg | Guardada; el detalle muestra el estado inicial |
| A-05 | Ver la recomendación | "Mantén 50 kg y apunta a 12 reps" |
| A-06 | Registrar una sesión [13,13,13] a 50 kg | Guardada |
| A-07 | Ver la recomendación | "Sube a 52,5 kg y vuelve a 8 reps" |
| A-08 | Registrar una sesión [12,12,6] a 52,5 kg | Guardada |
| A-09 | Ver la recomendación | "Mantén 52,5 kg" |
| A-10 | Crear "Dominadas" (calistenia, rango 8–15) y su prueba [16,16,16] | Recomendación: "Prueba una variante más difícil" |
| A-11 | Intentar registrar una sesión de un ejercicio sin prueba inicial | Rechazo: registre la prueba primero |
| A-12 | Ver el histórico de Press banca | Las sesiones ordenadas, la más reciente primero |
| A-13 | Archivar un ejercicio | Sale de la lista activa; su histórico se conserva |
| A-14 | Cerrar el navegador y volver a entrar | Los datos persisten |
| A-15 | (Opcional) Ver el resumen de progreso | Tendencia por ejercicio |

A-15 corresponde a las opcionales; se verifica tras P09.

---

## 17. Plan de ejecución

| Fase | Prompt | Resultado | Cierre |
|---|---|---|---|
| 0 · Preparación | P00 | Credenciales rotadas; `ESTADO_ACTUAL.md`, `copilot-instructions.md`, `ESTADO_EJECUCION.md`; compilación de base | `FASE_0_COMPLETADA.md` |
| 1 · Base de datos | P01 | M1 y M2 aplicadas; `npm run db:verificar` sin fallas | `FASE_1_COMPLETADA.md` |
| 2 · Reglas | P02 | `lib/config`, `lib/reglas` (progresión incluida), 23 pruebas en verde | `FASE_2_COMPLETADA.md` |
| 3 · Servidor | P03 | Conexión, sesión, respuestas, esquemas, formato; `/api/gym/sesion` protegido | `FASE_3_COMPLETADA.md` |
| 4 · Datos y API | P04, P05 | `lib/datos/*`, `dataService`, rutas; `npm run probar:flujo` sin fallas | `FASE_4_COMPLETADA.md` |
| 5 · Interfaz | P06, P07, P08 | Componentes base, ejercicios, prueba inicial, sesiones, recomendación e histórico | `FASE_5_COMPLETADA.md` |
| 6 · Aceptación | (en P08) | `ACEPTACION.md` con A-01 a A-14; README | `FASE_6_COMPLETADA.md` |
| 7 · Opcionales | P09 | Comparativa, varios ejercicios por sesión, resumen | `FASE_7_COMPLETADA.md` |

Condiciones entre fases: no se inicia una fase sin el archivo de cierre de la anterior; `npm run build` sin errores al final de cada prompt; `npm test` en verde desde P02; cada prompt termina con commit y push, y un fallo de despliegue en Vercel se corrige antes del siguiente prompt.

---

## 18. Funcionalidades opcionales

Se construyen solo con la fase 6 cerrada.

| Prompt | Funcionalidad | Implementación |
|---|---|---|
| P09 | F6 · Comparativa de progreso | Por ejercicio, una tendencia simple a partir de sus sesiones (por ejemplo, peso o reps máximas por sesión en el tiempo); se muestra en el detalle del ejercicio con una lista o un gráfico sencillo |
| P09 | F7 · Varios ejercicios por sesión | La interfaz de "entrenamiento del día" permite registrar series de varios ejercicios en una misma visita; el modelo ya guarda cada sesión por ejercicio, así que es sobre todo una pantalla que agrupa el registro |
| P09 | F8 · Resumen semanal o mensual | `obtenerResumen(desde, hasta)`: número de sesiones, ejercicios trabajados y, por ejercicio, su progreso en el periodo. Ruta `/api/gym/resumen` y pantalla `/gym/resumen` |

---

## 19. Glosario

| Término | Definición |
|---|---|
| Ejercicio | Un movimiento que se entrena; de peso (con carga) o de calistenia (con el propio cuerpo) |
| Prueba inicial | La primera medición de un ejercicio; fija el punto de partida |
| Sesión | Un registro de entrenamiento de un ejercicio en una fecha, con sus series |
| Serie | Una tanda de repeticiones (y peso, si aplica) dentro de una sesión |
| Rango objetivo | El rango de repeticiones que se busca por serie (por ejemplo 8–12) |
| Doble progresión | Subir repeticiones hasta el tope del rango y, cuando se supera en todas las series, subir el peso y volver al mínimo |
| Meta de reps | El objetivo de repeticiones vigente para la próxima sesión |
| Variante | En calistenia, una versión más difícil de un ejercicio (sustituye al "subir peso") |
| Recomendación | La acción sugerida para la próxima sesión: subir peso, subir reps, mantener o cambiar de variante |
| Regla pura | Función de `lib/reglas/` que solo depende de sus parámetros |
| Transacción | Conjunto de escrituras que se confirma completo o se revierte completo |
| Copilot en modo Agente | Modo de GitHub Copilot Chat que lee el repositorio, edita varios archivos y ejecuta comandos de terminal con aprobación |

---

## 20. Datos por usuario

Esta sección prevalece sobre lo que el resto del plan diga de un solo usuario. Se agregó cuando el registro público hizo que todas las cuentas compartieran los mismos ejercicios.

| Decisión | Detalle |
|---|---|
| Dueño | `ejercicios.usuario_id` referencia `auth.users` y es obligatorio (migración M3). Sesiones y series pertenecen a la cuenta a través de su ejercicio |
| Aislamiento | Todas las funciones de `lib/datos/` reciben `usuarioId` como primer parámetro, tomado de la sesión. Nunca se acepta desde el cliente |
| Ejercicio de otra cuenta | Responde `EJERCICIO_NO_ENCONTRADO` (404), para no revelar que existe |
| Nombre | Único por cuenta |
| Eliminar una cuenta | Elimina sus ejercicios, sesiones y series en cascada. Por eso `sesiones.ejercicio_id` usa `ON DELETE CASCADE` en lugar de `RESTRICT`. La aplicación sigue sin ofrecer borrar sesiones ni ejercicios (RN-12) |
| Seguridad en la base | RLS sigue activo sin políticas. El acceso se hace desde el servidor con una conexión que omite RLS, así que el aislamiento depende de `lib/datos/`, y `npm run probar:flujo` lo comprueba |
| Nivel de calistenia | Editable desde el detalle con `POST /api/gym/ejercicios/[id]/nivel` |
