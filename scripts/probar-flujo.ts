import { execFileSync } from 'node:child_process';
import {
  archivarEjercicio,
  cerrarConexiones,
  crearEjercicio,
  listarEjercicios,
  listarSesiones,
  obtenerEjercicio,
  obtenerRecomendacion,
  registrarPruebaInicial,
  registrarSesion,
} from '@/lib/dataService';
import { ErrorDeNegocio, type CodigoError } from '@/lib/reglas/errores';

let fallas = 0;

function reportar(paso: number, correcto: boolean, descripcion: string): void {
  console.log(`${correcto ? 'OK   ' : 'FALLA'} Paso ${paso}: ${descripcion}`);
  if (!correcto) {
    fallas += 1;
  }
}

async function esperarError(paso: number, codigo: CodigoError, accion: () => Promise<unknown>) {
  try {
    await accion();
    reportar(paso, false, `se esperaba ${codigo} y no hubo error`);
  } catch (error) {
    const obtenido = error instanceof ErrorDeNegocio ? error.codigo : String(error);
    reportar(paso, obtenido === codigo, `error ${obtenido}`);
  }
}

function limpiar(): void {
  execFileSync(process.execPath, ['--env-file=.env.local', 'scripts/limpiar-prueba.mjs', '--prueba'], {
    stdio: 'ignore',
  });
}

const series = (reps: number[], pesoKg?: number) =>
  reps.map((valor) => (pesoKg === undefined ? { reps: valor } : { reps: valor, pesoKg }));

async function principal(): Promise<void> {
  const { id: press } = await crearEjercicio({
    nombre: 'Prueba Press banca',
    tipo: 'peso',
    pesoRefKg: 50,
    rangoMin: 8,
    rangoMax: 12,
  });
  const creado = await obtenerEjercicio(press);
  reportar(1, creado.ejercicio.metaReps === 12, `creado con meta ${creado.ejercicio.metaReps}`);

  await esperarError(2, 'EJERCICIO_DUPLICADO', () =>
    crearEjercicio({ nombre: 'prueba press banca', tipo: 'peso', pesoRefKg: 50 }),
  );
  await esperarError(3, 'DATOS_INVALIDOS', () =>
    crearEjercicio({ nombre: 'Prueba Sin peso', tipo: 'peso' }),
  );
  await esperarError(4, 'PRUEBA_REQUERIDA', () =>
    registrarSesion(press, { series: series([10, 10, 10], 50) }),
  );

  const prueba = await registrarPruebaInicial(press, series([10, 10, 10], 50));
  reportar(5, prueba.esPrueba, `prueba guardada, es_prueba ${prueba.esPrueba}`);

  await esperarError(6, 'PRUEBA_YA_REGISTRADA', () =>
    registrarPruebaInicial(press, series([10, 10, 10], 50)),
  );

  const paso7 = await obtenerRecomendacion(press);
  reportar(
    7,
    paso7.accion === 'subir_reps' && paso7.pesoSugeridoGramos === 50000 && paso7.metaRepsSugerida === 12,
    `${paso7.accion}, ${paso7.pesoSugeridoGramos} g, meta ${paso7.metaRepsSugerida}`,
  );

  const paso8 = await registrarSesion(press, { series: series([13, 13, 13], 50) });
  reportar(8, paso8.series.length === 3, `sesión guardada con ${paso8.series.length} series`);

  const paso9 = await obtenerRecomendacion(press);
  reportar(
    9,
    paso9.accion === 'subir_peso' && paso9.pesoSugeridoGramos === 52500 && paso9.metaRepsSugerida === 8,
    `${paso9.accion}, ${paso9.pesoSugeridoGramos} g, meta ${paso9.metaRepsSugerida}`,
  );

  const paso10 = await registrarSesion(press, { series: series([12, 12, 6], 52.5) });
  reportar(10, paso10.series[0]?.pesoGramos === 52500, `sesión guardada a ${paso10.series[0]?.pesoGramos} g`);

  const paso11 = await obtenerRecomendacion(press);
  reportar(
    11,
    paso11.accion === 'mantener' && paso11.pesoSugeridoGramos === 52500,
    `${paso11.accion}, ${paso11.pesoSugeridoGramos} g`,
  );

  const { id: dominadas } = await crearEjercicio({
    nombre: 'Prueba Dominadas',
    tipo: 'calistenia',
    rangoMin: 8,
    rangoMax: 15,
  });
  await registrarPruebaInicial(dominadas, series([16, 16, 16]));
  const paso12 = await obtenerRecomendacion(dominadas);
  reportar(
    12,
    paso12.accion === 'subir_variante' && paso12.pesoSugeridoGramos === null,
    `${paso12.accion}, peso ${paso12.pesoSugeridoGramos}`,
  );

  const historico = await listarSesiones(press);
  reportar(
    13,
    historico.length === 3 && historico[0]?.id === paso10.id && historico[2]?.esPrueba === true,
    `${historico.length} sesiones, la más reciente primero`,
  );

  await archivarEjercicio(press);
  const activos = await listarEjercicios();
  const todos = await listarEjercicios({ incluirArchivados: true });
  reportar(
    14,
    !activos.some((e) => e.id === press) && todos.some((e) => e.id === press),
    'archivado: fuera de la lista activa, presente con incluirArchivados',
  );
}

limpiar();

try {
  await principal();
} catch (error) {
  console.error('FALLA de ejecución:', error);
  fallas += 1;
} finally {
  limpiar();
  await cerrarConexiones();
}

console.log(`Total de fallas: ${fallas}`);
process.exitCode = fallas > 0 ? 1 : 0;
