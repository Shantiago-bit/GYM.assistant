# Gym Assistant

Asistente de progresión de entrenamiento con sobrecarga progresiva. Registra tus ejercicios, parte de una prueba inicial y recibe qué hacer en la próxima sesión: subir peso, subir repeticiones, mantener, bajar o probar una variante más difícil. Un chat con IA responde preguntas y arma rutinas a partir de tus datos.

- Sitio publicado: <https://gymassistant-five.vercel.app> (el dominio anterior, gymlead-five.vercel.app, redirige aquí)
- Plan técnico completo: [Doc/PLAN_GYM.md](Doc/PLAN_GYM.md)
- Bitácora de cambios: [Doc/ESTADO_EJECUCION.md](Doc/ESTADO_EJECUCION.md)

## Funcionalidades

**Cuentas**
- Home público con acceso a registro e inicio de sesión; con sesión iniciada lleva directo a `/gym`.
- Registro en dos pasos ("Cuéntanos de ti" y "Tu cuenta") con confirmación por correo, inicio de sesión, recuperación y cambio de contraseña (Supabase Auth).
- Filtro de nombres y apodos ofensivos: al quinto intento se cancela la creación de la cuenta por 30 minutos.
- Menores de 12 años: su mamá, papá o tutor autoriza la cuenta desde un enlace que recibe por correo.
- Perfil (`/gym/perfil`) desde el menú con tu foto y tu apodo: datos personales, foto, récords personales, ejercicio favorito, racha y totales.
- Felicitación el día de tu cumpleaños, y CHRONO te llama por tu apodo.
- Política de privacidad pública en `/privacidad` (Ley 1581 de 2012 de Colombia).
- Datos privados por cuenta: nadie ve los ejercicios de otra persona.

**Entrenamiento** (`/gym`)
- Ejercicios de peso o de calistenia, con enfoque (fuerza, hipertrofia o resistencia), rango objetivo y método de series.
- Prueba inicial que fija el punto de partida de cada ejercicio.
- Registro de sesiones con sus series: repeticiones, peso, RIR y técnica (aproximación, AMRAP, rest-pause, myo-reps, drop set).
- Recomendación automática y plan por serie para la próxima sesión, con aviso "¡Meta alcanzada!" al cumplir el rango.
- Histórico, tendencia y 1RM estimado con gráfico de evolución.
- Cambio de enfoque y, en calistenia, de nivel o variante.
- Archivar y restaurar sin perder datos, o eliminar permanentemente con confirmación.
- Entrenamiento de hoy: varios ejercicios en una sola visita (`/gym/entrenamiento`).
- Resumen de un periodo con el progreso de cada ejercicio (`/gym/resumen`).
- CHRONO, el asistente virtual: un chat con IA que consulta tus datos, responde preguntas, arma rutinas y propone crear, modificar, archivar o restaurar ejercicios, que la persona confirma con un botón (`/gym/chat`).
- Guía interactiva: un recorrido sobre las pantallas reales que resalta un elemento a la vez y acompaña a la persona desde `/gym` hasta su primera sesión.

## Requisitos

- Node.js 20.6 o superior.
- Un proyecto de Supabase con Postgres.
- Para CHRONO (el chat): una clave gratuita de Groq.
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
| `GROQ_API_KEY` | Clave de la API de Groq para CHRONO, solo en el servidor |
| `GROQ_MODELO` | Opcional: modelo de Groq para CHRONO (`openai/gpt-oss-120b` por defecto) |
| `CHAT_LIMITE_DIARIO` | Opcional: mensajes de chat por cuenta y día (40 por defecto) |
| `RESEND_API_KEY`, `RESEND_FROM` | Opcional: respaldo de correo si faltan las variables de Gmail |
| `CORREO_CONTACTO` | Opcional: correo para corregir datos o pedir que se borren (si falta, `GMAIL_USER`), solo en el servidor |
| `REGISTRO_SECRETO_IP` | Secreto de los hashes de la IP (nombres rechazados, reenvíos) y del destinatario en `registro_correos`, solo en el servidor. En `.env.local` debe tener el mismo valor que en Vercel para que `correo:historial` encuentre los registros de producción |
| `CRON_SECRET` | Protege la tarea programada de limpieza de autorizaciones de tutores, solo en el servidor |

