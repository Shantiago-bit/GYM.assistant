import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agruparCorreos, completarDias } from '@/lib/reglas/correosAdmin';
import { hoyBogota } from '@/lib/reglas/fechas';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

const mocks = vi.hoisted(() => ({
  admin: { id: '00000000-0000-4000-8000-0000000000aa', email: 'admin@example.com', aal: 'aal2', rol: 'admin' as 'admin' | 'lectura' },
  listarPersonas: vi.fn(),
  obtenerDetallePersona: vi.fn(),
  registrarAuditoria: vi.fn(),
  listarAuditoria: vi.fn(),
  administradoresDeAuditoria: vi.fn(),
  obtenerMetaDetallada: vi.fn(),
  obtenerEstadisticasResumen: vi.fn(),
  historialMeta: vi.fn(),
  estadisticasCorreos: vi.fn(),
  listarCorreos: vi.fn(),
  obtenerContadoresMenu: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/auth/admin', () => ({
  exigirAdminDePagina: async () => mocks.admin,
  puedeActuar: (admin: { rol: string }) => admin.rol === 'admin',
}));
vi.mock('@/lib/dataService', () => ({
  listarPersonas: mocks.listarPersonas,
  obtenerDetallePersona: mocks.obtenerDetallePersona,
  registrarAuditoria: mocks.registrarAuditoria,
  listarAuditoria: mocks.listarAuditoria,
  administradoresDeAuditoria: mocks.administradoresDeAuditoria,
  obtenerMetaDetallada: mocks.obtenerMetaDetallada,
  obtenerEstadisticasResumen: mocks.obtenerEstadisticasResumen,
  historialMeta: mocks.historialMeta,
  estadisticasCorreos: mocks.estadisticasCorreos,
  listarCorreos: mocks.listarCorreos,
  obtenerContadoresMenu: mocks.obtenerContadoresMenu,
}));

import AuditoriaAdminPage from './auditoria/page';
import CorreosAdminPage from './correos/page';
import MetasAdminPage from './metas/page';
import DetallePersonaPage from './personas/[id]/page';
import PersonasAdminPage from './personas/page';

const PERSONA = '00000000-0000-4000-8000-0000000000bb';

const DETALLE = {
  id: PERSONA,
  correo: 'menor@example.com',
  apodo: 'Pecas',
  nombre: 'Persona de prueba',
  fechaNacimiento: '2011-03-10',
  genero: 'otro',
  registro: '2026-11-01 14:00:00+00',
  confirmada: null,
  estado: 'menor_pendiente',
  esAdmin: false,
  modoAvanzado: false,
  nivelAnimacion: 'suaves',
  autorizacion: 'pendiente',
  solicitudTutor: { creada: '2026-11-01 14:00:00+00', vence: '2026-11-08 14:00:00+00', respondida: null, decision: null },
  dias: [1, 3, 5],
  fechasSesiones: ['2026-11-17', '2026-11-19', '2026-11-23'],
  racha: { actual: 2, mejor: 3 },
  records: 1,
  ejerciciosActivos: 3,
  ejerciciosArchivados: 1,
  correos: [{ tipo: 'autorizacion_tutor', resultado: 'enviado', fecha: '2026-11-01 14:00:01+00' }],
  auditoria: [{ accion: 'ver_usuario', fecha: '2026-11-20 15:00:00+00', admin: 'Santi', detalle: { origen: 'panel' } }],
};

