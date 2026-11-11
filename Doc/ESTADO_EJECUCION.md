# Estado de ejecución · Gym Assistant

| Prompt | Estado | Build | Tests | Fecha de cierre |
|---|---|---|---|---|
| P00 Auditoría | completado | correcto | 26 | 2026-10-31 |
| P01 Base de datos | completado | correcto | 26 | 2026-10-31 |
| P02 Reglas de negocio | completado | correcto | 55 | 2026-10-31 |
| P03 Servidor | completado | correcto | 55 | 2026-10-31 |
| P04 Datos | completado | correcto | 55 | 2026-10-31 |
| P05 API | completado | correcto | 55 | 2026-10-31 |
| P06 Interfaz base y ejercicios | completado | correcto | 55 | 2026-10-31 |
| P07 Prueba inicial y sesiones | completado | correcto | 55 | 2026-10-31 |
| P08 Recomendación, histórico y aceptación | completado | correcto | 49 | 2026-10-31 |
| P09 Opcionales | completado | correcto | 56 | 2026-10-31 |

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

### P06 · Interfaz base y ejercicios

- **Creados:** `src/components/ui/*`, `NavegacionGym`, `InsigniaTipo`, `TarjetaEjercicio`, `src/app/gym/layout.tsx`.
- **Modificados:** `tailwind.config.ts`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/gym/page.tsx`.
- **Problemas:** en la primera revisión faltaban los colores; las pruebas funcionales pasaban, pero las capturas no. El servidor de desarrollo arrancó antes del cambio en `tailwind.config.ts`; al reiniciarlo se resolvió.

### P07 · Prueba inicial y sesiones

- **Creados:** `FormularioEjercicio`, `FormularioSeries`, `src/lib/http/cliente.ts`, las páginas `nuevo`, `prueba` y `sesion`, `src/app/gym/ejercicios/[id]/cargar.ts`.
- **Modificados:** `src/lib/validacion/esquemas.ts` (mensajes en español).
- **Problemas:** ninguno.

### P08 · Recomendación, histórico y aceptación

- **Creados:** `TarjetaRecomendacion`, `HistorialSesiones`, `BotonArchivar`, la página de detalle, `Doc/ACEPTACION.md`, `Doc/checkpoints/FASE_5_COMPLETADA.md`, `Doc/checkpoints/FASE_6_COMPLETADA.md`.
- **Modificados:** `README.md`, `.env.example`.
- **Eliminados:** `src/lib/progression.ts` y su prueba.
- **Comandos:** resultados en el checkpoint de la fase 6.
- **Pendiente:** repetir A-01 a A-14 en Vercel después del push.

### P09 · Opcionales

- **Creados:** `src/lib/reglas/tendencia.ts` y su prueba, `src/lib/datos/resumen.ts`, las rutas `entrenamiento` y `resumen`, `IndicadorProgreso`, `TendenciaProgreso`, `FormularioEntrenamiento`, las páginas `/gym/entrenamiento` y `/gym/resumen`, `Doc/checkpoints/FASE_7_COMPLETADA.md`.
- **Modificados:** `src/lib/datos/sesiones.ts`, `tipos.ts`, `src/lib/dataService.ts`, `esquemas.ts`, `fechas.ts`, `NavegacionGym`, la página de detalle, `README.md`, `Doc/ACEPTACION.md`.
- **Problemas:** las capturas mostraron un aviso de error que no se limpiaba al seleccionar y una barra de navegación sin espacio a 640 px. Ambos se corrigieron.

### Ajustes posteriores

- **Home:** a pedido del estudiante, `/` vuelve a mostrar el home sin sesión y redirige a `/gym` con sesión. Los datos del home siguen siendo de ejemplo hasta la versión final. Se actualizaron las secciones 5, 10.2 y 12 del plan.
- **Cuentas:** a pedido del estudiante, se eliminaron todas las cuentas de Supabase Auth y se creó una cuenta de prueba.
- **Confirmación de correo:** el enlace llevaba a `localhost` porque la Site URL de Supabase es `http://localhost:3000` y rechaza la dirección de Vercel. `RegistroForm` ahora envía `emailRedirectTo` y `src/app/auth/callback/route.ts` canjea el código por la sesión. El estudiante cambió la Site URL en el panel de Supabase y confirmó el recorrido completo en Vercel con un correo real.
- **Incidente de solo lectura:** una inspección con `SET default_transaction_read_only = on` por el puerto 6543 dejó ese ajuste activo en una conexión compartida del pooler (pid 56496), y las escrituras que caían en ella fallaban, también en producción. Se detectó por un `cannot execute DELETE in a read-only transaction`. Se revirtió con `RESET` en esa conexión, y 12 de 12 conexiones quedaron en `read_only=off`. Las inspecciones ahora usan `BEGIN READ ONLY`, y la regla quedó en `.github/copilot-instructions.md`.
- **Aceptación en Vercel:** A-01 a A-14 pasan en el sitio publicado, antes del cambio a datos por usuario.
- **Datos por usuario:** migración M3, `usuarioId` en toda la capa de datos, sección 20 del plan. Se borraron los 4 ejercicios `Demo` a pedido del estudiante, porque no tenían dueño. `npm run probar:flujo` usa dos cuentas temporales y pasó a 24 pasos. `db:limpiar` y `db:demo` ahora exigen un correo, para no tocar datos de otras cuentas.
- **Nivel en calistenia:** botón "Cambiar nivel" en el detalle y `POST /api/gym/ejercicios/[id]/nivel`.
- **Ajustes menores:** la regla del home dice "superas" en lugar de "completas", y ESLint vuelve a correr con `eslint-config-prettier`.
- **Conexión verificada:** `supabase/ca.crt` (Supabase Root 2021 CA, vigente hasta el 2031-04-26) reemplaza a `rejectUnauthorized: false` en `src/lib/db/conexion.ts` y `scripts/conexion.mjs`. `next.config.ts` lo incluye en el despliegue.
- **Correo de recuperación:** a pedido del estudiante, `src/lib/plantillasCorreo.ts` tiene un diseño nuevo: encabezado de marca, botón principal, aviso de vencimiento, tres pasos, qué hacer si no se pidió el cambio y texto previo para la bandeja de entrada. El asunto pasa a ser "Restablece tu contraseña de Gym Assistant" (`ASUNTO_RECUPERACION`). Las cifras del home no se tocan por ahora.

