# Fase 5 completada · Interfaz

Pantallas disponibles: `/gym`, `/gym/ejercicios/nuevo`, `/gym/ejercicios/[id]`, `/gym/ejercicios/[id]/prueba` y `/gym/ejercicios/[id]/sesion`.

## Verificación

Recorrido automatizado con Edge contra la base real:

- Crear ejercicio, duplicado rechazado, prueba inicial, sesiones, recomendación, histórico, archivado con confirmación (Escape cierra el modal), persistencia y cierre de sesión.
- A 375 px de ancho, la lista, el detalle y el registro de sesión no tienen desborde horizontal. El menú móvil abre y cierra sesión.
- Revisión visual con capturas en escritorio y móvil.

## Notas

- Con Tailwind 3, los colores están como variables CSS en `globals.css` y se exponen en `tailwind.config.ts`.
- `src/app/page.tsx` redirige según la sesión, como pide la sección 5. P06 pedía conservar el contenido propio, pero prevalece el plan. `src/components/home/HolaMundo.tsx` sigue en el repositorio sin uso.
- `src/lib/http/cliente.ts` (POST desde formularios), `BotonArchivar.tsx` y `cargar.ts` no estaban en el árbol del plan: son el mínimo que necesitan los formularios y las páginas de detalle.
- "Ver archivados" en `/gym` no está en el plan. Sin ese enlace, un ejercicio archivado no tendría forma de consultarse, y A-13 exige que su histórico se conserve.
- Al registrar una sesión, el formulario precarga el peso sugerido.
- Tras cambiar `tailwind.config.ts` hay que reiniciar el servidor de desarrollo; si no, los colores nuevos no aparecen.
- Los tres commits de la interfaz se construyeron y verificaron juntos, porque `typedRoutes` exige que los enlaces apunten a páginas existentes. Solo el último compila por sí solo.