async function sinProblemas(contenedor: HTMLElement) {
  expect(revisarBasico(contenedor)).toEqual([]);
  expect(await revisarConAxe(contenedor)).toEqual([]);
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin.rol = 'admin';
  mocks.listarPersonas.mockResolvedValue({
    total: 26,
    filas: [
      {
        id: PERSONA,
        correoMascara: 'm•••r@example.com',
        apodo: 'Pecas',
        registro: '2026-11-01',
        estado: 'menor_pendiente',
        ultimaActividad: '2026-11-23',
        ejercicios: 3,
        sesiones: 3,
        racha: 2,
        modoAvanzado: false,
        esAdmin: false,
      },
    ],
  });
  mocks.obtenerDetallePersona.mockResolvedValue(DETALLE);
  mocks.listarAuditoria.mockResolvedValue({
    total: 1,
    filas: [{ id: '1', fecha: '2026-11-20 15:00:00+00', admin: 'Santi', accion: 'suspender', objetivoId: PERSONA, objetivoMascara: 'm•••r@example.com', detalle: {} }],
  });
  mocks.administradoresDeAuditoria.mockResolvedValue([{ id: mocks.admin.id, nombre: 'Santi' }]);
  mocks.obtenerMetaDetallada.mockResolvedValue({ valor: 80, guardada: true, actualizadoEn: '2026-11-20 15:00:00+00', actualizadoPor: 'Santi' });
  mocks.obtenerEstadisticasResumen.mockResolvedValue({
    meses: [{ mes: hoyBogota().slice(0, 7), registros: 4, activas: 20, sesiones: 50, series: 150, mensajes: 9 }],
    totalCuentas: 40,
    activasHoy: 3,
    activasPeriodo: { 3: 25, 6: 30, 12: 35 },
    pendientes: { correosConError24h: 0, tutoresPorVencer48h: 0, sinConfirmarMas48h: 0 },
  });
  mocks.historialMeta.mockResolvedValue([
    { fecha: '2026-11-20 15:00:00+00', admin: 'Santi', anterior: 50, nuevo: 80 },
    { fecha: '2026-11-01 13:00:00+00', admin: null, anterior: 40, nuevo: 50 },
  ]);
});

describe('/admin/personas', () => {
  it('tabla con correos enmascarados, orden accesible, paginación y CSV con los filtros', async () => {
    const { container } = render(await PersonasAdminPage({ searchParams: Promise.resolve({ estado: 'menor_pendiente', orden: 'sesiones' }) }));
    await sinProblemas(container);
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByRole('link', { name: 'm•••r@example.com' })).toHaveAttribute('href', `/admin/personas/${PERSONA}`);
    expect(tabla).not.toHaveTextContent('menor@example.com');
    expect(within(tabla).getByRole('columnheader', { name: /Sesiones/ })).toHaveAttribute('aria-sort', 'descending');
    expect(within(tabla).getByRole('link', { name: /Sesiones/ })).toHaveAttribute('href', '/admin/personas?estado=menor_pendiente&orden=sesiones&dir=asc');
    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute('href', '/admin/personas?estado=menor_pendiente&orden=sesiones&pagina=2');
    expect(screen.getByRole('link', { name: /Exportar CSV/ })).toHaveAttribute('href', '/api/admin/personas/csv?estado=menor_pendiente&orden=sesiones');
  });
});