- **Registro de cuentas nuevas:** se probó en el sitio publicado con un buzón desechable: alta, correo de confirmación enviado, perfil en `public.users`, confirmación e inicio de sesión. Funciona; la cuenta de prueba se eliminó.
- **Volver al inicio:** `/login` y `/registro` tienen el enlace "Volver al inicio" (`src/components/auth/VolverAlInicio.tsx`) que lleva al home.
- **Correo por Gmail:** Resend, sin dominio verificado, solo entrega al dueño de su cuenta, así que la recuperación no llegaba a otros usuarios. `src/lib/correo.ts` ahora envía por Gmail (SMTP con contraseña de aplicación, `nodemailer`) cuando existen `GMAIL_USER` y `GMAIL_APP_PASSWORD`, y si no, sigue con Resend. Falta que el estudiante cree la contraseña de aplicación y la cargue en Vercel.
- **Gmail activo en producción:** el estudiante cargó `GMAIL_USER` y `GMAIL_APP_PASSWORD` en Vercel (Production) y se hizo el redeploy. La recuperación pedida desde el sitio publicado llegó a un buzón externo con remitente "Gym Assistant", y también se envió a sjcarbono8@gmail.com, cuya cuenta se volvió a crear para la prueba.
- **Chat con asistente:** nueva sección `/gym/chat` junto a Ejercicios, Entrenamiento y Resumen. Usa Claude (`claude-opus-5-5`, esfuerzo bajo, `fallbacks: "default"`) con tres herramientas de solo lectura (`listar_ejercicios`, `ver_ejercicio`, `resumen_periodo`) que siempre consultan con la cuenta de la sesión. La respuesta llega por partes (NDJSON) desde `POST /api/gym/chat`. Límite de 40 mensajes por cuenta y día en la tabla `chat_uso` (migración M7, `20261110000000_chat_uso.sql`). Pendiente: aplicar M7 en la base, que el estudiante cargue `ANTHROPIC_API_KEY` en Vercel y probar con el modelo real.
- **Nombre del asistente:** el chat se presenta con nombre propio como el asistente virtual de Gym Assistant, hoy CHRONO (antes ATLAS): opción en el menú, encabezado, saludo, etiqueta en cada respuesta y las instrucciones del modelo. Un proyecto de claude.ai no se puede conectar a la API; sus instrucciones y archivos se trasladan a `src/lib/chat/asistente.ts`.
- **CHRONO con Groq:** a pedido del estudiante, para no tener costo, CHRONO pasa de Claude a Groq (plan gratuito, `groq-sdk`, modelo `openai/gpt-oss-120b`, razonamiento bajo y oculto). Se mantienen la página, las herramientas de solo lectura, el streaming y el límite diario. Como el plan gratuito limita consultas y tokens por minuto para toda la app, el historial enviado baja a 12 mensajes, el detalle a 5 sesiones y los datos van sin campos vacíos. Variables: `GROQ_API_KEY` y `GROQ_MODELO` (opcional). Se quitó `@anthropic-ai/sdk`.
- **CHRONO verificado en producción:** el estudiante cargó `GROQ_API_KEY` en Vercel y aplicó M7 (`chat_uso` con RLS y sin permisos para `anon` ni `authenticated`). Tras el redeploy, con una cuenta temporal con dos ejercicios: CHRONO se presenta, consulta `listar_ejercicios` y `ver_ejercicio`, explica la recomendación de la app (subir a 55 kg × 8) y arma una rutina de 3 días en tablas. El texto empieza en 1–3 s y la respuesta completa tarda unos 5 s; cada mensaje usa unas 3 consultas a Groq.
- **Instrucciones de CHRONO:** el estudiante entregó las instrucciones de su proyecto de claude.ai (rol de entrenador, especialidades, uso de los datos, progresión, temas fuera de alcance, prioridad de instrucciones, personalización, seguridad y estilo). Quedaron en `src/lib/chat/instrucciones.ts`, más una sección de formato Markdown; la fecha del día se agrega en cada pedido.
- **Despliegue fallido:** el despliegue automático del commit `f2c39ff` (crear ejercicios desde el chat) quedó en Error en Vercel sin llegar a compilar ni dejar registro; el código compilaba bien en local. Se resolvió con el siguiente despliegue (ver abajo).
- **CHRONO y cambios con confirmación:** el asistente pasa a llamarse CHRONO. Ya no escribe en la base: `crear_ejercicio` se reemplaza por `proponer_crear_ejercicio`, `proponer_modificar_ejercicio` (enfoque, método, rango o nivel) y `proponer_archivar_ejercicio` (eliminar es archivar), que validan con las reglas de la app y devuelven una propuesta. La página la muestra como tarjeta con Confirmar y Cancelar, y solo el botón aplica el cambio con las rutas de la API existentes. Las pruebas verifican que ninguna herramienta llame a funciones que escriben.
- **Guía para cuentas nuevas:** bienvenida en la primera visita a `/gym` (cuentas sin ejercicios), página `/gym/guia` con índice (escritorio) y pasos Anterior/Siguiente (móvil), y primeros pasos que se marcan solos. El asistente aparece como CHRONO, su nombre actual.
  - Base de datos: migración M8 `20261111000000_guia_usuario.sql` (tabla `guia_usuario`, RLS sin políticas, sin permisos para `anon` ni `authenticated`). `scripts/verificar-bd.mjs` comprueba que existan `chat_uso` y `guia_usuario`, su RLS y sus permisos.
  - Código nuevo: `src/lib/datos/guia.ts`, `src/lib/reglas/guia.ts`, `src/lib/guia/contenido.ts` (todos los textos; números desde `config/gym.ts` y las reglas), `src/lib/guia/acciones.ts`, `src/app/api/gym/guia/route.ts` (GET y PATCH), `src/app/gym/guia/page.tsx`, `src/components/gym/{BienvenidaGuia,TarjetaPrimerosPasos,ListaPrimerosPasos,GuiaInteractiva}.tsx`, `src/components/ui/BarraAvance.tsx`.
  - Modificados: `src/app/gym/page.tsx` (modal, tarjeta y estado vacío con enlace a la guía), `NavegacionGym` (Guía), `src/components/ui/Modal.tsx` (atrapa el foco con Tab, lo devuelve al cerrar y ya no lo mueve en cada render), `src/lib/http/cliente.ts` (método PATCH), `esquemas.ts` (`esquemaAccionGuia`), `dataService.ts`, `instrucciones.ts` (CHRONO recomienda la guía), `scripts/probar-flujo.ts` (pasos 24–27), README.
  - "Seguir la recomendación" no puede medir visitas a una página: se marca con una segunda sesión del mismo ejercicio. Ver el resumen no se registra, así que no es un paso.
  - Verificación: `npm run type-check`, `npm run lint`, `npm test` (174 pruebas) y `npm run build` pasan. M8 aplicada en la base; `npm run db:verificar` sin fallas y `npm run probar:flujo` con 27 pasos sin fallas. En el navegador: bienvenida con foco atrapado, guía en escritorio y celular, tarjeta de primeros pasos y menú de 768 a 1280 px (entre md y lg el correo no se muestra en la barra para que quepa).
