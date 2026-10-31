import { execFileSync } from 'node:child_process';
import {
  cerrarConexiones,
  crearEjercicio,
  listarEjercicios,
  obtenerRecomendacion,
  registrarPruebaInicial,
  registrarSesion,
} from '@/lib/dataService';

const conPeso = (reps: number[], pesoKg: number) => reps.map((valor) => ({ reps: valor, pesoKg }));
const sinPeso = (reps: number[]) => reps.map((valor) => ({ reps: valor }));

execFileSync(process.execPath, ['--env-file=.env.local', 'scripts/limpiar-prueba.mjs', '--demo'], {
  stdio: 'ignore',
});

try {
  const press = await crearEjercicio({ nombre: 'Demo Press banca', tipo: 'peso', pesoRefKg: 50 });
  await registrarPruebaInicial(press.id, conPeso([10, 10, 10], 50));
  await registrarSesion(press.id, { series: conPeso([13, 13, 13], 50) });

  const sentadilla = await crearEjercicio({ nombre: 'Demo Sentadilla', tipo: 'peso', pesoRefKg: 80 });
  await registrarPruebaInicial(sentadilla.id, conPeso([9, 9, 8], 80));
  await registrarSesion(sentadilla.id, { series: conPeso([12, 12, 6], 80) });

  const dominadas = await crearEjercicio({
    nombre: 'Demo Dominadas',
    tipo: 'calistenia',
    nivel: 'Dominada estricta',
  });
  await registrarPruebaInicial(dominadas.id, sinPeso([16, 16, 16]));

  const flexiones = await crearEjercicio({
    nombre: 'Demo Flexiones',
    tipo: 'calistenia',
    nivel: 'Flexión clásica',
  });
  await registrarPruebaInicial(flexiones.id, sinPeso([10, 9, 8]));
  await registrarSesion(flexiones.id, { series: sinPeso([12, 11, 10]) });

  const ejercicios = await listarEjercicios();
  const filas = [];

  for (const ejercicio of ejercicios.filter((e) => e.nombre.startsWith('Demo'))) {
    const recomendacion = await obtenerRecomendacion(ejercicio.id);
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
