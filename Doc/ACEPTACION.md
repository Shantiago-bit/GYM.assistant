# Aceptación · Gym Assistant

El plan pide ejecutar esta tabla en el despliegue de Vercel. **Ese despliegue aún no se hizo**: los resultados de abajo son de la ejecución en local (`next dev`, 2026-10-31), con Edge automatizado, la base real de Supabase y un usuario temporal. Al hacer push hay que repetir A-01 a A-14 en Vercel.

A-15 corresponde a las funcionalidades opcionales (P09).

| ID | Acción | Resultado esperado | Resultado obtenido | Evidencia | Observación |
|---|---|---|---|---|---|
| A-01 | Abrir `/gym` sin sesión | Redirección al login | Correcto | Local | |
| A-02 | Crear el ejercicio "Press banca" (peso, 50 kg, rango 8–12) | Aparece en la lista como tipo Peso | Correcto | Local | Se usó el nombre "Prueba UI Press banca" |
| A-03 | Intentar un ejercicio con el mismo nombre | Rechazo por duplicado | Correcto | Local | En minúsculas: "Ya existe un ejercicio con ese nombre." |
| A-04 | Registrar la prueba inicial [10,10,10] a 50 kg | Guardada; el detalle muestra el estado inicial | Correcto | Local | |
| A-05 | Ver la recomendación | "Mantén 50 kg y apunta a 12 reps" | Correcto | Local | "Cumpliste el rango. Mantén 50 kg y apunta a 12 repeticiones en todas las series la próxima vez." |
| A-06 | Registrar una sesión [13,13,13] a 50 kg | Guardada | Correcto | Local | |
| A-07 | Ver la recomendación | "Sube a 52,5 kg y vuelve a 8 reps" | Correcto | Local | "Sube el peso a 52,5 kg y vuelve a 8 repeticiones." |
| A-08 | Registrar una sesión [12,12,6] a 52,5 kg | Guardada | Correcto | Local | El formulario precarga 52,5 kg |
| A-09 | Ver la recomendación | "Mantén 52,5 kg" | Correcto | Local | "No alcanzaste el mínimo en todas las series. Mantén 52,5 kg y repite el objetivo." |
| A-10 | Crear "Dominadas" (calistenia, rango 8–15) y su prueba [16,16,16] | Recomendación: "Prueba una variante más difícil" | Correcto | Local | |
| A-11 | Intentar registrar una sesión de un ejercicio sin prueba inicial | Rechazo: registre la prueba primero | Correcto | Local | La pantalla redirige a la prueba; la API responde 409 |
| A-12 | Ver el histórico de Press banca | Las sesiones ordenadas, la más reciente primero | Correcto | Local | |
| A-13 | Archivar un ejercicio | Sale de la lista activa; su histórico se conserva | Correcto | Local | Sigue disponible en "Ver archivados" |
| A-14 | Cerrar el navegador y volver a entrar | Los datos persisten | Correcto | Local | |
| A-15 | (Opcional) Ver el resumen de progreso | Tendencia por ejercicio | Correcto | Local | `/gym/resumen` muestra sesiones, ejercicios e indicador de progreso; el detalle muestra la tendencia |