- **Guía interactiva (tour):** a pedido del estudiante, reemplaza la guía anterior (modal de bienvenida, página `/gym/guia` y primeros pasos, que se quitaron). Recorridos sobre las pantallas reales: `inicio` (/gym), `crear_ejercicio`, `prueba_inicial`, `detalle` y `sesion`, encadenados por pasos de navegación. Fondo oscuro y borroso con un hueco sobre el elemento, burbuja con teclado y foco atrapado, hoja inferior en móvil, aviso "Continuar la guía" y panel "Guía" en el menú. El asistente aparece como CHRONO.
  - Base de datos: M9 `20261112000000_guia_recorridos.sql` agrega `oferta_vista_en`, `recorridos` (JSONB) y `actualizado_en` a `guia_usuario`. Las columnas de la guía anterior se quitan en una migración posterior, después del despliegue, para que el sitio no falle entre la migración y el despliegue. `verificar-bd.mjs` comprueba las columnas nuevas.
  - Nuevos: `src/components/guia/{ProveedorGuia,Foco,BurbujaGuia,PanelGuia,TarjetaOfertaGuia}.tsx`, `src/lib/guia/{recorridos,motor,posicion}.ts` y pruebas (`motor.test.ts`, `Foco.test.tsx`, `BurbujaGuia.test.tsx`).
  - Reescritos: `src/lib/datos/guia.ts`, `src/lib/guia/acciones.ts`, `src/app/api/gym/guia/route.ts` y su prueba, `esquemaAccionGuia`, pasos 24–27 de `probar-flujo.ts`.
  - Marcas `data-guia` (sin cambios de estilo ni de comportamiento): `NavegacionGym`, `/gym`, `FormularioEjercicio`, `nuevo/page.tsx`, `FormularioSeries`, prueba, sesión, detalle, `TarjetaRecomendacion` y `Progreso1RM`.
  - Quitados: `BienvenidaGuia`, `GuiaInteractiva`, `ListaPrimerosPasos`, `TarjetaPrimerosPasos`, `BarraAvance`, `src/app/gym/guia`, `src/lib/reglas/guia.ts`, `src/lib/guia/contenido.ts` y sus pruebas. Se conserva la mejora del Modal (foco atrapado).
  - Verificación: `npm run type-check`, `npm run lint`, `npm test` (188 pruebas) y `npm run build` pasan. M9 aplicada; `npm run db:verificar` sin fallas y `npm run probar:flujo` con 27 pasos sin fallas. En el navegador (escritorio y 375 px), 43 comprobaciones: hueco alineado a cada elemento, burbuja dentro de la pantalla, paso de /gym a crear ejercicio, prueba, detalle y sesión sin perder el paso, clic fuera del elemento bloqueado, teclado, Esc y "Continuar la guía". En la prueba inicial y la sesión se resalta el conjunto de series, porque todas necesitan repeticiones para guardar.
  - Desplegado el tour (commit `8986d93`, Vercel Ready) y verificado en producción con las mismas 43 comprobaciones. M10 `20261113000000_guia_quitar_columnas_anteriores.sql` quita las columnas de la guía anterior; se aplica ahora que el código publicado ya no las usa.
