// Administradores del panel /admin. Nadie se vuelve administrador desde la interfaz: solo con este script, que
// usa la conexión de .env.local y deja cada cambio en auditoria_admin (con admin_id NULL: lo hizo un script).
//
//   npm run admin:asignar -- <correo> [admin|lectura]   (por defecto, admin)
//   npm run admin:quitar -- <correo>
//
// 'admin' puede ver y actuar; 'lectura' solo ver. La cuenta debe existir (registrarse antes en la app) y, al
// entrar por primera vez a /admin, registrar la verificación en dos pasos.
import { crearCliente } from './conexion.mjs';

const ROLES = ['admin', 'lectura'];

function mascara(correo) {
  const [usuario = '', dominio = ''] = correo.trim().toLowerCase().split('@');
  return `${usuario.slice(0, 1)}•••••${usuario.length > 1 ? usuario.slice(-1) : ''}@${dominio}`;
}

const [accion, correo, rolPedido = 'admin'] = process.argv.slice(2);

if (!['asignar', 'quitar'].includes(accion) || !correo?.includes('@') || (accion === 'asignar' && !ROLES.includes(rolPedido))) {
  console.error('Uso: npm run admin:asignar -- <correo> [admin|lectura]');
  console.error('     npm run admin:quitar -- <correo>');
  process.exit(1);
}

const cliente = crearCliente();

try {
  await cliente.connect();
  await cliente.query('BEGIN');

  const { rows: cuentas } = await cliente.query('SELECT id FROM auth.users WHERE lower(email) = lower($1)', [correo.trim()]);
  const cuenta = cuentas[0];
  if (!cuenta) {
    throw new Error(`No hay ninguna cuenta con el correo ${mascara(correo)}. La persona debe registrarse primero en la app.`);
  }

  if (accion === 'asignar') {
    const { rows } = await cliente.query(
      `INSERT INTO administradores (usuario_id, rol) VALUES ($1, $2)
       ON CONFLICT (usuario_id) DO UPDATE SET rol = EXCLUDED.rol
       RETURNING (xmax = 0) AS nuevo`,
      [cuenta.id, rolPedido],
    );
    await cliente.query(
      `INSERT INTO auditoria_admin (admin_id, accion, objetivo_usuario_id, detalle) VALUES (NULL, 'asignar_admin', $1, $2)`,
      [cuenta.id, JSON.stringify({ origen: 'script', rol: rolPedido })],
    );
    console.log(
      `${rows[0]?.nuevo ? 'Asignado' : 'Actualizado'}: ${mascara(correo)} ahora administra con el rol "${rolPedido}". Quedó en la auditoría.`,
    );
    console.log('Al entrar a /admin, la cuenta registrará la verificación en dos pasos (código QR).');
  } else {
    const { rows } = await cliente.query('DELETE FROM administradores WHERE usuario_id = $1 RETURNING rol', [cuenta.id]);
    if (rows.length === 0) {
      console.log(`${mascara(correo)} no administraba: no hay nada que quitar.`);
    } else {
      await cliente.query(
        `INSERT INTO auditoria_admin (admin_id, accion, objetivo_usuario_id, detalle) VALUES (NULL, 'quitar_admin', $1, $2)`,
        [cuenta.id, JSON.stringify({ origen: 'script', rol_anterior: rows[0].rol })],
      );
      console.log(`Quitado: ${mascara(correo)} ya no administra (era "${rows[0].rol}"). Quedó en la auditoría.`);
      console.log('Su sesión actual en /admin deja de funcionar en la siguiente solicitud.');
    }
  }

  await cliente.query('COMMIT');
} catch (error) {
  await cliente.query('ROLLBACK').catch(() => {});
  console.error(`No se pudo completar: ${error.message}`);
  process.exitCode = 1;
} finally {
  await cliente.end().catch(() => {});
}
