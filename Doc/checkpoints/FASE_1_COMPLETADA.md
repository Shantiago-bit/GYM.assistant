# Fase 1 completada · Base de datos

`npm run db:migrar` aplicó M1 y M2 y registró sin ejecutar `20261017000000_create_users.sql`, que ya estaba en la base. Una segunda ejecución las omite todas.

Salida de `npm run db:verificar`:

```text
1. Objetos
OK    existe ejercicios
OK    existe sesiones
OK    existe series
OK    existe v_ejercicios
2. Filas
     ejercicios: 0
     sesiones: 0
     series: 0
3. Restricciones e índices únicos
OK    restricción ejercicios_nombre_minimo
OK    restricción ejercicios_tipo_valido
OK    restricción ejercicios_rango_valido
OK    restricción ejercicios_meta_valida
OK    restricción ejercicios_peso_segun_tipo
OK    restricción sesiones_fecha_no_futura
OK    restricción series_numero_positivo
OK    restricción series_reps_no_neg
OK    restricción series_peso_no_neg
OK    restricción series_unica_por_sesion
OK    índice único ux_ejercicios_nombre
OK    índice único ux_sesiones_prueba_por_ejercicio
OK    índice único series_unica_por_sesion
4. Seguridad
OK    RLS activo en ejercicios
OK    RLS activo en series
OK    RLS activo en sesiones
OK    sin permisos para anon ni authenticated (0)
5. Integridad (transacción con ROLLBACK)
OK    a) crear ejercicio Verif Press
OK    b) nombre repetido: 23505 (ux_ejercicios_nombre)
OK    c) peso sin referencia: 23514 (ejercicios_peso_segun_tipo)
OK    d) calistenia con peso: 23514 (ejercicios_peso_segun_tipo)
OK    e) rango invertido: 23514 (ejercicios_meta_valida)
OK    e) rango con mínimo 0: 23514 (ejercicios_rango_valido)
OK    f) segunda prueba inicial: 23505 (ux_sesiones_prueba_por_ejercicio)
OK    g) serie con reps -1: 23514 (series_reps_no_neg)
OK    g) serie con número repetido: 23505 (series_unica_por_sesion)
Total de fallas: 0
```

Diferencia con P01: el caso e pedía ver `ejercicios_rango_valido`, pero con el rango invertido Postgres reporta antes `ejercicios_meta_valida`, porque ninguna meta es válida y los CHECK se evalúan en orden alfabético. El rechazo 23514 es el esperado. Se agregó un caso con `rango_min` 0 para comprobar la otra restricción.
