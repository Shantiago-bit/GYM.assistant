import { execFileSync } from 'node:child_process';
import {
  buscarUsuarioPorEmail,
  cerrarConexiones,
  crearEjercicio,
  listarEjercicios,
  obtenerRecomendacion,
  registrarPruebaInicial,
  registrarSesion,
} from '@/lib/dataService';

const correo = process.argv[2];

if (!correo) {
  console.error('Uso: npm run db:demo -- <correo de la cuenta>');
  process.exit(1);
}

const conPeso = (reps: number[], pesoKg: number) => reps.map((valor) => ({ reps: valor, pesoKg }));
const sinPeso = (reps: number[]) => reps.map((valor) => ({ reps: valor }));

try {
  const usuario = await buscarUsuarioPorEmail(correo);

  if (!usuario) {
    throw new Error(`No existe una cuenta con el correo ${correo}.`);
  }

  execFileSync(
    process.execPath,
    ['--env-file=.env.local', 'scripts/limpiar-prueba.mjs', '--correo', correo, '--demo'],
    { stdio: 'ignore' },
  );

  const press = await crearEjercicio(usuario.id, {
    nombre: 'Demo Press banca',
    tipo: 'peso',
    pesoRefKg: 50,
  });
  await registrarPruebaInicial(usuario.id, press.id, conPeso([10, 10, 10], 50));
  await registrarSesion(usuario.id, press.id, { series: conPeso([13, 13, 13], 50) });

  const sentadilla = await crearEjercicio(usuario.id, {
    nombre: 'Demo Sentadilla',
    tipo: 'peso',
    pesoRefKg: 80,
  });
  await registrarPruebaInicial(usuario.id, sentadilla.id, conPeso([9, 9, 8], 80));
  await registrarSesion(usuario.id, sentadilla.id, { series: conPeso([12, 12, 6], 80) });

  const dominadas = await crearEjercicio(usuario.id, {
    nombre: 'Demo Dominadas',
    tipo: 'calistenia',
    nivel: 'Dominada estricta',
  });
  await registrarPruebaInicial(usuario.id, dominadas.id, sinPeso([16, 16, 16]));

  const flexiones = await crearEjercicio(usuario.id, {
    nombre: 'Demo Flexiones',
    tipo: 'calistenia',
    nivel: 'Flexión clásica',
  });
  await registrarPruebaInicial(usuario.id, flexiones.id, sinPeso([10, 9, 8]));
  await registrarSesion(usuario.id, flexiones.id, { series: sinPeso([12, 11, 10]) });

  const ejercicios = await listarEjercicios(usuario.id);
  const filas = [];

  for (const ejercicio of ejercicios.filter((e) => e.nombre.startsWith('Demo'))) {
    const recomendacion = await obtenerRecomendacion(usuario.id, ejercicio.id);
    filas.push({
      nombre: ejercicio.nombre,
      tipo: ejercicio.tipo,
      recomendacion: recomendacion.accion,
    });
  }

  console.table(filas);
} finally {
  await cerrarConexiones();
}