En producción, las mismas variables van en Vercel (Settings > Environment Variables), con las claves marcadas como **Sensitive**. Las variables nuevas solo se aplican tras un nuevo despliegue.

`npm run dev` también descarga de Vercel el token que usa el respaldo de Resend.

## Archivar, restaurar y eliminar ejercicios

| Acción | Cómo | API |
|---|---|---|
| Archivar (recomendado) | Botón "Archivar" del detalle. Sale de la lista y conserva todo su histórico | `POST /api/gym/ejercicios/[id]/archivar` |
| Restaurar | Botón "Restaurar" en el detalle de un archivado o en su tarjeta del filtro "Archivados". Vuelve con todo su histórico; si ya estaba activo, no cambia nada | `POST /api/gym/ejercicios/[id]/restaurar` |
| Eliminar para siempre | "Zona de peligro" al final del detalle. El modal muestra cuántas sesiones y series se borran, ofrece archivar en su lugar y pide escribir el nombre del ejercicio | `DELETE /api/gym/ejercicios/[id]` con `{ "confirmacion": "<nombre>" }` (sin distinguir mayúsculas ni espacios extremos; si no coincide, 400) |

Eliminar borra el ejercicio en una transacción y las claves foráneas borran en cascada sus sesiones y series; no hace falta migración. La guía interactiva y `chat_uso` no guardan ids de ejercicios, así que no queda nada colgando. Las sesiones y series siguen sin editarse ni borrarse una por una (RN-12). El nombre es único por cuenta también entre los archivados: al crear uno con el nombre de un archivado, la app responde `EJERCICIO_ARCHIVADO` ("Ya tienes «…» archivado. ¿Quieres restaurarlo?") y el formulario ofrece el botón "Restaurar".

## Correo

- **Recuperación de contraseña:** la envía la aplicación (`src/lib/correo.ts`). Con `GMAIL_USER` y `GMAIL_APP_PASSWORD` sale por el SMTP de Gmail, con remitente "Gym Assistant", y llega a cualquier dirección (unos 500 correos al día). Sin ellas se usa Resend, que sin un dominio verificado solo entrega al dueño de su cuenta. El enlace vence en 30 minutos y sirve una sola vez.
- **Confirmación de registro:** también la envía la app, con el mismo diseño y por el mismo canal que la recuperación. `POST /api/auth/registro` crea la cuenta con `auth.admin.generateLink` (Supabase no envía correo) y manda `plantillaConfirmacion`; el enlace lleva a `/auth/confirmar`, que verifica el token con `verifyOtp`, confirma la cuenta e inicia la sesión. Si el correo ya tenía una cuenta confirmada no se envía nada y la respuesta es la misma, para no revelar qué correos están registrados; a una cuenta sin confirmar se le reenvía la confirmación (como mucho una vez por minuto) sin cambiar su contraseña. Ya no aplica el límite de unos 2 correos por hora de Supabase; el límite es el de Gmail.
- En Supabase (Authentication > URL Configuration), la Site URL debe ser la dirección pública, y `http://localhost:3000/**` debe estar en Redirect URLs para registrarse desde local.
- **Entrega:** cada correo sale con versión HTML y de texto plano (con el enlace visible), `replyTo` a `CORREO_CONTACTO` (o `GMAIL_USER`) y un único transporte SMTP por instancia, con 10 s de espera para conectar y saludar. Las plantillas no usan imágenes remotas ni asuntos en mayúsculas.
- **Cuando tarda:** tras registrarse, la pantalla indica revisar Spam, Promociones o Correo no deseado y ofrece "Reenviar enlace" (con 60 s de espera visible). En `/login`, si el correo no está confirmado, aparece "Reenviar enlace de confirmación". Ambos llaman a `POST /api/auth/registro/reenviar`, que responde siempre el mismo mensaje (exista o no la cuenta) y admite 5 pedidos por hora por conexión (tabla `limites_reenvio`); por dentro solo reenvía a una cuenta sin confirmar que no sea de un menor pendiente o rechazado, y con 60 s entre envíos.
- Un error del servidor o de Supabase nunca se muestra como "correo no válido": ese mensaje es solo para un formato inválido. Si Supabase rechaza la dirección (`email_address_invalid`), la persona ve "No podemos usar ese correo…". Antes, ese 422 se tomaba por una cuenta existente y se mostraba éxito sin enviar nada.

