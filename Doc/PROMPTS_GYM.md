# Gym Assistant · Prompts para GitHub Copilot

> Plan de referencia: `doc/PLAN_GYM.md`
> Herramienta: GitHub Copilot Chat en modo Agente (VS Code)
> Punto de partida: proyecto desplegado en Vercel, Supabase conectado y login funcionando

---

## Antes de empezar: seguridad (importante)

El plan funcional traía un bloque `.env` completo con credenciales reales de Supabase, incluida la `SERVICE_ROLE_KEY` y la contraseña de la base de datos. Antes de P00:

1. En Supabase, Settings, API: rotar la `anon key` y la `service_role key` ("Roll").
2. En Supabase, Settings, Database: restablecer la contraseña de la base de datos.
3. Actualizar `.env.local` y las variables de Vercel con los valores nuevos.
4. Confirmar que `.env.local` está en `.gitignore`.
5. No volver a pegar un `.env` en la entrega.

No continuar con P00 hasta terminar estos pasos. La `SERVICE_ROLE_KEY` expuesta da acceso total a la base de datos.

## Cómo ejecutar estos prompts

1. Crear la carpeta `doc/` en la raíz del repositorio (si no existe) y copiar allí `PLAN_GYM.md` y `PROMPTS_GYM.md`.
2. Abrir el proyecto en VS Code y abrir Copilot Chat. En el selector de modo elegir **Agent**. En el selector de modelo elegir el más capaz disponible.
3. Cada prompt se ejecuta en una **conversación nueva** (botón `+` del chat).
4. Copiar el bloque gris completo del prompt, pegarlo en el chat y enviarlo. No hay datos que reemplazar.
5. Cuando Copilot pida permiso para ejecutar un comando en la terminal, leerlo y aceptarlo.
6. Al terminar cada prompt: revisar los cambios y aceptarlos (**Keep**); hacer la verificación indicada; hacer commit con el mensaje sugerido y `git push`. Vercel desplegará; si falla, usar el prompt de despliegue fallido antes de continuar.
7. No saltar prompts. Si algo falla, usar el prompt de corrección del final.

| Fase | Prompts |
|---|---|
| 0 · Preparación | P00 |
| 1 · Base de datos | P01 |
| 2 · Reglas de negocio | P02 |
| 3 · Servidor | P03 |
| 4 · Datos y API | P04, P05 |
| 5 · Interfaz | P06, P07, P08 |
| 7 · Opcionales | P09 |

---

## P00 · Auditoría del repositorio y archivos de control

**Fase:** 0 · **Modifica código:** no · **Crea:** `doc/ESTADO_ACTUAL.md`, `.github/copilot-instructions.md`, `doc/ESTADO_EJECUCION.md`, `doc/checkpoints/FASE_0_COMPLETADA.md`

````text
Actúa como ingeniero de software senior trabajando en modo agente sobre este repositorio Next.js.

Contexto: el proyecto "Gym Assistant" (asistente de progresión de entrenamiento con sobrecarga progresiva) ya está desplegado en Vercel, conectado a Supabase y tiene login funcionando. El plan técnico está en doc/PLAN_GYM.md. Este prompt NO implementa funcionalidades: audita el repositorio y crea los archivos de control.

Lee completo doc/PLAN_GYM.md, en especial las secciones 0, 1, 2, 3, 6 y 17.

TAREA 1. Crea doc/ESTADO_ACTUAL.md con estas secciones, llenas con lo que encuentres. No supongas: si algo no existe, escribe "No existe".
1. Versiones (package.json): next, react, typescript, tailwindcss, pg, zod, @supabase/supabase-js, vitest.
2. Scripts de package.json.
3. Estructura: árbol de app/, lib/, components/, supabase/ y scripts/ hasta 3 niveles. Indica si usa src/.
4. Alias de importación en tsconfig.json.
5. Autenticación: archivos; mecanismo; función que lee la sesión y qué devuelve; ruta de login; a dónde redirige tras entrar (archivo y línea); middleware o proxy y su matcher; cómo se cierra sesión.
6. Dónde viven los datos hoy: ¿Supabase Postgres, JSON en data/, memoria? Sé explícito por entidad (ejercicios, sesiones, series).
7. Acceso a datos: clientes de Supabase existentes, uso del paquete pg, archivo de pool si existe.
8. Migraciones: carpeta, archivos, numeración, tabla de control, cómo se aplican.
9. Variables de entorno: solo los NOMBRES en .env.local y .env.example (NUNCA valores). Indica si existe una conexión directa a Postgres y con qué nombre.
10. Estilos: versión de Tailwind, globals.css, tokens de color, fuentes, íconos.
11. Pruebas: framework y pruebas existentes.
12. Conflictos con el plan: existencia previa de app/gym, app/api/gym, lib/dataService.ts y components/ui; contenido de app/page.tsx; tablas existentes llamadas ejercicios, sesiones o series y, si existen, sus columnas.
13. Decisiones derivadas: ruta de login; archivo de protección (proxy.ts o middleware.ts) y si existe; mecanismo de migraciones; nombre de la variable de conexión a Postgres; nombres de M1 y M2 continuando la numeración; prefijo de imports para lib.
14. Compilación de base: resultado de npm run build (TAREA 4).