describe('/admin/personas/[id]', () => {
  it('detalle con aviso de menor, edad (no la fecha), acciones y registro en la auditoría', async () => {
    const { container } = render(await DetallePersonaPage({ params: Promise.resolve({ id: PERSONA }) }));
    await sinProblemas(container);
    expect(screen.getByRole('note')).toHaveTextContent('Cuenta de menor de edad: accede solo si es necesario para soporte.');
    expect(container).toHaveTextContent('menor@example.com');
    expect(container).not.toHaveTextContent('2011');
    expect(screen.getByText('Edad').nextElementSibling).toHaveTextContent(/^\d+ años$/);
    expect(screen.getByRole('button', { name: 'Reenviar al tutor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar cuenta' })).toBeInTheDocument();
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith({ adminId: mocks.admin.id, accion: 'ver_usuario', objetivoUsuarioId: PERSONA, detalle: { origen: 'panel' } });
  });

  it('con el rol de solo lectura no hay acciones', async () => {
    mocks.admin.rol = 'lectura';
    render(await DetallePersonaPage({ params: Promise.resolve({ id: PERSONA }) }));
    expect(screen.queryByRole('button', { name: 'Suspender' })).not.toBeInTheDocument();
    expect(screen.getByText(/solo lectura/)).toBeInTheDocument();
  });

  it('sobre otra cuenta de administración tampoco', async () => {
    mocks.obtenerDetallePersona.mockResolvedValue({ ...DETALLE, esAdmin: true, estado: 'confirmada', fechaNacimiento: '1990-01-01' });
    render(await DetallePersonaPage({ params: Promise.resolve({ id: PERSONA }) }));
    expect(screen.queryByRole('button', { name: 'Suspender' })).not.toBeInTheDocument();
    expect(screen.getByText(/solo se gestionan con los scripts/)).toBeInTheDocument();
  });

  it('id inválido o inexistente: 404 y sin auditoría', async () => {
    await expect(DetallePersonaPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    mocks.obtenerDetallePersona.mockResolvedValue(null);
    await expect(DetallePersonaPage({ params: Promise.resolve({ id: PERSONA }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });
});

describe('/admin/auditoria', () => {
  it('solo lectura: tabla con la acción en palabras y la cuenta enmascarada, sin botones de editar ni borrar', async () => {
    const { container } = render(await AuditoriaAdminPage({ searchParams: Promise.resolve({}) }));
    await sinProblemas(container);
    const tabla = screen.getByRole('table');
    expect(tabla).toHaveTextContent('Suspendió una cuenta');
    expect(within(tabla).getByRole('link', { name: 'm•••r@example.com' })).toHaveAttribute('href', `/admin/personas/${PERSONA}`);
    expect(screen.queryByRole('button', { name: /editar|borrar|eliminar/i })).not.toBeInTheDocument();
  });
});

describe('/admin/metas', () => {
  it('meta vigente con quién y cuándo, medidor del mes, formulario e historial de cambios', async () => {
    const { container } = render(await MetasAdminPage());
    await sinProblemas(container);
    expect(screen.getByRole('heading', { level: 1, name: 'Metas' })).toBeInTheDocument();
    expect(container).toHaveTextContent('80 personas activas por mes');
    expect(container).toHaveTextContent(/Última actualización: .+ \(hora de Bogotá\) por Santi/);
    // El medidor usa la meta guardada y las personas activas del mes actual.
    expect(screen.getByRole('figure', { name: /20 de 80/ })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /Nueva meta/ })).toHaveValue(80);
    expect(screen.getByRole('button', { name: 'Guardar meta' })).toBeInTheDocument();

    const tabla = screen.getByRole('table', { name: /Cambios de la meta/ });
    const filas = within(tabla).getAllByRole('row');
    expect(filas).toHaveLength(3);
    expect(filas[1]).toHaveTextContent(/Santi\s*50\s*80/);
    expect(filas[2]).toHaveTextContent('—');
  });

  it('con el rol de solo lectura se ve la meta pero no el formulario', async () => {
    mocks.admin.rol = 'lectura';
    render(await MetasAdminPage());
    expect(screen.queryByRole('button', { name: 'Guardar meta' })).not.toBeInTheDocument();
    expect(screen.getByText(/solo lectura/)).toBeInTheDocument();
  });

  it('sin meta guardada ni historial: lo dice en palabras', async () => {
    mocks.obtenerMetaDetallada.mockResolvedValue({ valor: 50, guardada: false, actualizadoEn: null, actualizadoPor: null });
    mocks.historialMeta.mockResolvedValue([]);
    const { container } = render(await MetasAdminPage());
    await sinProblemas(container);
    expect(container).toHaveTextContent('Es la meta por defecto: nadie la ha cambiado todavía.');
    expect(container).toHaveTextContent('La meta no se ha cambiado desde el panel.');
    expect(screen.queryByRole('table', { name: /Cambios de la meta/ })).not.toBeInTheDocument();
  });
});

describe('/admin/correos', () => {
  const ESTADISTICAS = {
    periodo: 30,
    resumen: agruparCorreos([
      { tipo: 'confirmacion', resultado: 'aceptado', motivo: null, total: 9 },
      { tipo: 'confirmacion', resultado: 'error', motivo: null, total: 3 },
      { tipo: 'reenvio_confirmacion', resultado: 'omitido', motivo: 'reenvio_reciente', total: 2 },
    ]),
    dias: completarDias([{ dia: '2026-11-27', aceptados: 9, fallidos: 3, omitidos: 2 }], '2026-11-28', 30),
    duracionPorProveedor: [{ proveedor: 'gmail', envios: 12, mediaMs: 840 }],
  };
  const FILAS_CORREOS = [
    {
      id: 'c1',
      fecha: '2026-11-27 15:00:00+00',
      tipo: 'confirmacion',
      destinatarioMascara: 'm•••r@example.com',
      usuarioId: PERSONA,
      resultado: 'error',
      motivo: null,
      proveedor: 'gmail',
      error: 'Timeout al conectar con el servidor',
      duracionMs: 1200,
    },
    {
      id: 'c2',
      fecha: '2026-11-27 14:00:00+00',
      tipo: 'reenvio_confirmacion',
      destinatarioMascara: 'b•••s@example.com',
      usuarioId: null,
      resultado: 'omitido',
      motivo: 'reenvio_reciente',
      proveedor: null,
      error: null,
      duracionMs: null,
    },
  ];

  beforeEach(() => {
    mocks.estadisticasCorreos.mockResolvedValue(ESTADISTICAS);
    mocks.listarCorreos.mockResolvedValue({ total: 30, filas: FILAS_CORREOS });
    mocks.obtenerContadoresMenu.mockResolvedValue({ personasPendientes: 0, correosConError24h: 3, activasMes: 5, totalCuentas: 9 });
  });

  it('tarjetas, gráfico con tabla alternativa, tabla enmascarada con enlace a la persona y paginación con los filtros', async () => {
    const { container } = render(await CorreosAdminPage({ searchParams: Promise.resolve({ periodo: '30', resultado: 'error' }) }));
    await sinProblemas(container);
    expect(mocks.estadisticasCorreos).toHaveBeenCalledWith(hoyBogota(), 30);
    expect(mocks.listarCorreos).toHaveBeenCalledWith(expect.objectContaining({ periodo: 30, resultado: 'error', pagina: 1 }));

    const tarjeta = (titulo: string) => screen.getByRole('heading', { level: 3, name: titulo }).closest('article')!;
    expect(tarjeta('Enviados')).toHaveTextContent('12');
    expect(tarjeta('Tasa de entrega')).toHaveTextContent('75 %');
    expect(tarjeta('Errores en 24 h')).toHaveTextContent('3');
    expect(tarjeta('No se enviaron')).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: 'Últimos 30 días' })).toHaveAttribute('aria-current', 'page');

    const figura = screen.getByRole('figure', { name: /Correos enviados por día/ });
    expect(within(figura).getByRole('img', { name: /Correos enviados por día/ })).toBeInTheDocument();
    expect(within(figura).getAllByRole('row', { hidden: true })).toHaveLength(31);
    expect(screen.getByRole('table', { name: 'Correos por día y resultado', hidden: true })).toHaveTextContent('Rechazados o con error');

    const tabla = screen.getByRole('table', { name: /Correos, del más reciente/ });
    expect(within(tabla).getByRole('link', { name: 'm•••r@example.com' })).toHaveAttribute('href', `/admin/personas/${PERSONA}`);
    // Sin cuenta asociada: la máscara sin enlace.
    expect(within(tabla).queryByRole('link', { name: 'b•••s@example.com' })).not.toBeInTheDocument();
    expect(tabla).toHaveTextContent('b•••s@example.com');
    expect(tabla).toHaveTextContent('Confirmación de cuenta');
    expect(tabla).toHaveTextContent('Timeout al conectar con el servidor');
    expect(tabla).toHaveTextContent('Se envió uno hace menos de un minuto');
    expect(tabla).not.toHaveTextContent('menor@example.com');

    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute('href', '/admin/correos?periodo=30&resultado=error&pagina=2');
    expect(screen.getByRole('link', { name: 'Quitar filtros' })).toHaveAttribute('href', '/admin/correos?periodo=30');
    expect(screen.getByRole('combobox', { name: 'Resultado' })).toHaveValue('error');
  });

  it('con rol admin está el botón del correo de prueba; con lectura, no', async () => {
    render(await CorreosAdminPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole('button', { name: 'Enviar correo de prueba' })).toBeInTheDocument();
    cleanup();
    mocks.admin.rol = 'lectura';
    render(await CorreosAdminPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole('button', { name: 'Enviar correo de prueba' })).not.toBeInTheDocument();
  });

  it('sin correos: lo dice en palabras y la tasa es "Sin envíos"', async () => {
    mocks.estadisticasCorreos.mockResolvedValue({ ...ESTADISTICAS, resumen: agruparCorreos([]), duracionPorProveedor: [] });
    mocks.listarCorreos.mockResolvedValue({ total: 0, filas: [] });
    const { container } = render(await CorreosAdminPage({ searchParams: Promise.resolve({}) }));
    await sinProblemas(container);
    expect(container).toHaveTextContent('Sin envíos');
    expect(container).toHaveTextContent('No hay correos con estos filtros.');
    expect(container).toHaveTextContent('No hay correos en este periodo.');
    expect(screen.queryByRole('link', { name: 'Siguiente' })).not.toBeInTheDocument();
  });
});
