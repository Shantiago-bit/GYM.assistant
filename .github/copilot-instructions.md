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
- Peso: solo se sube peso si TODAS las series superan el tope del rango; si todas alcanzan el mínimo pero no todas superan, se sube la meta de repeticiones; si alguna falla el mínimo, se mantiene. El incremento por defecto es 2,5 kg.
- Calistenia: sin peso; la progresión es por repeticiones; al superar el tope en todas las series, se sugiere una variante más difícil.
- El peso se guarda en gramos enteros; se muestra en kg (2,5 kg = 2500 g).
- La recomendación se calcula sobre la última sesión del ejercicio.

## Convenciones
- Identificadores, comentarios, mensajes y textos de interfaz en español.
- Reglas de negocio solo en src/lib/reglas/: funciones puras, sin pg, sin red, sin variables de entorno y sin reloj (excepto fechas.ts). Se prueban con Vitest.
- Solo src/lib/datos/ importa src/lib/db/conexion.ts. Rutas y páginas importan datos únicamente desde src/lib/dataService.ts.
- Toda ruta en src/app/api/gym/ llama await exigirSesion() como primera instrucción.
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
4. No hacer commit: el estudiante revisa y hace el commit.
