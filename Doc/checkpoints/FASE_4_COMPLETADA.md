# Fase 4 completada · Datos y API

`npm run probar:flujo`: 14 pasos OK, 0 fallas (salida completa en la bitácora de P04).

## Verificación HTTP en local

Sin sesión, `GET /api/gym/ejercicios`, `POST /api/gym/ejercicios` y `GET /api/gym/ejercicios/x/recomendacion` responden 401.

Con sesión real:

| Operación | Resultado |
|---|---|
| Crear ejercicio de peso | 201 |
| Crear el mismo nombre en minúsculas | 409 `EJERCICIO_DUPLICADO` |
| Sesión sin prueba inicial | 409 `PRUEBA_REQUERIDA` |
| Prueba inicial [10,10,10] a 50 kg | 201 |
| Sesión [13,13,13] a 50 kg | 201 |
| Recomendación | 200, `subir_peso`, 52500 g, meta 8: "Sube el peso a 52,5 kg y vuelve a 8 repeticiones." |
| Detalle | 200, con 2 sesiones y la recomendación incluida |
| Fecha futura | 400 `DATOS_INVALIDOS` |
| Sesión sin series | 400 `DATOS_INVALIDOS` |
| Reps fuera de rango (99999) | 400 `DATOS_INVALIDOS` |
| Cuerpo que no es JSON | 400 `DATOS_INVALIDOS` |
| Id mal formado | 404 `EJERCICIO_NO_ENCONTRADO` |
| Id inexistente | 404 `EJERCICIO_NO_ENCONTRADO` |
| Archivar | 200; sale de la lista activa y sigue con `incluirArchivados=true` |
