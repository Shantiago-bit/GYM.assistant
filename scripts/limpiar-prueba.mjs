import { crearCliente } from './conexion.mjs';

const argumentos = process.argv.slice(2);
const soloPrueba = argumentos.includes('--prueba');
const soloDemo = argumentos.includes('--demo');
const correo = argumentos[argumentos.indexOf('--correo') + 1];

// Los nombres ya no identifican datos de prueba: cualquier cuenta puede tener un ejercicio "Prueba ...".
if (!argumentos.includes('--correo') || !correo) {
  console.error('Uso: npm run db:limpiar -- --correo <correo> [--prueba | --demo]');
  process.exit(1);
}

const prefijos = [];
if (soloPrueba || !soloDemo) prefijos.push('Prueba%');
if (soloDemo || !soloPrueba) prefijos.push('Demo%');

const cliente = crearCliente();

try {
  await cliente.connect();
  await cliente.query('BEGIN');

  const { rows } = await cliente.query(
    `SELECT e.id FROM ejercicios e
     JOIN auth.users u ON u.id = e.usuario_id
     WHERE lower(u.email) = lower($1) AND e.nombre LIKE ANY($2)`,
    [correo, prefijos],
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
