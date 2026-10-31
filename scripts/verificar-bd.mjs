import { crearCliente } from './conexion.mjs';

const TABLAS = ['ejercicios', 'sesiones', 'series'];
const RESTRICCIONES = [
  'ejercicios_nombre_minimo',
  'ejercicios_tipo_valido',
  'ejercicios_rango_valido',
  'ejercicios_meta_valida',
  'ejercicios_peso_segun_tipo',
  'sesiones_fecha_no_futura',
  'series_numero_positivo',
  'series_reps_no_neg',
  'series_peso_no_neg',
  'series_unica_por_sesion',
];
const INDICES_UNICOS = [
  'ux_ejercicios_nombre',
  'ux_sesiones_prueba_por_ejercicio',
  'series_unica_por_sesion',
];

const INSERTAR_EJERCICIO = `
  INSERT INTO ejercicios (nombre, tipo, rango_min, rango_max, peso_ref_gramos, meta_reps)
  VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
const INSERTAR_SESION = `
  INSERT INTO sesiones (ejercicio_id, fecha, es_prueba)
  VALUES ($1, CURRENT_DATE, $2) RETURNING id`;
const INSERTAR_SERIE = `
  INSERT INTO series (sesion_id, numero, reps, peso_gramos) VALUES ($1, $2, $3, $4)`;

const cliente = crearCliente();
let fallas = 0;

function reportar(correcto, descripcion) {
  console.log(`${correcto ? 'OK   ' : 'FALLA'} ${descripcion}`);
  if (!correcto) {
    fallas += 1;
  }
}

async function debeFallar(descripcion, codigo, restriccion, sql, valores) {
  await cliente.query('SAVEPOINT caso');
  try {
    await cliente.query(sql, valores);
    reportar(false, `${descripcion}: se aceptó y debía rechazarse`);
  } catch (error) {
    const correcto = error.code === codigo && (!restriccion || error.constraint === restriccion);
    reportar(correcto, `${descripcion}: ${error.code} (${error.constraint ?? 'sin restricción'})`);
  }
  await cliente.query('ROLLBACK TO SAVEPOINT caso');
}

try {
  await cliente.connect();

  console.log('1. Objetos');
  const objetos = await cliente.query(
    `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND relname = ANY($1)`,
    [[...TABLAS, 'v_ejercicios']],
  );
  const existentes = new Set(objetos.rows.map((fila) => fila.relname));
  for (const nombre of [...TABLAS, 'v_ejercicios']) {
    reportar(existentes.has(nombre), `existe ${nombre}`);
  }

  console.log('2. Filas');
  for (const tabla of TABLAS) {
    const { rows } = await cliente.query(`SELECT COUNT(*)::int AS total FROM ${tabla}`);
    console.log(`     ${tabla}: ${rows[0].total}`);
  }

  console.log('3. Restricciones e índices únicos');
  const restricciones = await cliente.query(
    'SELECT conname FROM pg_constraint WHERE conname = ANY($1)',
    [RESTRICCIONES],
  );
  const hallados = new Set(restricciones.rows.map((fila) => fila.conname));
  for (const nombre of RESTRICCIONES) {
    reportar(hallados.has(nombre), `restricción ${nombre}`);
  }
  const indices = await cliente.query(
    `SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
     WHERE i.indisunique AND c.relname = ANY($1)`,
    [INDICES_UNICOS],
  );
  const indicesHallados = new Set(indices.rows.map((fila) => fila.relname));
  for (const nombre of INDICES_UNICOS) {
    reportar(indicesHallados.has(nombre), `índice único ${nombre}`);
  }

  console.log('4. Seguridad');
  const rls = await cliente.query(
    `SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND relname = ANY($1)`,
    [TABLAS],
  );
  for (const fila of rls.rows) {
    reportar(fila.relrowsecurity, `RLS activo en ${fila.relname}`);
  }
  const permisos = await cliente.query(
    `SELECT grantee, table_name FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated') AND table_name = ANY($1)`,
    [[...TABLAS, 'v_ejercicios', '_migrations']],
  );
  reportar(permisos.rowCount === 0, `sin permisos para anon ni authenticated (${permisos.rowCount})`);

  console.log('5. Integridad (transacción con ROLLBACK)');
  await cliente.query('BEGIN');
  try {
    const { rows: creado } = await cliente.query(INSERTAR_EJERCICIO, [
      'Verif Press', 'peso', 8, 12, 50000, 12,
    ]);
    const ejercicioId = creado[0].id;
    reportar(Boolean(ejercicioId), 'a) crear ejercicio Verif Press');

    await debeFallar('b) nombre repetido', '23505', 'ux_ejercicios_nombre', INSERTAR_EJERCICIO, [
      'verif press', 'peso', 8, 12, 50000, 12,
    ]);
    await debeFallar('c) peso sin referencia', '23514', 'ejercicios_peso_segun_tipo', INSERTAR_EJERCICIO, [
      'Verif C', 'peso', 8, 12, null, 12,
    ]);
    await debeFallar('d) calistenia con peso', '23514', 'ejercicios_peso_segun_tipo', INSERTAR_EJERCICIO, [
      'Verif D', 'calistenia', 8, 15, 50000, 15,
    ]);
    // Con el rango invertido ninguna meta es válida, y Postgres evalúa los CHECK en orden alfabético:
    // salta primero ejercicios_meta_valida. ejercicios_rango_valido se aísla con rango_min 0.
    await debeFallar('e) rango invertido', '23514', 'ejercicios_meta_valida', INSERTAR_EJERCICIO, [
      'Verif E', 'peso', 12, 8, 50000, 12,
    ]);
    await debeFallar('e) rango con mínimo 0', '23514', 'ejercicios_rango_valido', INSERTAR_EJERCICIO, [
      'Verif E2', 'peso', 0, 8, 50000, 8,
    ]);

    const { rows: sesion } = await cliente.query(INSERTAR_SESION, [ejercicioId, true]);
    const sesionId = sesion[0].id;
    await debeFallar(
      'f) segunda prueba inicial',
      '23505',
      'ux_sesiones_prueba_por_ejercicio',
      INSERTAR_SESION,
      [ejercicioId, true],
    );

    await debeFallar('g) serie con reps -1', '23514', 'series_reps_no_neg', INSERTAR_SERIE, [
      sesionId, 1, -1, 50000,
    ]);
    await cliente.query(INSERTAR_SERIE, [sesionId, 1, 10, 50000]);
    await debeFallar('g) serie con número repetido', '23505', 'series_unica_por_sesion', INSERTAR_SERIE, [
      sesionId, 1, 10, 50000,
    ]);
  } finally {
    await cliente.query('ROLLBACK');
  }
} catch (error) {
  console.error('FALLA de ejecución:', error.message);
  fallas += 1;
} finally {
  await cliente.end().catch(() => {});
}

console.log(`Total de fallas: ${fallas}`);
process.exitCode = fallas > 0 ? 1 : 0;