TAREA 2. Crea .github/copilot-instructions.md reemplazando [AJUSTAR] con lo hallado:

```markdown
# Gym Assistant · Instrucciones para Copilot

## Documentos rectores
- Plan técnico: doc/PLAN_GYM.md. Si una instrucción contradice el plan, prevalece el plan.
- Estado real del repositorio: doc/ESTADO_ACTUAL.md.
- Avance: doc/ESTADO_EJECUCION.md. Se actualiza al final de cada tarea.

## Stack
- Next.js App Router + TypeScript + Tailwind CSS. Despliegue en Vercel.
- Postgres de Supabase con el paquete pg y la variable [AJUSTAR: variable de conexión]. (Si hoy los datos están en [AJUSTAR: JSON/memoria], se migran a Postgres.)
- Validación con Zod. Pruebas con Vitest.
- Login existente: [AJUSTAR]. No se reescribe. Puerta única, sin roles.

## Lo más importante del dominio
- La lógica de progresión (doble progresión) vive en lib/reglas/progresion.ts, como funciones puras probadas. Es el núcleo del proyecto.
- Peso: solo se sube peso si TODAS las series superan el tope del rango; si todas alcanzan el mínimo pero no todas superan, se sube la meta de repeticiones; si alguna falla el mínimo, se mantiene. El incremento por defecto es 2,5 kg.
- Calistenia: sin peso; la progresión es por repeticiones; al superar el tope en todas las series, se sugiere una variante más difícil.
- El peso se guarda en gramos enteros; se muestra en kg (2,5 kg = 2500 g).
- La recomendación se calcula sobre la última sesión del ejercicio.

## Convenciones
- Identificadores, comentarios, mensajes y textos de interfaz en español.
- Reglas de negocio solo en lib/reglas/: funciones puras, sin pg, sin red, sin variables de entorno y sin reloj (excepto fechas.ts). Se prueban con Vitest.
- Solo lib/datos/ importa lib/db/conexion.ts. Rutas y páginas importan datos únicamente desde lib/dataService.ts.
- Toda ruta en app/api/gym/ llama await exigirSesion() como primera instrucción.
- Sesiones y series en una transacción. Una sola prueba inicial por ejercicio.
- Fechas 'YYYY-MM-DD' como texto entre capas. Zona horaria America/Bogota; "hoy" solo con hoyBogota().
- En rutas dinámicas params es una Promise: const { id } = await params.
- SQL siempre con parámetros. Nunca concatenar valores.
- Sesiones y series no se editan ni se borran. Un ejercicio se archiva, no se elimina.
- No instalar librerías de componentes (shadcn, MUI u otras). Usar components/ui/.
- Prefijo de imports para lib: [AJUSTAR]. Archivo de protección: [AJUSTAR]. Ruta de login: [AJUSTAR].

## Al terminar cada tarea
1. npm run build sin errores.
2. npm test sin fallas (desde que exista Vitest).
3. Actualizar doc/ESTADO_EJECUCION.md.
4. No hacer commit: el estudiante revisa y hace el commit.
```

TAREA 3. Crea doc/ESTADO_EJECUCION.md:

```markdown
# Estado de ejecución · Gym Assistant

| Prompt | Estado | Build | Tests | Fecha de cierre |
|---|---|---|---|---|
| P00 Auditoría | pendiente | | | |
| P01 Base de datos | pendiente | | | |
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
```

TAREA 4. Si no existe node_modules, ejecuta npm install. Luego npm run build y registra el resultado en la sección 14 de ESTADO_ACTUAL.md. Si falla, NO corrijas: describe el error.

TAREA 5. Confírmame que las credenciales del plan funcional deben haberse rotado antes de seguir (sección 2 del plan). Si la variable de conexión directa a Postgres no existe en .env.local, explícame cómo obtenerla en Supabase (Connect, Transaction pooler, puerto 6543) y agregarla a .env.local y a Vercel. No continuar con P01 sin ella.

RESTRICCIONES: no modifiques código, configuración ni dependencias. Solo crea los archivos de este prompt.

AL TERMINAR:
- Crea doc/checkpoints/FASE_0_COMPLETADA.md con: resultado de la compilación, dónde viven los datos hoy, existencia de la variable de conexión, mecanismo de login, decisiones derivadas.
- Marca P00 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen y los riesgos para los siguientes prompts.
````

**Verificación del estudiante:** abrir `doc/ESTADO_ACTUAL.md` y confirmar que la sección 5 describe el login real, la 6 dice dónde están los datos y la 9 identifica la conexión a Postgres.

**Commit sugerido:** `docs: auditoría del repositorio y archivos de control para Copilot`

---

## P01 · Base de datos del módulo

