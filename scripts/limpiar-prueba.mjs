import { crearCliente } from './conexion.mjs';

const soloPrueba = process.argv.includes('--prueba');
const soloDemo = process.argv.includes('--demo');

const prefijos = [];
if (soloPrueba || !soloDemo) prefijos.push('Prueba%');
if (soloDemo || !soloPrueba) prefijos.push('Demo%');

const cliente = crearCliente();

try {
  await cliente.connect();
  await cliente.query('BEGIN');

  const { rows } = await cliente.query(
    'SELECT id FROM ejercicios WHERE nombre LIKE ANY($1)',
    [prefijos],
  );
  const ids = rows.map((fila) => fila.id);

  const series = await cliente.query(
    `DELETE FROM series WHERE sesion_id IN (SELECT id FROM sesiones WHERE ejercicio_id = ANY($1::uuid[]))`,
    [ids],
  );
  const sesiones = await cliente.query('DELETE FROM sesiones WHERE ejercicio_id = ANY($1::uuid[])', [ids]);
  const ejercicios = await cliente.query('DELETE FROM ejercicios WHERE id = ANY($1::uuid[])', [ids]);

  await cliente.query('COMMIT');
  console.log(
    `Borrados: ${ejercicios.rowCount} ejercicios, ${sesiones.rowCount} sesiones, ${series.rowCount} series.`,
  );
} catch (error) {
  await cliente.query('ROLLBACK').catch(() => {});
  console.error('La limpieza falló:', error.message);
  process.exitCode = 1;
} finally {
  await cliente.end().catch(() => {});
}
