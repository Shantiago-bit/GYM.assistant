import { randomUUID } from 'node:crypto';
import {
  actualizarNivel,
  archivarEjercicio,
  actualizarPerfil,
  cerrarConexiones,
  crearEjercicio,
  crearPerfil,
  crearSolicitud,
  estaSinAutorizar,
  guardarDias,
  guardarModoAvanzado,
  obtenerHistorialDias,
  listarCuentasParaLimpiar,
  obtenerAutorizacionPorHash,
  obtenerSolicitudPendiente,
  responderSolicitud,
  solicitudEnPlazo,
  eliminarCuentaConDatos,
  estaBloqueado,
  guardarRutaAvatar,
  marcarCumpleVisto,
  obtenerHistorialCompleto,
  obtenerPerfil,
  registrarIntentoOfensivo,
  reiniciarIntentos,
  rutaAvatar,
  subirAvatar,
  urlFirmadaAvatar,
  eliminarEjercicio,
  listarEjercicios,
  listarSesiones,
  guardarRecorrido,
  marcarOfertaVista,
  obtenerEjercicio,
  obtenerEjerciciosGuia,
  obtenerEstadoGuia,
  obtenerRecomendacion,
  obtenerResumen,
  registrarPruebaInicial,
  registrarSesion,
  restaurarEjercicio,
  supabaseAdmin,
} from '@/lib/dataService';
import { reenviarConfirmacion, registrarCuenta } from '@/lib/auth/registro';
import { hashDestinatario } from '@/lib/correo';
import { historialDeCorreo } from '@/lib/datos/registroCorreos';
import { consultar } from '@/lib/db/conexion';
import { ErrorDeNegocio, type CodigoError } from '@/lib/reglas/errores';
import { hoyBogota, restarDias } from '@/lib/reglas/fechas';
import { valoresSencillos } from '@/lib/reglas/modo';
import { diaSemana } from '@/lib/reglas/racha';
import { calcularHashToken, generarToken } from '@/lib/tokenRecuperacion';
import {
  calcularRacha,
  esDomingo,
  ejercicioFavorito,
  fechasConSesion,
  recordsPersonales,
  totalesEntrenamiento,
} from '@/lib/reglas/perfil';

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

// Cuentas creadas durante la prueba, para borrarlas al final aunque algo falle.
const temporales: string[] = [];

async function crearCuentaTemporal(confirmada = true): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: `flujo-${randomUUID()}@example.com`,
    password: randomUUID(),
    email_confirm: confirmada,
  });

  if (error) {
    throw error;
  }

  temporales.push(data.user.id);
  return data.user.id;
}

const MENOR = { nombre: 'Prueba Lucía', apodo: 'Lu', fechaNacimiento: `${new Date().getFullYear() - 10}-01-01`, genero: 'mujer' as const };

// Cuenta de menor pendiente con una solicitud cuyo token conoce la prueba (en la base solo queda el hash).
async function crearMenorPendiente(): Promise<{ id: string; hash: string }> {
  const id = await crearCuentaTemporal(false);
  await crearPerfil(id, MENOR, 'pendiente');
  const hash = calcularHashToken(generarToken());
  await crearSolicitud(id, 'tutor-prueba@example.com', hash);
  return { id, hash };
}

// Borra la foto y la cuenta; en el bloque final la cuenta A ya puede no existir.
const eliminarCuenta = (id: string) => eliminarCuentaConDatos(id).catch(() => undefined);