**Fase:** 1 · **Crea:** dos migraciones, `scripts/verificar-bd.mjs` y, si hace falta, `scripts/migrar.mjs`

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 7, 9 y 15), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: crear y aplicar las dos migraciones y dejar un script que demuestre que la base protege las reglas (tipo válido, peso según tipo, rango min<=max, una prueba inicial por ejercicio, una serie por número).

TAREA 1. Si ESTADO_ACTUAL.md reporta tablas previas con esos nombres que NO correspondan a este plan, detente y avísame. Si no, crea en supabase/migrations/ dos archivos con los nombres de la sección 13 de ESTADO_ACTUAL.md:
- M1 (tablas) con el SQL exacto de la sección 9.2 del plan.
- M2 (vista y seguridad) con el SQL exacto de la sección 9.3.
No cambies nombres de tablas, columnas ni restricciones: el código depende de ellos (sección 9.4).

TAREA 2. Aplica las migraciones con el mecanismo existente o creando scripts/migrar.mjs (lee la variable de conexión; ssl { rejectUnauthorized: false }; tabla _migrations; aplica en orden alfabético en transacción; imprime "aplicada"/"omitida"; código 1 si falla) y el script "db:migrar". Si hay migraciones anteriores ya aplicadas por otro medio, regístralas sin ejecutarlas y explícalo.

TAREA 3. Crea scripts/verificar-bd.mjs y "db:verificar". Debe imprimir:
1. Existencia de ejercicios, sesiones, series y la vista v_ejercicios.
2. Número de filas de cada tabla.
3. Restricciones (pg_constraint) e índices únicos: ux_ejercicios_nombre, ux_sesiones_prueba_por_ejercicio, series_unica_por_sesion.
4. Si RLS está activo en las tres tablas.
5. Pruebas de integridad en UNA transacción que SIEMPRE termina en ROLLBACK, con SAVEPOINT antes de cada caso que debe fallar:
   a) Crear ejercicio "Verif Press" (peso, peso_ref_gramos 50000, rango 8-12, meta 12): funciona.
   b) Crear "verif press" otra vez: 23505 (ux_ejercicios_nombre).
   c) Crear ejercicio peso sin peso_ref_gramos: 23514 (ejercicios_peso_segun_tipo).
   d) Crear ejercicio calistenia con peso_ref_gramos: 23514.
   e) Crear ejercicio con rango_min 12 y rango_max 8: 23514 (ejercicios_rango_valido).
   f) Crear una sesión es_prueba=true para Verif Press; crear otra sesión es_prueba=true del mismo ejercicio: 23505 (ux_sesiones_prueba_por_ejercicio).
   g) Insertar una serie con reps -1: 23514; insertar dos series con el mismo numero en una sesión: 23505 (series_unica_por_sesion).
   Imprime "OK" o "FALLA" por caso.
6. Total de fallas; código 1 si hubo alguna.

Ejecuta npm run db:verificar y copia la salida en la bitácora.

RESTRICCIONES: no modifiques archivos del login ni de app/. No crees tablas distintas a las del plan.

AL TERMINAR:
- npm run build sin errores.
- Crea doc/checkpoints/FASE_1_COMPLETADA.md con la salida de npm run db:verificar.
- Marca P01 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** en Supabase, Table Editor, deben aparecer `ejercicios`, `sesiones` y `series`. La salida de `npm run db:verificar` no debe tener FALLA, y el caso f debe confirmar que no se permite una segunda prueba inicial.

**Commit sugerido:** `feat(bd): tablas, vista de ejercicios y restricciones de progresión`

---

## P02 · Reglas de negocio y pruebas unitarias

**Fase:** 2 · **Crea:** `lib/config/gym.ts`, `lib/reglas/*`, `tests/reglas/*`, `vitest.config.ts`

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 6, 7, 10.3, 10.4, 10.5, 11.2, 14 y 16.1), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md.

OBJETIVO: implementar las reglas puras y probarlas con Vitest. El núcleo es la lógica de progresión (doble progresión en peso, progresión en calistenia), que el plan exige validar con pruebas.

TAREA 1. Instala vitest (desarrollo). Agrega "test": "vitest run" y "test:ver": "vitest". Crea vitest.config.ts con environment 'node', include ['tests/**/*.test.ts'] y el alias '@' de tsconfig.json.

TAREA 2. Crea lib/config/gym.ts con el contenido exacto de la sección 10.4 (rangos por tipo, incremento de peso en gramos, zona horaria).