### Registro de envíos y diagnóstico

Cada intento queda en la tabla `registro_correos` (migración `20261115000000_registro_correos.sql`, solo accesible desde el servidor) y en una línea JSON de los logs de Vercel (`console.info` para aceptados y omitidos, `console.error` para errores). Se guardan el tipo, el resultado, el motivo, el proveedor, el id del mensaje, el error (recortado a 500 caracteres y sin credenciales) y la duración. El destinatario va como hash (SHA-256 con `REGISTRO_SECRETO_IP`) y como máscara (`d•••••7@gmail.com`). Nunca se guardan el asunto, el HTML, los enlaces ni los tokens.

| Resultado | Significa |
|---|---|
| `aceptado` | El proveedor (Gmail o Resend) aceptó el correo y devolvió un id. Si no llega, el problema está después: Spam/Promociones o la carpeta Enviados de la cuenta de Gmail |
| `rechazado` | Gmail rechazó el destinatario |
| `error` | No se pudo enviar; el texto dice por qué (contraseña de aplicación incorrecta, límite diario de Gmail, error de Resend…) |
| `omitido` | Una regla decidió no enviar; la persona ve el mismo mensaje que si se hubiera enviado |

| Motivo de `omitido` | Significa |
|---|---|
| `cuenta_confirmada` | El correo ya tiene una cuenta confirmada |
| `reenvio_reciente` | Pasaron menos de 60 s desde el último envío a esa cuenta |
| `menor_pendiente` | Es la cuenta de un menor que espera a su tutor: la confirmación llega cuando el tutor autoriza |
| `menor_rechazado` | El tutor no autorizó la cuenta |

Tipos: `confirmacion`, `reenvio_confirmacion`, `recuperacion`, `autorizacion_tutor`, `reenvio_tutor`, `confirmacion_tras_autorizacion` y `prueba`. Los registros se borran a los 30 días (`DIAS_RETENCION_REGISTRO_CORREOS`) en la tarea diaria `/api/tareas/limpiar-autorizaciones`, que también limpia las ventanas de `limites_reenvio`.

Cómo diagnosticar un correo que no llega:

1. `npm run correo:probar -- <correo>`: verifica `GMAIL_USER` y `GMAIL_APP_PASSWORD` de `.env.local` contra smtp.gmail.com (explica si la contraseña de aplicación es incorrecta o falta) y envía un correo de prueba. Sirve para probar las credenciales de producción sin abrir `/api/correo/prueba`, que en producción responde 404.
2. `npm run correo:historial -- <correo>`: los últimos 20 intentos a ese correo, con la hora de Colombia, el tipo, el resultado, el motivo, el proveedor y el error.
3. Los logs de Vercel (Deployments > Logs): busca `"evento":"correo"`.
4. La carpeta Enviados de la cuenta de Gmail que envía: si el correo está ahí, Gmail lo entregó.

## Guía interactiva

Un recorrido ("tour") sobre las pantallas reales. Al aceptarlo, el fondo se oscurece y se vuelve borroso, se resalta un elemento a la vez y una burbuja explica para qué sirve. La guía sigue a la persona de pantalla en pantalla:

| Recorrido | Pantalla | Cómo pasa al siguiente |
|---|---|---|
| `inicio` | `/gym`: menú, estadísticas, filtros, tarjeta de un ejercicio | Al pulsar "+ Nuevo ejercicio" |
| `crear_ejercicio` | `/gym/ejercicios/nuevo`: cada campo del formulario | Al guardar (la app lleva a la prueba inicial) |
| `prueba_inicial` | `/gym/ejercicios/[id]/prueba`: series, repeticiones, peso y RIR | Al guardar (la app lleva al detalle) |
| `detalle` | `/gym/ejercicios/[id]`: recomendación, 1RM e histórico | Al pulsar "Registrar sesión" |
| `sesion` | `/gym/ejercicios/[id]/sesion`: técnicas y "¡Meta alcanzada!" | Termina con un mensaje de cierre |

- **Inicio:** en `/gym`, una cuenta sin ejercicios que no vio la oferta recibe una tarjeta (no un modal) con "Empezar guía" y "Ahora no". Si alguien sale a mitad de un recorrido, al volver a esa pantalla aparece el aviso "Continuar la guía" desde el paso donde quedó.
- **Botón "Guía" del menú:** abre un panel con los recorridos, su estado (pendiente, en curso, completado, saltado) y la opción de repetirlos. Los recorridos de un ejercicio usan el más reciente que sirva.
- **Motor** (`src/components/guia`): `ProveedorGuia` (montado en `src/app/gym/layout.tsx`) guarda el recorrido activo y sus acciones; `Foco` ubica el elemento, lo lleva al centro de la pantalla y sigue su posición con ResizeObserver, scroll y resize; `BurbujaGuia` muestra el texto, el paso y los botones, junto al elemento o como hoja abajo en pantallas de menos de 640 px.
- **Fondo:** 4 rectángulos oscuros con `backdrop-filter: blur(4px)` alrededor de un hueco con 8 px de margen y un anillo animado. Se eligieron en lugar de una máscara CSS porque Safari de iOS no aplica bien `mask-image` junto con `backdrop-filter`.
- **Tipos de paso:** `info` explica y bloquea el elemento; `interactivo` deja usarlo y puede esperar una condición (`con_texto` o `cambiado`) para habilitar "Siguiente" o avanzar solo; `navegacion` pide pulsarlo y la guía sigue en la página de destino.
- **Accesibilidad:** la burbuja es un `role="dialog"` con el texto en `aria-live`; ← y → para moverse, Esc pausa, Tab no sale de la burbuja ni del elemento resaltado. Con `prefers-reduced-motion` no hay animaciones.
- **Si algo falla** (un elemento que no está o un error), el paso se salta o la guía se cierra sola y la pantalla sigue usable.

**Cómo agregar un paso:** pon `data-guia="<id>"` en el elemento real (si hace falta, en un `div` sin estilos que lo envuelva) y añade `{ objetivo: '<id>', titulo, texto, tipo }` al recorrido en `src/lib/guia/recorridos.ts`. Los números de los textos se importan de `src/lib/config/gym.ts` y de las reglas. La prueba `src/lib/guia/motor.test.ts` falla si un objetivo no está marcado en ningún componente.

**Estado:** tabla `guia_usuario` (`oferta_vista_en`, `recorridos` JSONB con `{ estado, paso }` por recorrido, `actualizado_en`), migraciones `20261112000000_guia_recorridos.sql` y `20261113000000_guia_quitar_columnas_anteriores.sql`, con RLS y sin permisos públicos. `GET /api/gym/guia` devuelve el estado y los ejercicios con los que se pueden repetir los recorridos; `PATCH /api/gym/guia` recibe `{ "accion": "oferta_vista" }`, `{ "accion": "recorrido", "recorrido", "estado", "paso" }` o `{ "accion": "reiniciar" }`. Siempre usan la cuenta de la sesión.

## CHRONO, el asistente virtual