// Imagen WebP mínima (cabecera RIFF/WEBP): basta para probar la subida, la firma y el aislamiento.
const WEBP_PRUEBA = new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBPVP8 '), 1, 2, 3, 4]);

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
    // Desde 50 kg el incremento es de 5 kg (RN-06).
    paso9.accion === 'subir_peso' && paso9.pesoSugeridoGramos === 55000 && paso9.metaRepsSugerida === 8,
    `${paso9.accion}, ${paso9.pesoSugeridoGramos} g, meta ${paso9.metaRepsSugerida}`,
  );

  const paso10 = await registrarSesion(cuentaA, press, { series: series([12, 12, 6], 55) });
  reportar(10, paso10.series[0]?.pesoGramos === 55000, `sesión guardada a ${paso10.series[0]?.pesoGramos} g`);

  const paso11 = await obtenerRecomendacion(cuentaA, press);
  reportar(
    11,
    paso11.accion === 'mantener' && paso11.pesoSugeridoGramos === 55000,
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

  // Guía: cada cuenta tiene su propio estado y nadie lee ni cambia el de otra.
  const guiaNuevaB = await obtenerEstadoGuia(cuentaB);
  reportar(
    24,
    !guiaNuevaB.ofertaVista && Object.keys(guiaNuevaB.recorridos).length === 0,
    'una cuenta nueva no tiene la guía vista ni recorridos',
  );
  await marcarOfertaVista(cuentaA);
  await guardarRecorrido(cuentaA, 'inicio', { estado: 'completado', paso: 9 });
  await guardarRecorrido(cuentaB, 'crear_ejercicio', { estado: 'en_curso', paso: 2 });
  const [guiaA, guiaB] = await Promise.all([obtenerEstadoGuia(cuentaA), obtenerEstadoGuia(cuentaB)]);
  reportar(
    25,
    guiaA.ofertaVista &&
      guiaA.recorridos.inicio?.estado === 'completado' &&
      guiaA.recorridos.crear_ejercicio === undefined &&
      !guiaB.ofertaVista &&
      guiaB.recorridos.inicio === undefined &&
      guiaB.recorridos.crear_ejercicio?.paso === 2,
    'cada cuenta solo lee y cambia su propio estado de la guía',
  );
  const ejerciciosGuiaA = await obtenerEjerciciosGuia(cuentaA);
  reportar(
    26,
    ejerciciosGuiaA.conPrueba === dominadas && ejerciciosGuiaA.sinPrueba === null,
    `ejercicios para repetir la guía: ${JSON.stringify(ejerciciosGuiaA)}`,
  );

  // Restaurar: el press se archivó en el paso 14 y vuelve con todo su histórico.
  await restaurarEjercicio(cuentaA, press);
  await restaurarEjercicio(cuentaA, press); // ya activo: no cambia nada
  const restaurado = await obtenerEjercicio(cuentaA, press);
  reportar(
    27,
    !restaurado.ejercicio.archivado && restaurado.sesiones.length === 3,
    `restaurado con ${restaurado.sesiones.length} sesiones`,
  );

  // La otra cuenta no puede restaurar ni eliminar ejercicios ajenos.
  await esperarError(28, 'EJERCICIO_NO_ENCONTRADO', () => restaurarEjercicio(cuentaB, press));
  await esperarError(29, 'EJERCICIO_NO_ENCONTRADO', () => eliminarEjercicio(cuentaB, press));

  // Crear con el nombre de un archivado ofrece restaurarlo.
  await archivarEjercicio(cuentaA, dominadas);
  await esperarError(30, 'EJERCICIO_ARCHIVADO', () =>
    crearEjercicio(cuentaA, { nombre: '  prueba DOMINADAS ', tipo: 'calistenia' }),
  );

  // Eliminar para siempre: el ejercicio, sus sesiones y sus series dejan de existir.
  const idsSesiones = [prueba.id, paso8.id, paso10.id];
  const borrado = await eliminarEjercicio(cuentaA, press);
  const [restantes] = await consultar<{ ejercicios: number; sesiones: number; series: number }>(
    `SELECT (SELECT COUNT(*) FROM ejercicios WHERE id = $1)::int AS ejercicios,
            (SELECT COUNT(*) FROM sesiones WHERE ejercicio_id = $1)::int AS sesiones,
            (SELECT COUNT(*) FROM series WHERE sesion_id = ANY($2::uuid[]))::int AS series`,
    [press, idsSesiones],
  );
  reportar(
    31,
    borrado.sesiones === 3 && borrado.series === 9 &&
      restantes?.ejercicios === 0 && restantes.sesiones === 0 && restantes.series === 0,
    `eliminado: ${JSON.stringify(borrado)}, quedan ${JSON.stringify(restantes)}`,
  );
  await esperarError(32, 'EJERCICIO_NO_ENCONTRADO', () => obtenerEjercicio(cuentaA, press));

  // Perfil: cada cuenta lee y cambia solo el suyo.
  await crearPerfil(cuentaA, { nombre: 'Prueba Ana', apodo: 'Anita', fechaNacimiento: '1998-04-02', genero: 'mujer' });
  await crearPerfil(cuentaB, { nombre: 'Prueba Beto', fechaNacimiento: '1990-01-01', genero: 'hombre' });
  await actualizarPerfil(cuentaB, { nombre: 'Prueba Beto B', genero: 'otro' });
  const [perfilA, perfilB] = await Promise.all([obtenerPerfil(cuentaA), obtenerPerfil(cuentaB)]);
  reportar(
    33,
    perfilA?.nombre === 'Prueba Ana' && perfilA.apodo === 'Anita' && perfilA.fechaNacimiento === '1998-04-02' &&
      perfilA.autorizacion === 'no_requerida' && perfilB?.nombre === 'Prueba Beto B' && perfilB.apodo === null,
    'cada cuenta lee y edita solo su perfil',
  );

  // Estadísticas: solo con las sesiones de la cuenta (A tiene la prueba de dominadas, archivada; B nada).
  const [historialA, historialB] = await Promise.all([obtenerHistorialCompleto(cuentaA), obtenerHistorialCompleto(cuentaB)]);
  const totalesA = totalesEntrenamiento(historialA);
  const recordsA = recordsPersonales(historialA, hoy);
  const maxDominadas = recordsA[0]?.tipo === 'calistenia' ? recordsA[0].maxReps : null;
  reportar(
    34,
    totalesA.sesiones === 1 && totalesA.series === 3 && maxDominadas?.valor === 16 && maxDominadas.nuevo &&
      ejercicioFavorito(historialA)?.ejercicioId === dominadas,
    `A: ${JSON.stringify(totalesA)}, récord ${maxDominadas?.valor}`,
  );
  const rachaA = calcularRacha(fechasConSesion(historialA), hoy);
  reportar(
    35,
    totalesEntrenamiento(historialB).sesiones === 0 && recordsPersonales(historialB, hoy).length === 0 &&
      rachaA.actual === (esDomingo(hoy) ? 0 : 1),
    `B sin estadísticas de A; racha de A ${rachaA.actual}`,
  );

  // Foto: carpeta de la cuenta en un bucket privado, leída solo con URL firmada.
  const ruta = await subirAvatar(cuentaA, WEBP_PRUEBA, 'image/webp');
  await guardarRutaAvatar(cuentaA, ruta);
  const firmada = await urlFirmadaAvatar(ruta);
  const descarga = firmada ? await fetch(firmada) : null;
  const bytes = descarga?.ok ? new Uint8Array(await descarga.arrayBuffer()) : new Uint8Array();
  reportar(
    36,
    ruta === rutaAvatar(cuentaA) && ruta.startsWith(`${cuentaA}/`) && bytes.length === WEBP_PRUEBA.length,
    `foto en ${ruta.replace(cuentaA, '<cuenta A>')}, URL firmada ${descarga?.status ?? 'sin URL'}`,
  );
  const publica = await fetch(
    `${process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL}/storage/v1/object/public/avatares/${ruta}`,
  );
  const perfilBConFoto = await obtenerPerfil(cuentaB);
  reportar(
    37,
    !publica.ok && perfilBConFoto?.avatarRuta === null,
    `sin firma la foto no se lee (${publica.status}); B no ve la foto de A`,
  );

  // Cumpleaños: cerrar la felicitación la guarda para el año en curso.
  const anio = Number(hoy.slice(0, 4));
  await marcarCumpleVisto(cuentaA, anio);
  reportar(38, (await obtenerPerfil(cuentaA))?.cumpleVistoAnio === anio, `cumpleaños visto en ${anio}`);

  // Intentos de registro con nombres ofensivos: al quinto se bloquea la conexión; el éxito lo reinicia.
  const clave = `prueba-${randomUUID()}`;
  let intentos = 0;
  for (let i = 0; i < 5; i++) intentos = await registrarIntentoOfensivo(clave);
  const bloqueado = await estaBloqueado(clave);
  await reiniciarIntentos(clave);
  reportar(39, intentos === 5 && bloqueado && !(await estaBloqueado(clave)), `${intentos} intentos, bloqueo ${bloqueado}`);

  // Al eliminar la cuenta se borran sus datos, su estado de la guía, su perfil y su foto.
  await eliminarCuentaConDatos(cuentaA);
  const trasBorrar = await listarEjercicios(cuentaA, { incluirArchivados: true });
  const guiaTrasBorrar = await obtenerEstadoGuia(cuentaA);
  const perfilTrasBorrar = await obtenerPerfil(cuentaA);
  const { data: archivos } = await supabaseAdmin.storage.from('avatares').list(cuentaA);
  reportar(
    40,
    trasBorrar.length === 0 && !guiaTrasBorrar.ofertaVista && Object.keys(guiaTrasBorrar.recorridos).length === 0 &&
      perfilTrasBorrar === null && (archivos ?? []).length === 0,
    'al eliminar la cuenta se eliminan sus datos, la guía, el perfil y la foto',
  );

  // ---- Autorización de tutores (menores de 12).
  const menor = await crearMenorPendiente();
  const solicitud = await obtenerSolicitudPendiente(menor.id);
  reportar(
    41,
    solicitud?.correoTutor === 'tutor-prueba@example.com' && solicitud.reenviosHoy === 0 &&
      (await estaSinAutorizar(menor.id)) && !(await estaSinAutorizar(cuentaB)) && (await solicitudEnPlazo(menor.id)),
    'cuenta de menor pendiente: sin acceso a /api/gym hasta que el tutor responda',
  );

  // Reenviar crea un enlace nuevo y deja sin efecto el anterior.
  const hashNuevo = calcularHashToken(generarToken());
  await crearSolicitud(menor.id, 'tutor-prueba@example.com', hashNuevo);
  const anterior = await obtenerAutorizacionPorHash(menor.hash);
  const trasReenvio = await obtenerSolicitudPendiente(menor.id);
  reportar(
    42,
    anterior?.vencida === true && trasReenvio?.reenviosHoy === 1,
    `reenvío: el enlace anterior queda vencido; reenvíos de hoy ${trasReenvio?.reenviosHoy}`,
  );
  const conAnterior = await responderSolicitud(menor.hash, 'aprobada');
  reportar(43, conAnterior.estado === 'vencido', `el enlace reemplazado responde "${conAnterior.estado}"`);

  const aprobada = await responderSolicitud(hashNuevo, 'aprobada');
  const perfilAprobado = await obtenerPerfil(menor.id);
  reportar(
    44,
    aprobada.estado === 'aprobada' && perfilAprobado?.autorizacion === 'aprobada' && !(await estaSinAutorizar(menor.id)),
    'aprobar habilita la cuenta',
  );
  const reusado = await responderSolicitud(hashNuevo, 'rechazada');
  const desconocido = await responderSolicitud(calcularHashToken(generarToken()), 'aprobada');
  reportar(
    45,
    reusado.estado === 'usado' && desconocido.estado === 'invalido' && (await obtenerPerfil(menor.id))?.autorizacion === 'aprobada',
    `el mismo enlace otra vez: "${reusado.estado}"; uno desconocido: "${desconocido.estado}"`,
  );

  // Rechazar: la cuenta queda para borrar y se borra con su perfil y sus solicitudes.
  const rechazado = await crearMenorPendiente();
  const respuestaRechazo = await responderSolicitud(rechazado.hash, 'rechazada');
  const paraLimpiar = await listarCuentasParaLimpiar();
  await eliminarCuentaConDatos(rechazado.id);
  const [restoRechazo] = await consultar<{ perfiles: number; solicitudes: number }>(
    `SELECT (SELECT COUNT(*) FROM perfiles WHERE usuario_id = $1)::int AS perfiles,
            (SELECT COUNT(*) FROM autorizaciones_tutor WHERE usuario_id = $1)::int AS solicitudes`,
    [rechazado.id],
  );
  reportar(
    46,
    respuestaRechazo.estado === 'rechazada' && paraLimpiar.includes(rechazado.id) && !paraLimpiar.includes(menor.id) &&
      restoRechazo?.perfiles === 0 && restoRechazo.solicitudes === 0,
    'rechazar borra la cuenta, su perfil y sus solicitudes',
  );

  // Sin respuesta en 7 días: fuera de plazo y en la lista de la limpieza programada.
  const vencido = await crearMenorPendiente();
  await consultar(`UPDATE perfiles SET creado_en = now() - interval '8 days' WHERE usuario_id = $1`, [vencido.id]);
  await consultar(`UPDATE autorizaciones_tutor SET vence_en = now() - interval '1 day' WHERE usuario_id = $1`, [vencido.id]);
  const respuestaTarde = await responderSolicitud(vencido.hash, 'aprobada');
  reportar(
    47,
    respuestaTarde.estado === 'vencido' && !(await solicitudEnPlazo(vencido.id)) &&
      (await listarCuentasParaLimpiar()).includes(vencido.id),
    'a los 7 días sin respuesta el enlace vence y la cuenta queda para la limpieza',
  );

  // ---- Registro de envíos de correo (registro_correos): sin el contenido ni el correo completo.
  const correoNuevo = `flujo-${randomUUID()}@example.com`;
  const ADULTO = { nombre: 'Prueba Correo', fechaNacimiento: '1995-05-05', genero: 'otro' as const };
  let resultadoRegistro = 'enviado';
  try {
    await registrarCuenta(correoNuevo, randomUUID(), ADULTO);
  } catch {
    resultadoRegistro = 'sin envío'; // sin Gmail en local, el envío falla y la cuenta nueva se borra
  }
  const { data: filaNueva } = await supabaseAdmin.from('users').select('id').eq('email', correoNuevo).maybeSingle<{ id: string }>();
  if (filaNueva) temporales.push(filaNueva.id);
  const [envio] = await historialDeCorreo(hashDestinatario(correoNuevo), 5);
  reportar(
    48,
    envio?.tipo === 'confirmacion' && (envio.resultado === 'aceptado' || envio.resultado === 'error') &&
      envio.proveedor !== null && envio.duracionMs !== null && envio.mascara.startsWith('f•••••'),
    `registro de un adulto (${resultadoRegistro}): fila ${envio?.tipo}/${envio?.resultado} por ${envio?.proveedor}`,
  );

  // Reintentar en menos de 60 s: no se envía y queda el "omitido" con su motivo.
  const correoPendiente = `flujo-${randomUUID()}@example.com`;
  const { data: pendiente, error: errorPendiente } = await supabaseAdmin.auth.admin.createUser({
    email: correoPendiente,
    password: randomUUID(),
    email_confirm: false,
  });
  if (errorPendiente) throw errorPendiente;
  temporales.push(pendiente.user.id);
  await crearPerfil(pendiente.user.id, ADULTO);
  const reintento = await reenviarConfirmacion(correoPendiente);
  const [omitido] = await historialDeCorreo(hashDestinatario(correoPendiente), 5);
  reportar(
    49,
    reintento === 'reciente' && omitido?.resultado === 'omitido' && omitido.motivo === 'reenvio_reciente' &&
      omitido.tipo === 'reenvio_confirmacion' && omitido.proveedor === null,
    `reintento en menos de 60 s: ${omitido?.resultado} (${omitido?.motivo})`,
  );

  // Una cuenta ya confirmada tampoco recibe nada: "omitido" por cuenta_confirmada.
  const correoConfirmado = `flujo-${randomUUID()}@example.com`;
  const { data: confirmada, error: errorConfirmada } = await supabaseAdmin.auth.admin.createUser({
    email: correoConfirmado,
    password: randomUUID(),
    email_confirm: true,
  });
  if (errorConfirmada) throw errorConfirmada;
  temporales.push(confirmada.user.id);
  await reenviarConfirmacion(correoConfirmado);
  const [yaConfirmada] = await historialDeCorreo(hashDestinatario(correoConfirmado), 5);
  const [crudo] = await consultar<{ texto: string }>(
    `SELECT row_to_json(r)::text AS texto FROM registro_correos r WHERE destinatario_hash = $1 LIMIT 1`,
    [hashDestinatario(correoConfirmado)],
  );
  reportar(
    50,
    yaConfirmada?.motivo === 'cuenta_confirmada' && Boolean(crudo) && !crudo!.texto.includes(correoConfirmado),
    'cuenta confirmada: "omitido" por cuenta_confirmada, y la fila no guarda el correo completo',
  );

  // ---- Días de entrenamiento y racha. Cuenta D con L-X-V elegidos hace un mes.
  const cuentaD = await crearCuentaTemporal();
  await crearPerfil(cuentaD, { ...ADULTO, dias: [5, 1, 3, 3] });
  const historialInicial = await obtenerHistorialDias(cuentaD);
  reportar(
    51,
    historialInicial.length === 1 && historialInicial[0]!.dias.join() === '1,3,5' && historialInicial[0]!.vigenteDesde === hoy,
    `el registro guarda los días ordenados y sin repetir: ${historialInicial[0]?.dias.join('-')} desde ${historialInicial[0]?.vigenteDesde}`,
  );
  await consultar(`UPDATE dias_entrenamiento SET vigente_desde = vigente_desde - 30 WHERE usuario_id = $1`, [cuentaD]);

  // Sesiones en los 3 últimos días planificados antes de hoy y una hoy (la prueba inicial): si hoy es de
  // descanso cuenta como día extra; si es planificado, cuenta normal. En ambos casos, racha 4.
  const planificados: string[] = [];
  for (let atras = 1; planificados.length < 3; atras++) {
    const fecha = restarDias(hoy, atras);
    if ([1, 3, 5].includes(diaSemana(fecha))) planificados.unshift(fecha);
  }
  const { id: ejercicioD } = await crearEjercicio(cuentaD, { nombre: 'Prueba Remo', tipo: 'peso', pesoRefKg: 40 });
  await registrarPruebaInicial(cuentaD, ejercicioD, series([10, 10], 40));
  for (const fecha of planificados) {
    await consultar('INSERT INTO sesiones (ejercicio_id, fecha, es_prueba) VALUES ($1, $2, false)', [ejercicioD, fecha]);
  }
  const fechasD = fechasConSesion(await obtenerHistorialCompleto(cuentaD));
  const rachaD = calcularRacha(fechasD, hoy, await obtenerHistorialDias(cuentaD));
  reportar(52, rachaD.actual === 4 && rachaD.mejor === 4, `racha con L-X-V y un día extra: actual ${rachaD.actual}, mejor ${rachaD.mejor}`);

  // Cambiar los días (dos veces hoy: una sola fila nueva) no cambia la racha ni la mejor racha anteriores.
  await guardarDias(cuentaD, [2, 4]);
  await guardarDias(cuentaD, [7, 1, 2, 3, 4, 5, 6]);
  const historialD = await obtenerHistorialDias(cuentaD);
  const rachaTrasCambio = calcularRacha(fechasD, hoy, historialD);
  reportar(
    53,
    historialD.length === 2 && historialD[1]!.vigenteDesde === hoy && historialD[1]!.dias.length === 7 &&
      historialD[0]!.dias.join() === '1,3,5' && rachaTrasCambio.mejor === rachaD.mejor && rachaTrasCambio.actual === rachaD.actual,
    `cambio de días: ${historialD.length} tramos; racha ${rachaTrasCambio.actual}, mejor ${rachaTrasCambio.mejor}`,
  );

  // Aislamiento: otra cuenta no ve ni cambia los días de D.
  await guardarDias(cuentaB, [6]);
  const [diasB, historialDTras] = await Promise.all([obtenerHistorialDias(cuentaB), obtenerHistorialDias(cuentaD)]);
  reportar(
    54,
    diasB.every((tramo) => tramo.dias.join() !== '1,3,5') && historialDTras.length === 2 && historialDTras[1]!.dias.length === 7,
    'cada cuenta lee y cambia solo sus días de entrenamiento',
  );

  // ---- Modo sencillo. Una cuenta nueva empieza en el sencillo, crea un ejercicio solo con nombre y tipo, hace la
  // primera medición y registra una sesión sin tocar opciones avanzadas (solo repeticiones y peso).
  const cuentaE = await crearCuentaTemporal();
  await crearPerfil(cuentaE, ADULTO);
  reportar(55, (await obtenerPerfil(cuentaE))?.modoAvanzado === false, 'una cuenta nueva empieza en el modo sencillo');

  const { id: sencillo } = await crearEjercicio(cuentaE, { nombre: 'Prueba Sencillo', tipo: 'peso', ...valoresSencillos('peso') });
  const { id: avanzado } = await crearEjercicio(cuentaE, {
    nombre: 'Prueba Avanzado',
    tipo: 'peso',
    enfoque: 'hipertrofia',
    metodo: 'rectas',
    rangoMin: 8,
    rangoMax: 12,
    pesoRefKg: 40,
  });
  for (const id of [sencillo, avanzado]) {
    await registrarPruebaInicial(cuentaE, id, series([10, 9, 9], 40));
  }
  const trasPrueba = await obtenerEjercicio(cuentaE, sencillo);
  reportar(
    56,
    trasPrueba.ejercicio.pesoRefGramos === 40000 && trasPrueba.ejercicio.metodo === 'rectas' && trasPrueba.ejercicio.enfoque === 'hipertrofia' &&
      trasPrueba.ejercicio.rango.join() === '8,12',
    `sencillo: la primera medición fija el punto de partida (${trasPrueba.ejercicio.pesoRefGramos} g, ${trasPrueba.ejercicio.rango.join('-')})`,
  );

  for (const id of [sencillo, avanzado]) {
    await registrarSesion(cuentaE, id, { series: series([12, 12, 12], 40) });
  }
  const [recSencillo, recAvanzado] = await Promise.all([
    obtenerRecomendacion(cuentaE, sencillo),
    obtenerRecomendacion(cuentaE, avanzado),
  ]);
  reportar(
    57,
    JSON.stringify(recSencillo) === JSON.stringify(recAvanzado) && recSencillo.accion === 'subir_peso' && recSencillo.pesoSugeridoGramos === 42500,
    `misma recomendación que con los valores avanzados equivalentes: ${recSencillo.accion}, ${recSencillo.pesoSugeridoGramos} g, meta ${recSencillo.metaRepsSugerida}`,
  );

  await guardarModoAvanzado(cuentaE, true);
  const conAvanzado = (await obtenerPerfil(cuentaE))?.modoAvanzado;
  const ejerciciosTras = await listarEjercicios(cuentaE);
  reportar(
    58,
    conAvanzado === true && ejerciciosTras.length === 2 && ejerciciosTras.every((ejercicio) => ejercicio.metodo === 'rectas'),
    'activar el modo avanzado solo cambia la preferencia: los ejercicios quedan igual',
  );
}

const cuentaA = await crearCuentaTemporal();
const cuentaB = await crearCuentaTemporal();

try {
  await principal(cuentaA, cuentaB);
} catch (error) {
  console.error('FALLA de ejecución:', error);
  fallas += 1;
} finally {
  for (const cuenta of temporales) {
    await eliminarCuenta(cuenta);
  }
  await cerrarConexiones();
}

console.log(`Total de fallas: ${fallas}`);
process.exitCode = fallas > 0 ? 1 : 0;