TAREA 3. Crea lib/reglas/ con las firmas de la sección 10.5:
- errores.ts: CodigoError; MENSAJES y ESTADO_HTTP (tabla 11.2); clase ErrorDeNegocio.
- fechas.ts: hoyBogota; esFechaValida; esFechaFutura (compara textos YYYY-MM-DD).
- ejercicio.ts: TipoEjercicio; rangoPorTipo (desde config, RN-05); validarEjercicio (nombre no vacío; rango min<=max y >=1; peso según tipo: peso exige pesoRefGramos >= 0, calistenia no lo lleva; RN-01, RN-02, RN-03, RN-05).
- sesion.ts: SerieEntrada; validarSesion(series, tipo) (al menos una serie; reps enteras >= 0; en peso cada serie con pesoGramos entero >= 0; en calistenia sin pesoGramos; RN-08).
- progresion.ts: AccionProgresion; Recomendacion; recomendarSiguiente(d) EXACTAMENTE como las secciones 6.2 a 6.4:
  · peso: si TODAS las series tienen reps > max → subir_peso (pesoSugeridoGramos = pesoActualGramos + INCREMENTO_PESO_GRAMOS, metaRepsSugerida = min); si alguna reps < min → mantener (peso y meta actuales); en otro caso (todas >= min, no todas > max) → subir_reps (peso actual, metaRepsSugerida = max).
  · calistenia: si TODAS > max → subir_variante (pesoSugerido null, meta = min); si alguna < min → mantener; en otro caso → subir_reps (meta = max).
  · mensaje: una frase clara en español según la acción (ver sección 12.1).
  Ojo: "superar el tope" es estrictamente reps > max; reps == max NO supera (prueba T-17).

Ninguna regla importa pg, red, next ni process.env, ni llama new Date() (excepto el parámetro por defecto de hoyBogota).

TAREA 4. Crea tests/reglas/ayudas.ts con esperarCodigo(fn, codigo).

TAREA 5. Crea las pruebas en tests/reglas/ (progresion, ejercicio, sesion) cubriendo T-01 a T-23 de la sección 16.1. Cada caso con su ID. La prueba de progresión es la más importante: cubre T-12 a T-21 con los valores exactos (p. ej. [13,13,13] → subir_peso 52,5 kg meta 8; [13,12,13] → subir_reps; [12,12,12] → subir_reps porque 12 no supera el tope 12; calistenia [16,16,16] → subir_variante).

TAREA 6. Ejecuta npm test hasta que pasen las 23. Si una falla, corrige la regla, no la prueba, salvo que contradiga el plan; explícalo.

RESTRICCIONES: no toques app/, el login ni la base de datos.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_2_COMPLETADA.md con la salida de npm test.
- Marca P02 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** `npm test` (23 pruebas). Abrir `lib/reglas/progresion.ts` y comprobar que solo sube peso cuando todas las series superan el tope, y que 12 reps en un rango 8–12 no cuenta como superar.

**Commit sugerido:** `feat(reglas): lógica de progresión (peso y calistenia) con 23 pruebas`

---

## P03 · Infraestructura del servidor

**Fase:** 3 · **Crea:** conexión, sesión, respuestas, esquemas, formato y `/api/gym/sesion` · **Modifica:** protección de rutas y redirección del login

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 1.3, 9.4, 10.1, 10.3, 10.7, 11.1, 11.2, 11.4, 13 y 14), doc/ESTADO_ACTUAL.md (sección 5) y doc/ESTADO_EJECUCION.md.

OBJETIVO: dejar lista la infraestructura del servidor.

TAREA 1. lib/db/conexion.ts como la sección 10.7. Usa el nombre real de la variable de conexión. Si ya hay pool, reutilízalo agregando los parsers.

TAREA 2. lib/auth/sesion.ts: obtenerSesion() (del login; devuelve { email } o null) y exigirSesion() (lanza NO_AUTORIZADO si no hay). Solo importa funciones del login; no modifica sus archivos.

TAREA 3. Protección de rutas en el archivo indicado: agrega /gym/:path* y /api/gym/:path* al matcher, conservando lo existente. Sin sesión: páginas redirigen al login; /api/gym responde 401 con el formato de la sección 11.1. Si no es posible en ese archivo, protege en el layout de /gym (P06) y en exigirSesion(), y anótalo.

TAREA 4. Cambia SOLO el destino de la redirección posterior al login a /gym.

TAREA 5. lib/http/respuestas.ts: responderOk; responderError (ErrorDeNegocio → ESTADO_HTTP; ZodError → 400 DATOS_INVALIDOS con flatten; pg 23505/23503/23514 → tabla 9.4 por error.constraint; otro → console.error y 500 ERROR_INTERNO); conManejoDeErrores; leerCuerpo. Todas con Cache-Control: no-store.

TAREA 6. lib/validacion/esquemas.ts con los esquemas de la sección 11.4, con tipos z.infer. El peso entra en kg (pesoKg, pesoRefKg). No importa nada del servidor.

TAREA 7. lib/formato.ts: formatearPeso (recibe gramos, muestra kg: 2500 → "2,5 kg"); kgAGramos(kg) (redondea a gramo entero); gramosAKg(g); formatearFecha (Intl es-CO, dateStyle medium, timeZone UTC).

TAREA 8. app/api/gym/sesion/route.ts: GET con conManejoDeErrores; primera instrucción await exigirSesion(); responde { email }. export const dynamic = 'force-dynamic'.

