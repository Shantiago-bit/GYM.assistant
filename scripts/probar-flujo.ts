import { randomUUID } from 'node:crypto';
import {
  actualizarNivel,
  archivarEjercicio,
  cerrarConexiones,
  crearEjercicio,
  listarEjercicios,
  listarSesiones,
  obtenerEjercicio,
  obtenerRecomendacion,
  obtenerResumen,
  registrarPruebaInicial,
  registrarSesion,
  supabaseAdmin,
} from '@/lib/dataService';
import { ErrorDeNegocio, type CodigoError } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';

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

async function crearCuentaTemporal(): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: `flujo-${randomUUID()}@example.com`,
    password: randomUUID(),
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  return data.user.id;
}

const eliminarCuenta = (id: string) => supabaseAdmin.auth.admin.deleteUser(id);

const series = (reps: number[], pesoKg?: number) =>
  reps.map((valor) => (pesoKg === undefined ? { reps: valor } : { reps: valor, pesoKg }));

async function principal(cuentaA: string, cuentaB: string): Promise<void> {
  const { id: press } = await crearEjercicio(cuentaA, {
    nombre: 'Prueba Press banca',
    tipo: 'peso',
    pesoRefKg: 50,
    rangoMin: 8,
    rangoMax: 12,
  });
  const creado = await obtenerEjercicio(cuentaA, press);
  reportar(1, creado.ejercicio.metaReps === 12, `creado con meta ${creado.ejercicio.metaReps}`);

  await esperarError(2, 'EJERCICIO_DUPLICADO', () =>
    crearEjercicio(cuentaA, { nombre: 'prueba press banca', tipo: 'peso', pesoRefKg: 50 }),
  );
  await esperarError(3, 'DATOS_INVALIDOS', () =>
    crearEjercicio(cuentaA, { nombre: 'Prueba Sin peso', tipo: 'peso' }),
  );
  await esperarError(4, 'PRUEBA_REQUERIDA', () =>
    registrarSesion(cuentaA, press, { series: series([10, 10, 10], 50) }),
  );

  const prueba = await registrarPruebaInicial(cuentaA, press, series([10, 10, 10], 50));
  reportar(5, prueba.esPrueba, `prueba guardada, es_prueba ${prueba.esPrueba}`);

  await esperarError(6, 'PRUEBA_YA_REGISTRADA', () =>
    registrarPruebaInicial(cuentaA, press, series([10, 10, 10], 50)),
  );

  const paso7 = await obtenerRecomendacion(cuentaA, press);
  reportar(
    7,
    paso7.accion === 'subir_reps' && paso7.pesoSugeridoGramos === 50000 && paso7.metaRepsSugerida === 12,
    `${paso7.accion}, ${paso7.pesoSugeridoGramos} g, meta ${paso7.metaRepsSugerida}`,
  );

  const paso8 = await registrarSesion(cuentaA, press, { series: series([13, 13, 13], 50) });
  reportar(8, paso8.series.length === 3, `sesión guardada con ${paso8.series.length} series`);

  const paso9 = await obtenerRecomendacion(cuentaA, press);
  reportar(
    9,
    paso9.accion === 'subir_peso' && paso9.pesoSugeridoGramos === 52500 && paso9.metaRepsSugerida === 8,
    `${paso9.accion}, ${paso9.pesoSugeridoGramos} g, meta ${paso9.metaRepsSugerida}`,
  );

  const paso10 = await registrarSesion(cuentaA, press, { series: series([12, 12, 6], 52.5) });
  reportar(10, paso10.series[0]?.pesoGramos === 52500, `sesión guardada a ${paso10.series[0]?.pesoGramos} g`);

  const paso11 = await obtenerRecomendacion(cuentaA, press);
  reportar(
    11,
    paso11.accion === 'mantener' && paso11.pesoSugeridoGramos === 52500,
    `${paso11.accion}, ${paso11.pesoSugeridoGramos} g`,
  );

  const { id: dominadas } = await crearEjercicio(cuentaA, {
    nombre: 'Prueba Dominadas',
    tipo: 'calistenia',
    rangoMin: 8,
    rangoMax: 15,
  });
  await registrarPruebaInicial(cuentaA, dominadas, series([16, 16, 16]));
  const paso12 = await obtenerRecomendacion(cuentaA, dominadas);
  reportar(
    12,
    paso12.accion === 'subir_variante' && paso12.pesoSugeridoGramos === null,
    `${paso12.accion}, peso ${paso12.pesoSugeridoGramos}`,
  );

  const historico = await listarSesiones(cuentaA, press);
  reportar(
    13,
    historico.length === 3 && historico[0]?.id === paso10.id && historico[2]?.esPrueba === true,
    `${historico.length} sesiones, la más reciente primero`,
  );

  await archivarEjercicio(cuentaA, press);
  const activos = await listarEjercicios(cuentaA);
  const todos = await listarEjercicios(cuentaA, { incluirArchivados: true });
  reportar(
    14,
    !activos.some((e) => e.id === press) && todos.some((e) => e.id === press),
    'archivado: fuera de la lista activa, presente con incluirArchivados',
  );

  // Aislamiento entre cuentas
  const listaB = await listarEjercicios(cuentaB, { incluirArchivados: true });
  reportar(15, listaB.length === 0, `la cuenta B ve ${listaB.length} ejercicios de la cuenta A`);

  await esperarError(16, 'EJERCICIO_NO_ENCONTRADO', () => obtenerEjercicio(cuentaB, dominadas));
  await esperarError(17, 'EJERCICIO_NO_ENCONTRADO', () =>
    registrarSesion(cuentaB, dominadas, { series: series([10]) }),
  );
  await esperarError(18, 'EJERCICIO_NO_ENCONTRADO', () => archivarEjercicio(cuentaB, dominadas));
  await esperarError(19, 'EJERCICIO_NO_ENCONTRADO', () =>
    actualizarNivel(cuentaB, dominadas, 'Intruso'),
  );

  const hoy = hoyBogota();
  const resumenB = await obtenerResumen(cuentaB, hoy, hoy);
  const resumenA = await obtenerResumen(cuentaA, hoy, hoy);
  reportar(
    20,
    resumenB.totalSesiones === 0 && resumenA.totalSesiones === 4,
    `resumen: cuenta A ${resumenA.totalSesiones} sesiones, cuenta B ${resumenB.totalSesiones}`,
  );

  const copia = await crearEjercicio(cuentaB, { nombre: 'Prueba Dominadas', tipo: 'calistenia' });
  reportar(21, Boolean(copia.id), 'otra cuenta puede usar el mismo nombre');

  // Nivel en calistenia
  await actualizarNivel(cuentaA, dominadas, '  Dominada con lastre  ');
  const conNivel = await obtenerEjercicio(cuentaA, dominadas);
  reportar(22, conNivel.ejercicio.nivel === 'Dominada con lastre', `nivel ${conNivel.ejercicio.nivel}`);

  await esperarError(23, 'DATOS_INVALIDOS', () => actualizarNivel(cuentaA, press, 'No aplica'));

  // Sesiones y series se eliminan con la cuenta
  await eliminarCuenta(cuentaA);
  const trasBorrar = await listarEjercicios(cuentaA, { incluirArchivados: true });
  reportar(24, trasBorrar.length === 0, 'al eliminar la cuenta se eliminan sus datos');
}

const cuentaA = await crearCuentaTemporal();
const cuentaB = await crearCuentaTemporal();

try {
  await principal(cuentaA, cuentaB);
} catch (error) {
  console.error('FALLA de ejecución:', error);
  fallas += 1;
} finally {
  await eliminarCuenta(cuentaA);
  await eliminarCuenta(cuentaB);
  await cerrarConexiones();
}

console.log(`Total de fallas: ${fallas}`);
process.exitCode = fallas > 0 ? 1 : 0;