- **Correo de confirmación con el diseño de la app:** a pedido del estudiante, la confirmación de cuentas nuevas ya no la envía Supabase. `POST /api/auth/registro` (`src/lib/auth/registro.ts`) crea la cuenta con `auth.admin.generateLink` y envía `plantillaConfirmacion` por Gmail; `/auth/confirmar` verifica el token con `verifyOtp` e inicia la sesión. `plantillasCorreo.ts` comparte el diseño entre recuperación y confirmación. `RegistroForm` usa la ruta nueva. Respuesta igual para correos nuevos y registrados; reenvío a cuentas sin confirmar como mucho una vez por minuto y sin cambiar su contraseña. Pruebas nuevas: `registro.test.ts`, `confirmar/route.test.ts`, plantilla y formulario (198 en total).
  - Verificado en producción (commit `bcdc64e`, Vercel Ready) con un registro real a un buzón externo: llega "Confirma tu cuenta de Gym Assistant" con remitente "Gym Assistant", el botón lleva a `/auth/confirmar`, la cuenta queda confirmada y se entra directo a `/gym`; el mismo enlace usado otra vez lleva al login con un aviso.
- **Eliminar, restaurar y CHRONO en todo el proyecto:**
  - Nombre: el asistente se llama CHRONO (antes ATLAS) desde el commit `bd751b9`. Se cambiaron las últimas menciones (`.env.example` y esta bitácora); una búsqueda del nombre anterior solo encuentra estas aclaraciones entre paréntesis.
  - Eliminar para siempre: `eliminarEjercicio` (transacción: comprueba la cuenta, cuenta sesiones y series y borra; la cascada de las claves foráneas borra el resto), `DELETE /api/gym/ejercicios/[id]` con confirmación por nombre y `BotonEliminar` ("Zona de peligro" al final del detalle, modal con los números reales, "Archivar en su lugar" y botón deshabilitado hasta escribir el nombre). Sin migración: la guía y `chat_uso` no guardan ids de ejercicios.
  - Restaurar: `restaurarEjercicio`, `POST /api/gym/ejercicios/[id]/restaurar` (idempotente) y `BotonRestaurar` en el detalle de un archivado y en sus tarjetas del filtro "Archivados". Avisos "Ejercicio eliminado" y "Ejercicio restaurado…" con `?aviso=`. Crear con el nombre de un archivado responde `EJERCICIO_ARCHIVADO` y el formulario ofrece restaurarlo.
  - CHRONO: `proponer_restaurar_ejercicio` (solo archivados); archivar se presenta como archivar ("Confirmar y archivar", sin estilo de peligro); no puede eliminar y explica que se hace desde el detalle. La guía interactiva agrega en el recorrido "detalle" los pasos de archivar/restaurar y eliminar.
  - Reglas: RN-12 y la sección 20 del plan actualizadas. El Modal acepta `focoInicial`; `enviarJson` admite DELETE y devuelve los `detalles` del error.
  - Verificación: `npm run type-check`, `npm run lint`, `npm test` (219 pruebas) y `npm run build`. `npm run probar:flujo` con 33 pasos sin fallas (restaurar con sus sesiones, la otra cuenta sin acceso, nombre archivado y eliminar sin dejar filas).