VERIFICACIÓN: npm run build y npm test. Inicia npm run dev; sin sesión, GET /api/gym/sesion da 401. Pídeme que inicie sesión y abra http://localhost:3000/api/gym/sesion; espera mi confirmación de 200. Comprueba que el login redirige a /gym (puede mostrar 404 hasta P06).

AL TERMINAR:
- Crea doc/checkpoints/FASE_3_COMPLETADA.md con los resultados y el diff resumido de lo que tocaste del login o la protección.
- Marca P03 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** `/api/gym/sesion` da 401 sin sesión y 200 con sesión; el login lleva a `/gym`.

**Commit sugerido:** `feat(servidor): conexión, sesión y utilidades de API`

---

## P04 · Datos: ejercicios, sesiones y recomendación

**Fase:** 4 (primera parte) · **Crea:** `lib/datos/*`, `lib/dataService.ts`, `scripts/limpiar-prueba.mjs`, `scripts/probar-flujo.ts`, `scripts/cargar-demo.ts`

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 6, 7, 8, 8.1, 9.4, 10.5, 10.6 y 16.2), doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Revisa lib/reglas/, lib/db/conexion.ts y lib/validacion/esquemas.ts.

OBJETIVO: implementar el acceso a datos y los casos de uso, con transacciones, y comprobar el flujo contra la base. La recomendación se calcula con lib/reglas/progresion.ts sobre la última sesión.

TAREA 1. lib/datos/tipos.ts con los tipos de la sección 10.6. Reutiliza los tipos de lib/reglas (TipoEjercicio, SerieEntrada, Recomendacion, AccionProgresion).

TAREA 2. lib/datos/ejercicios.ts:
- listarEjercicios({ incluirArchivados }): desde v_ejercicios; por defecto solo activos; incluye total de sesiones y última fecha.
- crearEjercicio(d): validarEjercicio; el rango viene del tipo si no se especifica (rangoPorTipo); meta_reps inicial = rango_max; convierte pesoRefKg a gramos; EJERCICIO_DUPLICADO si choca.
- obtenerEjercicio(id): el ejercicio con su histórico (listarSesiones) y su recomendación (obtenerRecomendacion); EJERCICIO_NO_ENCONTRADO si no.
- obtenerEjercicioBasico(tx, id) (interna): para otras operaciones; indica si tiene prueba inicial.
- archivarEjercicio(id): archivado = true.

TAREA 3. lib/datos/sesiones.ts:
- registrarPruebaInicial(id, series): el ejercicio no debe tener prueba (PRUEBA_YA_REGISTRADA); validarSesion; en transacción, inserta la sesión con es_prueba=true y sus series (peso en gramos). Devuelve la sesión.
- registrarSesion(id, d): secuencia de la sección 8.1 (el ejercicio debe tener prueba inicial, si no PRUEBA_REQUERIDA; validarSesion; insertar la sesión con su fecha y sus series). Devuelve la sesión.
- listarSesiones(id): sesiones del ejercicio con sus series, de la más reciente a la más antigua (RN-09, histórico).

TAREA 4. lib/datos/recomendacion.ts: obtenerRecomendacion(id): lee el ejercicio (rango, peso de referencia en gramos, meta de reps) y su última sesión; si hay sesión, toma las reps por serie y llama recomendarSiguiente; si solo hay prueba inicial, úsala como última sesión; si no hay ninguna, devuelve una recomendación neutra ("Registra tu prueba inicial"). Reexporta en dataService.

TAREA 5. lib/dataService.ts como fachada: reexporta las funciones públicas y los tipos. Verifica que ningún archivo fuera de lib/datos importe lib/db/conexion.ts.

TAREA 6. scripts/limpiar-prueba.mjs con "db:limpiar": borra (en orden series, sesiones, ejercicios) los ejercicios cuyo nombre empiece por 'Prueba' o 'Demo' con sus sesiones y series. Imprime el conteo. Opciones --prueba y --demo.

TAREA 7. Instala tsx (desarrollo). Crea scripts/probar-flujo.ts con los 14 pasos de la sección 16.2 usando solo dataService. Imprime OK/FALLA por paso; para los pasos que esperan error, verifica el código; limpia antes y en finally; cierra el pool; código 1 si hay fallas. "probar:flujo": "tsx --env-file=.env.local scripts/probar-flujo.ts" (o la variante con --import tsx). CRÍTICO: el paso 9 debe comprobar que tras [13,13,13] la recomendación es subir_peso a 52,5 kg; el paso 11 que tras [12,12,6] es mantener; el paso 12 que calistenia [16,16,16] sugiere variante. Ejecuta y corrige hasta 0 fallas.

TAREA 8. scripts/cargar-demo.ts con "db:demo": crea ~4 ejercicios demo (2 de peso, 2 de calistenia) con su prueba inicial y una o dos sesiones, para ver recomendaciones variadas. Limpia los demo antes. Imprime una tabla con nombre, tipo y la recomendación actual. Ejecútalo.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P04 en ESTADO_EJECUCION.md y agrega la salida de probar:flujo y db:demo en la bitácora. La fase 4 sigue abierta hasta P05.
- Muéstrame un resumen.
````

