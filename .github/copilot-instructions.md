# Gym Assistant · Instrucciones para Copilot

## Documentos rectores
- Plan técnico: Doc/PLAN_GYM.md. Si una instrucción contradice el plan, prevalece el plan.
- Estado real del repositorio: Doc/ESTADO_ACTUAL.md.
- Avance: Doc/ESTADO_EJECUCION.md. Se actualiza al final de cada tarea.

## Stack
- Next.js App Router + TypeScript + Tailwind CSS. Despliegue en Vercel.
- Postgres de Supabase con el paquete pg y la variable GYMLEAD_POSTGRES_URL.
- Validación con Zod. Pruebas con Vitest.
- Login existente: Supabase Auth con correo y contraseña (src/components/auth/LoginForm.tsx). No se reescribe. Puerta única, sin roles.

## Lo más importante del dominio
- La lógica de progresión (doble progresión) vive en src/lib/reglas/progresion.ts, como funciones puras probadas. Es el núcleo del proyecto.
- Peso: se sube peso cuando TODAS las series llegan al tope del rango (reps >= max); si todas alcanzan el mínimo pero no todas llegan al tope, se sube la meta de repeticiones; si alguna falla el mínimo, se mantiene. El incremento es 2,5 kg, o 5 kg si el peso actual es de 50 kg o más. Al cumplir la meta, la interfaz muestra el modal "¡Meta alcanzada!" con el resumen y el peso siguiente.
- Calistenia: sin peso; la progresión es por repeticiones; al llegar al tope en todas las series, se sugiere una variante más difícil.
- RIR opcional por serie (0–10): si todas las series llegan al tope con RIR >= 3, el incremento se duplica. Dos sesiones seguidas con alguna serie bajo el mínimo → `bajar_peso` (10 % menos, redondeado a 0,5 kg). El 1RM estimado usa Epley con reps + RIR (máximo 12).
- Enfoque por ejercicio (fuerza / hipertrofia / resistencia): solo sugiere el rango; las reglas de progresión son las mismas.
- Método de series por ejercicio (`reglas/metodos.ts`): rectas, principal_descarga, piramide_invertida, piramide_ascendente, cluster. La progresión, el salto doble, la descarga y el logro se evalúan solo sobre las series clave (`indicesClave`); `planDeSesion` deriva el peso de las demás. Calistenia solo admite rectas y cluster.
- El peso se guarda en gramos enteros; se muestra en kg (2,5 kg = 2500 g).
- La recomendación se calcula sobre la última sesión del ejercicio.

## Convenciones
- Identificadores, comentarios, mensajes y textos de interfaz en español.
- Reglas de negocio solo en src/lib/reglas/: funciones puras, sin pg, sin red, sin variables de entorno y sin reloj (excepto fechas.ts). Se prueban con Vitest.
- Solo src/lib/datos/ importa src/lib/db/conexion.ts. Rutas y páginas importan datos únicamente desde src/lib/dataService.ts.
- Toda ruta en src/app/api/gym/ llama await exigirSesion() como primera instrucción.
- Cada cuenta ve solo sus datos: las funciones de src/lib/datos/ reciben usuarioId de la sesión y nunca del cliente (sección 20 del plan).
- Sesiones y series en una transacción. Una sola prueba inicial por ejercicio.
- Fechas 'YYYY-MM-DD' como texto entre capas. Zona horaria America/Bogota; "hoy" solo con hoyBogota().
- En rutas dinámicas params es una Promise: const { id } = await params.
- SQL siempre con parámetros. Nunca concatenar valores.
- Sesiones y series no se editan ni se borran. Un ejercicio se archiva, no se elimina.
- No instalar librerías de componentes (shadcn, MUI u otras). Usar src/components/ui/.
- Prefijo de imports para lib: @/lib/. Archivo de protección: src/middleware.ts. Ruta de login: /login.

## Al terminar cada tarea
1. npm run build sin errores.
2. npm test sin fallas (desde que exista Vitest).
3. Actualizar Doc/ESTADO_EJECUCION.md.
4. Hacer commit y push al terminar cada cambio importante, y confirmar el despliegue en Vercel.

## Base de datos
- Nunca usar SET a nivel de sesión por GYMLEAD_POSTGRES_URL: el pooler comparte conexiones y el ajuste queda activo para otras solicitudes. Para consultar sin escribir, usar BEGIN READ ONLY.