- **Perfil, registro en dos pasos y cumpleaños (primera tanda):** a pedido del estudiante. Como el pedido era grande, se entregan primero los puntos 1, 2, 3, 6, 7, 8 y 9, más `/privacidad` y la parte de adultos del punto 5. La autorización de tutores (punto 4) y la parte de menores del punto 5 quedan para la segunda tanda; mientras tanto, las cuentas de menores de 12 no se crean (503 `AUTORIZACION_NO_DISPONIBLE`).
  - Base de datos: M11 `20261114000000_perfil.sql` con `perfiles`, `autorizaciones_tutor` (ya lista para la segunda tanda) y `registro_intentos`, con RLS sin políticas y sin permisos para `anon` ni `authenticated`, y el bucket privado `avatares` (2 MB; WebP, JPEG y PNG). `verificar-bd.mjs` comprueba las tres tablas.
  - Registro: `RegistroForm` en dos pasos; `POST /api/auth/registro/perfil` (paso 1) y `POST /api/auth/registro` reescrita con `respuestas.ts` (paso 2), que vuelve a revisar todo y crea la cuenta con su perfil (`registrarCuenta` borra la cuenta si falla el perfil o el correo). `src/lib/auth/validarRegistro.ts`: hash de la conexión, bloqueo, filtro y edad. La confirmación por correo de los adultos no cambia.
  - Filtro de nombres: `src/lib/reglas/nombres.ts`, `nombresBloqueados.ts` y 49 pruebas. Intentos en `src/lib/datos/registroIntentos.ts`.
  - Perfil: `src/lib/datos/perfil.ts`, reglas puras en `src/lib/reglas/perfil.ts` (edad, cumpleaños con 29 de febrero, racha sin domingos, récords, favorito, totales) e `imagen.ts` (tipo por bytes). Páginas `/gym/perfil` y `/gym/perfil/completar`; rutas `/api/gym/perfil` (POST y PATCH), `/api/gym/perfil/foto` (POST y DELETE) y `/api/gym/perfil/cumple`. Componentes `Avatar`, `MenuPerfil`, `FotoPerfil`, `FormularioPerfil`, `FormularioCompletarPerfil` y `TarjetaCumpleanos`.
  - Menú: `NavegacionGym` muestra la foto (o las iniciales) y el apodo en lugar del correo; el menú tiene Perfil, Guía y Cerrar sesión, con teclado (flechas, Inicio, Fin, Esc) y dentro del menú móvil. `PanelGuia` se abre desde ese menú (estado en `ProveedorGuia`). El middleware pasa la ruta en `x-ruta` para que el layout lleve a completar el perfil sin bucle.
  - CHRONO: recibe solo el nombre para mostrar, la edad y si es el cumpleaños (`contextoDePersona`), con más prudencia para menores de 18. Punto 9: la guía y el saludo del chat dicen "crear, modificar, archivar o restaurar" (ya no "eliminar"), y el paso del botón Guía pasa a ser "Tu perfil: tus datos, tu foto, tus récords y tu racha".
  - Privacidad: `/privacidad` pública; los errores internos se registran sin el detalle de Postgres (que podía traer valores de la fila); `eliminarCuentaConDatos` borra la foto y la cuenta. Variables nuevas solo de servidor: `CORREO_CONTACTO`, `REGISTRO_SECRETO_IP` y `CRON_SECRET` (esta última para la limpieza de la segunda tanda).
  - Verificación: `npm run type-check`, `npm run lint`, `npm test` (324 pruebas) y `npm run build` pasan. M11 aplicada con autorización del estudiante; `npm run db:verificar` sin fallas y `npm run probar:flujo` con 40 pasos sin fallas (aislamiento de perfil, foto y estadísticas; bucket sin acceso público; bloqueo de intentos; al borrar la cuenta se van el perfil y la foto). En el navegador (local, compilación de producción), 41 comprobaciones: registro en dos pasos, menores de 8 y de 12, "Atrás", intentos 1–4 y cancelación al 5.º con el paso 2 bloqueado, cuenta borrada si el correo falla, completar perfil, menú con teclado, perfil, edición con filtro, foto (WebP firmada, SVG disfrazado rechazado, quitar), estadísticas, cumpleaños, móvil a 375 px y `/privacidad`. CHRONO se comprueba en producción (en local no hay clave de Groq).
  - **Pasos manuales:**
    1. Migración en producción: M11 ya está aplicada (la base es la misma). Si el proyecto no tuviera Storage, crear a mano el bucket privado `avatares` en Supabase > Storage (límite 2 MB, tipos `image/webp`, `image/jpeg`, `image/png`).
    2. Variables en Vercel (Production, marcadas como Sensitive): `REGISTRO_SECRETO_IP` (un valor aleatorio largo; sin ella se usa la clave de servicio) y, si se quiere otro correo de contacto que el de Gmail, `CORREO_CONTACTO`. Redesplegar tras cargarlas.
    3. Cron y `CRON_SECRET`: llegan con la segunda tanda (limpieza de autorizaciones vencidas en `vercel.json`).
    4. Tras desplegar, todas las cuentas existentes pasan una vez por "Completa tu perfil".