**Verificación del estudiante:** `npm run probar:flujo` (14 OK, 0 fallas). El paso 9 confirma la subida de peso y el 12 la sugerencia de variante en calistenia.

**Commit sugerido:** `feat(datos): ejercicios, sesiones y recomendación con prueba de flujo`

---

## P05 · API

**Fase:** 4 (cierre) · **Crea:** rutas de `app/api/gym/`

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 11.1 a 11.4), doc/ESTADO_EJECUCION.md, lib/dataService.ts, lib/http/respuestas.ts, lib/validacion/esquemas.ts y lib/auth/sesion.ts.

OBJETIVO: exponer las operaciones del módulo mínimo con rutas protegidas.

TAREA 1. Crea las rutas del módulo mínimo de la tabla 11.3 (deja /api/gym/resumen para P09). Reglas de cada handler:
- Primera instrucción: await exigirSesion().
- conManejoDeErrores; cuerpos con leerCuerpo y los esquemas de 11.4; filtros validados.
- [id] con await params.
- export const dynamic = 'force-dynamic'.
- POST de ejercicios, prueba y sesiones responden 201. El peso entra en kg y se convierte a gramos en la capa de datos.
- GET /api/gym/ejercicios/[id] devuelve el DetalleEjercicio (incluida la recomendación); GET .../recomendacion solo la recomendación.

TAREA 2. Verificación sin sesión: con npm run dev, GET /api/gym/ejercicios y POST /api/gym/ejercicios deben dar 401.

TAREA 3. Verificación con sesión: pídeme que inicie sesión. Crea un ejercicio de peso; registra su prueba inicial; registra una sesión [13,13,13]; consulta la recomendación (debe sugerir subir a 52,5 kg); intenta registrar una sesión de un ejercicio sin prueba (409 PRUEBA_REQUERIDA). Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_4_COMPLETADA.md con probar:flujo (P04) y las verificaciones.
- Marca P05 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** las rutas dan 401 sin sesión; con sesión, registrar una sesión y consultar la recomendación devuelve la acción sugerida con su peso en kg.

**Commit sugerido:** `feat(api): rutas de ejercicios, sesiones y recomendación`

---

## P06 · Interfaz base y lista de ejercicios

**Fase:** 5 · **Crea:** `components/ui/*`, layout de `/gym`, lista de ejercicios · **Modifica:** `app/globals.css`, `app/page.tsx`

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 5, 6, 11, 12, 13), doc/ESTADO_ACTUAL.md (secciones 5, 10, 12), doc/ESTADO_EJECUCION.md, lib/dataService.ts y lib/formato.ts.

OBJETIVO: componentes reutilizables, navegación y la lista de ejercicios. Minimalista, con paleta de verdes, Mobile-First (lo pide el plan).

TAREA 1. Agrega los tokens de color de la sección 13 (verdes) sin borrar nada existente: con Tailwind 4 en @theme de app/globals.css; con Tailwind 3 en tailwind.config.

TAREA 2. components/ui/: Boton (primario verde, secundario, peligro, fantasma; prop cargando), Campo, Selector, Tarjeta, Insignia (tono neutro, peso, calistenia, subir, mantener), Aviso (info, exito, advertencia, error), Modal (fondo oscuro, cierre con Escape y botón, foco al abrir, role dialog), EstadoVacio. Foco visible y contraste.

TAREA 3. app/page.tsx: redirección a /gym (si tiene contenido propio, añade un enlace a /gym sin borrarlo).

TAREA 4. components/gym/NavegacionGym.tsx y app/gym/layout.tsx (servidor): obtenerSesion(); sin sesión, redirect al login. Barra con "Gym Assistant", enlaces Ejercicios (/gym) y, cuando exista, Resumen; correo y cerrar sesión. Menú móvil.

TAREA 5. components/gym/InsigniaTipo.tsx (Peso / Calistenia con los colores de la sección 13 y texto); components/gym/TarjetaEjercicio.tsx (nombre, InsigniaTipo, rango objetivo, estado actual —peso de referencia en kg o nivel, y meta de reps—, última sesión); app/gym/page.tsx (servidor): listarEjercicios como tarjetas; botón "Nuevo ejercicio"; EstadoVacio si no hay. Tarjetas apiladas en móvil.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Con los datos demo: ver la lista de ejercicios con su tipo y estado; el login lleva a /gym. Revisa en móvil.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P06 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** ver la lista de ejercicios con su tipo (Peso/Calistenia) y su estado actual; revisar en móvil.

**Commit sugerido:** `feat(interfaz): componentes base, navegación y lista de ejercicios`

---

## P07 · Registro de ejercicio, prueba inicial y sesiones

**Fase:** 5 · **Crea:** formularios de ejercicio, prueba inicial y sesión

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 6, 7, 8, 10.3, 11, 12), doc/ESTADO_EJECUCION.md y los componentes existentes.

