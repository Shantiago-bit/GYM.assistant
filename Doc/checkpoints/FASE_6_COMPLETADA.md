# Fase 6 completada · Revisión y pruebas

## Pruebas

| Comando | Resultado |
|---|---|
| `npm test` | 10 archivos, 49 pruebas en verde |
| `npm run probar:flujo` | 14 pasos OK, 0 fallas |
| `npm run db:verificar` | 0 fallas |
| `npm run build` | Correcto |

Las pruebas bajaron de 55 a 49 porque se eliminaron las 6 de `src/lib/progression.test.ts`, junto con el módulo que probaban.

## Revisión contra las secciones 6 y 15

| Revisión | Resultado |
|---|---|
| Progresión fuera de `lib/reglas/progresion.ts` | **Encontrada y corregida:** `src/lib/progression.ts`, sin uso y con reglas contrarias al plan (`>=` en el tope), se eliminó |
| Sube peso sin que todas las series superen el tope | No |
| Peso con decimales en lugar de gramos | No; los kilos se convierten al entrar a la capa de datos |
| Sesiones o series editables | No hay `UPDATE` ni `DELETE` en `src/` |
| Rutas sin `exigirSesion` | Ninguna |
| "Hoy" con `new Date()` fuera de `fechas.ts` | No |
| SQL concatenado | No; `CAMPOS_SESION` es una constante sin valores de usuario |
| Textos en inglés | No en la interfaz; los esquemas de Zod ya tienen mensajes en español |
| Recomendación solo con color | No; siempre lleva texto |
| Importaciones de `conexion.ts` fuera de `lib/datos/` | Ninguna |

## Seguridad

- `.env.local` está ignorado por Git y no aparece en el historial.
- La búsqueda de JWT, claves `sb_` y URLs de Postgres con contraseña en los archivos versionados no encontró nada.
- `.env.example` solo lleva nombres.

## Aceptación

A-01 a A-14 pasan en local (`Doc/ACEPTACION.md`). **Pendiente: repetirlas en Vercel**, porque aún no se ha hecho push.