CHRONO es el chat de `/gym/chat` (opción **CHRONO** del menú). Usa el plan gratuito de [Groq](https://console.groq.com) con el modelo `openai/gpt-oss-120b` (razonamiento bajo y oculto) a través de `POST /api/gym/chat`, que responde por partes (una línea JSON por evento) para mostrar el texto a medida que llega.

- Su personalidad y reglas (rol de entrenador, temas permitidos, seguridad, estilo) están en `src/lib/chat/instrucciones.ts`; se editan ahí sin tocar la lógica del chat.
- CHRONO usa tres herramientas de consulta: `listar_ejercicios`, `ver_ejercicio` y `resumen_periodo` (`src/lib/chat/herramientas.ts`). Siempre consultan con la cuenta de la sesión, nunca con datos que mande el modelo. Los pesos le llegan en kilos y sin campos vacíos.
- **Cambios solo con confirmación:** CHRONO no escribe en la base. Tiene cuatro herramientas de propuesta: `proponer_crear_ejercicio`, `proponer_modificar_ejercicio` (enfoque, método, rango o nivel), `proponer_archivar_ejercicio` y `proponer_restaurar_ejercicio` (solo ejercicios archivados). Esas herramientas validan con las reglas de la app y devuelven una propuesta (`src/lib/chat/propuestas.ts`) que la página muestra como tarjeta con **Confirmar** y **Cancelar** (`TarjetaPropuesta`). Solo el botón Confirmar aplica el cambio, llamando a las mismas rutas de la API que usa el resto de la app (`/api/gym/ejercicios`, `.../enfoque`, `.../nivel`, `.../archivar`, `.../restaurar`). Después queda una nota en la conversación ("✅ Listo…" o "Cancelaste la propuesta…") para que CHRONO sepa el resultado.
- CHRONO no puede eliminar ejercicios para siempre. Archivar (lo que propone cuando alguien quiere "quitar" un ejercicio) conserva el histórico; para borrar uno con todos sus datos indica el botón "Eliminar ejercicio" del detalle, que no se puede deshacer.
- No puede registrar sesiones, renombrar ejercicios ni borrar historial; explica en qué sección de la app hacerlo. No da diagnósticos médicos.
- **Límites del plan gratuito de Groq:** son para toda la app (del orden de 30 consultas por minuto, 1.000 por día y pocos miles de tokens por minuto; revisa los vigentes en console.groq.com/settings/limits). Cada mensaje puede usar varias consultas si CHRONO revisa datos. Por eso el historial enviado se acota a 12 mensajes y el detalle de un ejercicio a 5 sesiones. Si se agota, CHRONO avisa que llegó al límite y pide intentar en un minuto.
- Límite diario por cuenta en la tabla `chat_uso` (migración `20261110000000_chat_uso.sql`), controlado con `CHAT_LIMITE_DIARIO`. Al llegar al límite la API responde 429.
- Sin `GROQ_API_KEY`, la página muestra "El chat todavía no está disponible" (503).
- La conversación se guarda solo en la pestaña del navegador (`sessionStorage`) y se borra con **Nuevo chat**.
- Groq retira modelos con frecuencia (ver console.groq.com/docs/deprecations). Para cambiar de modelo sin tocar el código, define `GROQ_MODELO` en Vercel; el valor por defecto está en `CHAT_MODELO` (`src/lib/config/gym.ts`).

## Registro y perfil

- **Paso 1, "Cuéntanos de ti":** nombre, "¿Cómo quieres que te llamemos?" (apodo opcional; sin apodo se usa el primer nombre), fecha de nacimiento y género. `POST /api/auth/registro/perfil` valida con zod, pasa el filtro de nombres y calcula la edad con la fecha de Colombia. Menos de 8 años → 403; menos de 12 → `requiereAutorizacion: true`.
- **Paso 2, "Tu cuenta":** correo y contraseña. `POST /api/auth/registro` vuelve a revisar todo (bloqueo, nombres y edad), crea la cuenta y su fila en `perfiles` en el mismo flujo y borra la cuenta si algo falla. "Atrás" conserva lo escrito.
- **Menores de 12 (autorización de tutores):** en el paso 2 escriben el correo de su mamá, papá o tutor (distinto del suyo). La cuenta se crea sin confirmar y con el perfil en `pendiente`; el menor todavía no recibe nada. El tutor recibe "<Apodo> quiere crear una cuenta en Gym Assistant: necesitamos tu autorización" (`plantillaAutorizacionTutor`: qué datos se guardan, el uso de Groq, sus derechos, el contacto y el plazo de 7 días) con un enlace de un solo uso a `/autorizar/<token>` (se guarda solo el hash). Abrir el enlace no decide nada: en la página el tutor elige **Autorizo** (el perfil pasa a `aprobada` y el menor recibe la confirmación normal) o **No autorizo** (con confirmación; la cuenta y sus datos se borran). Enlaces vencidos, usados o desconocidos muestran un mensaje claro (410, 409, 404).
- **Mientras espera:** el menor no puede iniciar sesión (su correo no está confirmado; el login lo explica). Tras registrarse puede usar "Reenviar al tutor" (`POST /api/auth/registro/reenviar-tutor`, respuesta siempre igual). Una cuenta pendiente con sesión (por ejemplo, una cuenta anterior que completó el perfil con una edad menor de 12) solo ve, en cualquier ruta de `/gym`, la pantalla "Esperando autorización" (con el correo del tutor enmascarado y "Reenviar al tutor", `POST /api/gym/perfil/reenviar-tutor`); el resto de `/api/gym` responde 403 `AUTORIZACION_PENDIENTE`. Cada reenvío crea un enlace nuevo y anula el anterior; como mucho 3 por día, y el plazo no se alarga.
- **Limpieza programada:** `vercel.json` define un Cron diario (08:00 UTC) a `/api/tareas/limpiar-autorizaciones`, que exige `Authorization: Bearer <CRON_SECRET>` y elimina con `eliminarCuentaConDatos` las cuentas rechazadas y las pendientes con más de 7 días. En los logs solo quedan los conteos.
- El umbral es `EDAD_MINIMA_SIN_AUTORIZACION` = 12 en `src/lib/config/gym.ts` (Ley 1581 de 2012) y puede subirse a 18.
- **Filtro de nombres** (`src/lib/reglas/nombres.ts` y `nombresBloqueados.ts`): normaliza (minúsculas, sin tildes, leetspeak, letras repetidas y separadores), compara con listas por categoría en español e inglés y respeta una lista de nombres reales (Concepción, Dick, Cassandra…). En el registro, cada rechazo suma un intento a la conexión (hash de la IP con `REGISTRO_SECRETO_IP`, tabla `registro_intentos`): del 1.º al 4.º responde 422 con "(Intento X de 5)"; el 5.º responde 429, el formulario se borra y ambos pasos quedan bloqueados 30 minutos. Un registro exitoso reinicia el contador. Al editar el perfil, un nombre rechazado solo pide cambiarlo.
- **Cuentas anteriores sin perfil:** el layout de `/gym` muestra "Completa tu perfil" en cualquier ruta, sin redirigir (un `redirect()` en un layout compartido por el origen y el destino deja la navegación del cliente en bucle). Si la fecha es de un menor de 12, el formulario pide el correo del tutor y la cuenta pasa por la misma autorización.
- **Perfil** (`/gym/perfil`, desde el botón con la foto y el apodo del menú, que también tiene Guía y Cerrar sesión): nombre, apodo y género editables (`PATCH /api/gym/perfil`); la fecha de nacimiento y el correo se muestran pero no se editan. Estadísticas de `src/lib/reglas/perfil.ts`: récords (mayor peso con sus repeticiones y mejor 1RM; en calistenia, máximo de repeticiones y variante; sin series de aproximación; "Nuevo" si es de los últimos 7 días), ejercicio favorito, racha de lunes a sábado (los domingos no suman ni la rompen) y totales.
- **Foto:** se recorta y se pasa a WebP en el navegador (canvas, 512 px). `POST /api/gym/perfil/foto` comprueba el tipo real por los bytes (JPEG, PNG o WebP; si no, 400) y el tamaño (más de 2 MB, 413) y la sube con la clave de servicio al bucket privado `avatares` en `{usuario_id}/avatar.webp`. Se muestra con URLs firmadas de una hora. `DELETE` la quita.
- **Cumpleaños:** tarjeta en `/gym` ("¡Feliz cumpleaños, <apodo>! 🎉 Hoy cumples <edad> años.") que respeta "reducir movimiento"; al cerrarla se guarda el año (`POST /api/gym/perfil/cumple`). Quien nació un 29 de febrero lo celebra el 28 en los años no bisiestos.
- **CHRONO** recibe solo el apodo (o el nombre), la edad y si hoy es el cumpleaños; nunca la fecha de nacimiento, el correo ni la foto. Con menores de 18 es más prudente.
- Base de datos: migración `20261114000000_perfil.sql` (tablas `perfiles`, `autorizaciones_tutor` y `registro_intentos`, con RLS sin políticas y sin permisos para `anon` ni `authenticated`, y el bucket privado `avatares`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas con Vitest |
| `npm run type-check` | Revisión de tipos |
| `npm run lint` | Revisión con ESLint |
| `npm run db:migrar` | Aplica las migraciones pendientes de `supabase/migrations/` |
| `npm run db:verificar` | Comprueba tablas (incluidas `chat_uso`, `guia_usuario`, `perfiles`, `autorizaciones_tutor` y `registro_intentos`), seguridad y restricciones, sin dejar cambios |
| `npm run db:demo -- <correo>` | Carga ejercicios `Demo *` en esa cuenta |
| `npm run db:limpiar -- --correo <correo>` | Borra los ejercicios `Prueba *` y `Demo *` de esa cuenta; acepta `--prueba` o `--demo` |
| `npm run correo:probar -- <correo>` | Verifica las credenciales de Gmail y envía un correo de prueba (queda en `registro_correos`) |
| `npm run correo:historial -- <correo>` | Últimos 20 intentos de envío a ese correo, en hora de Colombia |
| `npm run probar:flujo` | Recorre el flujo completo con dos cuentas temporales, incluido el aislamiento entre ellas (ejercicios, guía, perfil, foto y estadísticas), el bloqueo de intentos y la autorización de tutores (aprobar, reenviar, reusar, rechazar y vencer), y las elimina al terminar |

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
- `service_role`, la contraseña de Gmail, la clave de Groq, `CRON_SECRET`, `REGISTRO_SECRETO_IP`, `CORREO_CONTACTO` y demás secretos no deben ir en variables `NEXT_PUBLIC_*`.
- Los logs no registran nombres, fechas de nacimiento, correos de tutores ni IPs: los errores internos se registran solo con su mensaje y su pila.
- Las fotos de perfil están en un bucket privado: solo el servidor las sube, las borra y firma URLs de corta duración. Para eliminar una cuenta usa `eliminarCuentaConDatos` (`dataService`), que borra la foto y luego la cuenta; el perfil y las autorizaciones caen en cascada.
- La conexión a Postgres verifica al servidor con `supabase/ca.crt`, el certificado público de Supabase, que vence el 26 de abril de 2031. Si Supabase lo cambia, hay que descargarlo de nuevo desde Project Settings > Database > SSL Configuration.
- Las tablas del gimnasio (incluidas `chat_uso`, `guia_usuario`, `perfiles`, `autorizaciones_tutor` y `registro_intentos`) tienen RLS activo sin políticas y sin permisos para `anon` ni `authenticated`: solo se accede desde el servidor.
- Cada cuenta ve solo sus datos. La capa de datos y las herramientas del chat filtran por la cuenta de la sesión, y `npm run probar:flujo` comprueba el aislamiento. Eliminar una cuenta elimina sus datos.
- `/gym` y `/api/gym` exigen sesión. La sesión se guarda en cookies para que el servidor pueda verificarla.
- Nunca usar `SET` a nivel de sesión por `GYMLEAD_POSTGRES_URL`: el pooler comparte conexiones. Para consultar sin escribir, usar `BEGIN READ ONLY`.
- La migración `supabase/migrations/20261017000000_create_users.sql` crea `public.users`, con RLS para que cada cuenta solo vea su propio perfil.