OBJETIVO: crear ejercicios, registrar su prueba inicial y registrar sesiones con series.

TAREA 1. components/gym/FormularioEjercicio.tsx (cliente) y app/gym/ejercicios/nuevo/page.tsx: nombre, tipo (selector peso/calistenia); si peso, peso de referencia inicial (kg); si calistenia, nivel/variante; rango objetivo (precargado por tipo con rangoPorTipo, editable). Validación con esquemaEjercicio y las reglas; EJERCICIO_DUPLICADO muestra el mensaje. El peso entra en kg. Al guardar, navega al detalle o a registrar la prueba.

TAREA 2. components/gym/FormularioSeries.tsx (cliente): un bloque de series con botón para agregar/quitar; cada serie con reps y, si es de peso, kg. Reutilizable para la prueba inicial y para las sesiones.

TAREA 3. app/gym/ejercicios/[id]/prueba/page.tsx: usa FormularioSeries para la primera medición; POST /api/gym/ejercicios/[id]/prueba; solo si no hay prueba aún (si ya existe, aviso de PRUEBA_YA_REGISTRADA y enlace al detalle).

TAREA 4. app/gym/ejercicios/[id]/sesion/page.tsx: usa FormularioSeries para la sesión de hoy; muestra la meta actual (rango y meta de reps) como referencia antes de guardar; POST /api/gym/ejercicios/[id]/sesiones; si el ejercicio no tiene prueba inicial, redirige a registrarla (PRUEBA_REQUERIDA). Fecha por defecto hoy, no futura.

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Crear un ejercicio de peso; registrar su prueba inicial; registrar una sesión; intentar registrar una sesión en un ejercicio nuevo sin prueba (redirige a la prueba); crear un ejercicio con nombre repetido (error). Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Marca P07 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** crear un ejercicio, su prueba inicial y una sesión; comprobar que no se puede registrar una sesión sin prueba inicial.

**Commit sugerido:** `feat(interfaz): registro de ejercicio, prueba inicial y sesiones`

---

## P08 · Recomendación, histórico y aceptación del MVP

**Fase:** 5 y 6 · **Crea:** detalle con recomendación e histórico, `doc/ACEPTACION.md` · **Modifica:** `README.md`

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 6, 8, 10.3, 11, 12, 14, 15, 16 y 17), doc/ESTADO_EJECUCION.md y los componentes existentes.

OBJETIVO: la pantalla central (recomendación de la próxima sesión + histórico), y el cierre del MVP con la aceptación.

TAREA 1. components/gym/TarjetaRecomendacion.tsx: muestra la acción sugerida (subir peso a X kg, subir la meta de reps a Y, mantener, o probar una variante más difícil) con su mensaje claro (de la recomendación). Usa el color "subir" o "mantener" según la acción, siempre con texto.

TAREA 2. components/gym/HistorialSesiones.tsx: cada sesión con su fecha (y una marca si es la prueba inicial) y sus series (reps y, si es de peso, kg), de la más reciente a la más antigua (F5).

TAREA 3. app/gym/ejercicios/[id]/page.tsx (servidor): obtenerEjercicio (notFound si no existe). Encabezado con nombre, InsigniaTipo y estado actual (peso de referencia o nivel, meta de reps). TarjetaRecomendacion con la recomendación. Botones "Registrar sesión" y "Registrar prueba inicial" (este solo si aún no hay prueba). HistorialSesiones. Acción "Archivar" (con confirmación). Si no hay prueba inicial, la recomendación invita a registrarla.

TAREA 4. Revisa el código contra las secciones 6 y 15. Reporta y corrige en la bitácora: lógica de progresión fuera de lib/reglas/progresion.ts o que suba peso sin que todas las series superen el tope; peso manejado con decimales en vez de gramos enteros; sesiones o series editables; rutas sin exigirSesion; "hoy" con new Date() fuera de fechas.ts; SQL concatenado; textos en inglés; recomendación comunicada solo con color.

TAREA 5. Ejecuta npm test y npm run probar:flujo; corrige fallas en el código. Prepara la aceptación: db:limpiar --prueba; conserva los demo.

TAREA 6. Crea doc/ACEPTACION.md con la tabla A-01 a A-15 de la sección 16.3 (columnas: ID, acción, resultado esperado, resultado obtenido, evidencia, observación; las tres últimas vacías) y una nota de que A-15 es de la opcional (P09).

TAREA 7. Actualiza README.md: descripción; funcionalidades; requisitos; cómo correr en local (npm install, .env.local con los NOMBRES de las variables, db:migrar, db:demo, dev); scripts; estructura; una nota sobre la lógica de doble progresión y el peso en gramos; nota de seguridad (credenciales fuera del repositorio); enlace a doc/PLAN_GYM.md.

TAREA 8. Verifica que .env.local esté en .gitignore y que ningún archivo versionado tenga credenciales ni valores de variables de entorno.

AL TERMINAR:
- npm run build y npm test sin errores.
- Crea doc/checkpoints/FASE_5_COMPLETADA.md (interfaz) y doc/checkpoints/FASE_6_COMPLETADA.md (revisión y pruebas).
- Marca P08 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen y recuérdame que A-01 a A-14 se ejecutan en el despliegue de Vercel.
````

**Verificación del estudiante:** registrar sesiones y ver cómo cambia la recomendación (subir peso tras superar el tope en todas las series, mantener si falla una); ver el histórico ordenado. Hacer push y ejecutar A-01 a A-14 en Vercel.

**Commit sugerido:** `feat(interfaz): recomendación, histórico y aceptación del MVP`

---

## P09 · Opcionales: comparativa, sesión múltiple y resumen

**Fase:** 7 · **Requisito:** `doc/checkpoints/FASE_6_COMPLETADA.md` existe y `doc/ACEPTACION.md` está diligenciado

````text
Antes de escribir código lee completos: doc/PLAN_GYM.md (secciones 4.2, 10.3, 16.3 (A-15) y 18), doc/ESTADO_EJECUCION.md y doc/checkpoints/FASE_6_COMPLETADA.md. Si FASE_6_COMPLETADA.md no existe, detente y avísame.

OBJETIVO: las tres mejoras opcionales deseables del plan.

TAREA 1. F6 · Comparativa de progreso por ejercicio:
- En el detalle del ejercicio, muestra una tendencia simple a partir de sus sesiones: por ejemplo, la mejor serie (reps y, en peso, kg) de cada sesión a lo largo del tiempo, en una lista o un gráfico sencillo. Usa listarSesiones; no hace falta una librería pesada.

TAREA 2. F7 · Varios ejercicios en un entrenamiento:
- Una pantalla "Entrenamiento de hoy" (por ejemplo /gym/entrenamiento) que permite registrar series de varios ejercicios en una misma visita. El modelo ya guarda una sesión por ejercicio, así que esto crea una sesión por cada ejercicio trabajado. Muestra, al terminar, la recomendación actualizada de cada uno.

TAREA 3. F8 · Resumen semanal o mensual:
- lib/datos/recomendacion.ts o un nuevo lib/datos/resumen.ts: obtenerResumen(desde, hasta): número de sesiones, ejercicios trabajados y, por ejercicio, un indicador de progreso en el periodo. Reexporta en dataService.
- Ruta GET /api/gym/resumen; pantalla /gym/resumen con el resumen del periodo (selector de rango, por defecto la semana o el mes).

VERIFICACIÓN: pídeme que inicie sesión si lo necesitas. Con varias sesiones demo: ver la tendencia de un ejercicio; registrar un entrenamiento con dos ejercicios y ver ambas recomendaciones; abrir el resumen del periodo. Documenta.

AL TERMINAR:
- npm run build y npm test sin errores.
- Agrega a doc/ACEPTACION.md el resultado de A-15.
- Crea doc/checkpoints/FASE_7_COMPLETADA.md.
- Marca P09 en ESTADO_EJECUCION.md y agrega su sección en la bitácora.
- Muéstrame un resumen.
````

**Verificación del estudiante:** ver la tendencia de un ejercicio, registrar un entrenamiento con varios ejercicios y abrir el resumen del periodo.

**Commit sugerido:** `feat(opcional): comparativa, entrenamiento múltiple y resumen`

---

## Prompts auxiliares

### Corrección de un error

Reemplazar `[NN]` por el número del prompt y pegar el error completo donde se indica.

````text
Durante la ejecución del prompt P[NN] apareció este error:

[PEGAR AQUÍ EL ERROR COMPLETO]

Lee doc/PLAN_GYM.md, doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Encuentra la causa y corrígela sin salir del alcance de P[NN]. No modifiques pruebas ni scripts de prueba para que pasen; corrige el código que prueban. Ejecuta npm run build y npm test. Registra en la bitácora la causa, la corrección y los archivos modificados. Muéstrame un resumen.
````

### Reanudación de un prompt interrumpido

````text
La ejecución anterior del prompt P[NN] se interrumpió. Lee doc/ESTADO_EJECUCION.md, doc/PLAN_GYM.md y doc/PROMPTS_GYM.md (sección P[NN]). Revisa qué archivos de P[NN] ya existen y cuáles faltan, y continúa desde la primera tarea incompleta sin rehacer lo terminado. Al final ejecuta npm run build y npm test, y actualiza la bitácora.
````

### Despliegue fallido en Vercel

````text
El despliegue en Vercel falló con este registro:

[PEGAR AQUÍ EL REGISTRO DEL BUILD DE VERCEL]

Lee doc/ESTADO_ACTUAL.md y doc/ESTADO_EJECUCION.md. Identifica la causa (error de compilación, variable de entorno faltante en Vercel, o diferencia entre local y producción). Si es de código, corrígelo y verifica con npm run build. Si es una variable de entorno, dime exactamente qué NOMBRE de variable falta y en qué entornos de Vercel agregarla, sin pedir ni mostrar valores. Registra la causa y la solución en la bitácora.
````
