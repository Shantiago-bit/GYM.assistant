import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import type { EjercicioListado } from '@/lib/dataService';
import type { DatosInicio } from '@/lib/datos/inicio';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/gym',
}));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: vi.fn() }));
vi.mock('@/components/guia/ProveedorGuia', () => ({
  useGuia: () => ({ iniciar: vi.fn(), marcarOfertaVista: vi.fn() }),
}));
vi.mock('@/lib/auth/sesion', () => ({
  exigirSesionDePagina: async () => ({ id: 'u1', email: 'persona@example.com' }),
}));

// Datos inventados. Jueves 19 de noviembre de 2026, 10:00 en Bogotá.
const HOY = '2026-11-19';
const ejercicio = (e: Partial<EjercicioListado> & Pick<EjercicioListado, 'id' | 'nombre'>): EjercicioListado => ({
  tipo: 'peso',
  enfoque: 'hipertrofia',
  metodo: 'rectas',
  rango: [8, 12],
  pesoRefGramos: 40000,
  nivel: null,
  metaReps: 12,
  archivado: false,
  totalSesiones: 3,
  ultimaFecha: '2026-11-17',
  listoParaSubir: false,
  ...e,
});
const datos = {
  ejercicios: [] as EjercicioListado[],
  fechas: [] as string[],
  inicio: { sesiones: [], marcas: [] } as DatosInicio,
  perfil: {
    nombre: 'Ana Prueba',
    apodo: 'Ani',
    fechaNacimiento: '1996-04-12',
    cumpleVistoAnio: null,
    avisoDiasVisto: true,
    modoAvanzado: false,
  },
  ofertaVista: false,
};

vi.mock('@/lib/dataService', async () => {
  const { sesionesDe } = await import('@/lib/datos/inicio');
  return {
    listarEjercicios: async () => datos.ejercicios,
    obtenerEstadoGuia: async () => ({ ofertaVista: datos.ofertaVista }),
    obtenerPerfil: async () => datos.perfil,
    listarFechasConSesion: async () => datos.fechas,
    obtenerHistorialDias: async () => [{ dias: [1, 2, 3, 4, 5], vigenteDesde: '2026-01-01' }],
    obtenerDatosInicio: async () => datos.inicio,
    sesionesDe,
  };
});
vi.mock('@/lib/db/conexion', () => ({ consultar: vi.fn() }));

import GymPage from '@/app/gym/page';
import { TiraSemana } from '@/components/inicio/TiraSemana';
import { estadosSemana } from '@/lib/reglas/inicio';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T15:00:00Z'));
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  datos.ejercicios = [];
  datos.fechas = [];
  datos.inicio = { sesiones: [], marcas: [] };
  datos.ofertaVista = false;
});
afterEach(cleanup);

const renderizarInicio = async (parametros: Record<string, string> = {}) => {
  const pagina = await GymPage({ searchParams: Promise.resolve(parametros) });
  await act(async () => {
    render(<main>{pagina}</main>);
  });
};

const conEjercicios = () => {
  datos.ejercicios = [
    ejercicio({ id: 'e1', nombre: 'Press de banca', listoParaSubir: true }),
    ejercicio({ id: 'e2', nombre: 'Dominadas', tipo: 'calistenia', pesoRefGramos: null, metaReps: 15 }),
    ejercicio({ id: 'e3', nombre: 'Remo', archivado: true }),
  ];
  datos.fechas = ['2026-11-16', '2026-11-17'];
  datos.inicio = {
    sesiones: [
      { ejercicioId: 'e1', nombre: 'Press de banca', tipo: 'peso', fecha: '2026-11-16', series: [{ reps: 10, pesoGramos: 40000 }] },
      { ejercicioId: 'e1', nombre: 'Press de banca', tipo: 'peso', fecha: '2026-11-17', series: [{ reps: 12, pesoGramos: 40000 }, { reps: 12, pesoGramos: 40000 }] },
      { ejercicioId: 'e2', nombre: 'Dominadas', tipo: 'calistenia', fecha: '2026-11-17', series: [{ reps: 9, pesoGramos: null }] },
    ],
    marcas: [
      { ejercicioId: 'e1', nombre: 'Press de banca', tipo: 'peso', fecha: '2026-11-16', pesoMaxGramos: 40000, repsEnPesoMax: 10, repsMax: 10 },
      { ejercicioId: 'e1', nombre: 'Press de banca', tipo: 'peso', fecha: '2026-11-17', pesoMaxGramos: 40000, repsEnPesoMax: 12, repsMax: 12 },
    ],
  };
};

describe('inicio (/gym) con ejercicios', () => {
  it('un solo h1 con el saludo y el apodo; el correo ya no se muestra', async () => {
    conEjercicios();
    await renderizarInicio();
    const titulos = screen.getAllByRole('heading', { level: 1 });
    expect(titulos).toHaveLength(1);
    expect(titulos[0]).toHaveTextContent('Buenos días, Ani');
    expect(screen.getByText('Jueves, 19 de noviembre')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('persona@example.com');
  });

  it('muestra el anillo, la semana, Hoy, el progreso, los ejercicios activos y los accesos de CHRONO', async () => {
    conEjercicios();
    await renderizarInicio();
    expect(
      screen.getByRole('link', {
        // El miércoles 18 era planificado y no se entrenó: la racha se rompió.
        name: 'Racha de 0 días; esta semana entrenaste 2 de 5 días planificados. Ver el detalle de tu racha',
      }),
    ).toHaveAttribute('href', '/gym/perfil#racha');
    const hoy = screen.getByRole('region', { name: 'Hoy' });
    expect(within(hoy).getByText('Hoy toca entrenar')).toBeInTheDocument();
    expect(within(hoy).getByRole('link', { name: 'Registrar mi entrenamiento' })).toHaveAttribute('href', '/gym/entrenamiento');
    const progreso = screen.getByRole('region', { name: 'Tu progreso' });
    expect(within(progreso).getByRole('link', { name: /Listos para subir: 1/ })).toHaveAttribute('href', '/gym?listos=1#mis-ejercicios');
    expect(within(progreso).getByRole('img', { name: /Volumen de las últimas 4 semanas/ })).toBeInTheDocument();
    // Último récord: 40 kg × 12 el martes 17 (los mismos kilos con más repeticiones), con la insignia "Nuevo".
    expect(within(progreso).getByRole('link', { name: /^Último récord Nuevo 40 kg × 12 Press de banca hace 2 días$/ })).toHaveAttribute(
      'href',
      '/gym/ejercicios/e1',
    );
    // Los archivados no salen en la lista: van en un enlace al final.
    const lista = screen.getByRole('region', { name: 'Mis ejercicios' });
    expect(within(lista).getAllByRole('article')).toHaveLength(2);
    expect(within(lista).getByRole('link', { name: 'Ver archivados (1)' })).toBeInTheDocument();
    expect(within(lista).getByText('Sube a 42,5 kg')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /¿Qué entreno hoy\?/ })).toHaveAttribute(
      'href',
      `/gym/chat?pregunta=${encodeURIComponent('¿Qué entreno hoy?')}`,
    );
    for (const guia of ['anillo-racha', 'semana', 'hoy', 'progreso', 'filtros', 'nuevo-ejercicio', 'tarjeta-ejercicio', 'accesos-chrono']) {
      expect(document.querySelector(`[data-guia="${guia}"]`), guia).not.toBeNull();
    }
  });

  it('el filtro "Listos para subir" deja solo esos ejercicios', async () => {
    conEjercicios();
    await renderizarInicio({ listos: '1' });
    const lista = screen.getByRole('region', { name: 'Mis ejercicios' });
    expect(within(lista).getAllByRole('article')).toHaveLength(1);
    expect(within(lista).getByRole('link', { name: 'Listos para subir' })).toHaveAttribute('aria-current', 'page');
  });

  it('pasa axe-core y la revisión básica', async () => {
    conEjercicios();
    await renderizarInicio();
    expect(revisarBasico(document.body)).toEqual([]);
    expect(await revisarConAxe(document.body)).toEqual([]);
  });
});

describe('inicio (/gym) sin ejercicios', () => {
  it('estado vacío con 3 pasos, el botón para crear y la oferta de la guía', async () => {
    await renderizarInicio();
    expect(screen.getByRole('heading', { name: 'Empecemos tu progreso' })).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Crear mi primer ejercicio' })).toHaveAttribute('data-guia', 'nuevo-ejercicio');
    expect(screen.getByRole('heading', { name: '¿Es tu primera vez?' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Mis ejercicios' })).toBeNull();
  });

  it('pasa axe-core y la revisión básica', async () => {
    await renderizarInicio();
    expect(revisarBasico(document.body)).toEqual([]);
    expect(await revisarConAxe(document.body)).toEqual([]);
  });
});

describe('tira de la semana', () => {
  const semana = () =>
    estadosSemana({
      hoy: HOY,
      historialDias: [{ dias: [1, 2, 3, 4, 5], vigenteDesde: '2026-01-01' }],
      sesiones: [{ ejercicioId: 'e1', nombre: 'Press de banca', tipo: 'peso', fecha: '2026-11-16', series: [] }],
    });

  it('tres estados distintos y "Hoy" marcado; solo hoy está en el orden de tabulación', () => {
    render(<TiraSemana dias={semana()} />);
    const dias = within(screen.getByRole('group', { name: 'Días de esta semana' })).getAllByRole('button');
    expect(dias).toHaveLength(7);
    expect(dias.map((dia) => dia.getAttribute('data-estado'))).toEqual([
      'entrenado',
      'planificado',
      'planificado',
      'planificado',
      'planificado',
      'descanso',
      'descanso',
    ]);
    expect(dias[0]).toHaveAccessibleName('lunes 16: entrenado');
    expect(dias[1]).toHaveAccessibleName('martes 17: planificado, sin entrenar');
    expect(dias[3]).toHaveAccessibleName('jueves 19, hoy: planificado');
    expect(dias.map((dia) => dia.tabIndex)).toEqual([-1, -1, -1, 0, -1, -1, -1]);
    // El entrenado lleva un check (no solo color) y el descanso, un punto.
    expect(dias[0]!.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
  });

  it('las flechas mueven el foco (y dan la vuelta); Inicio y Fin van a los extremos', () => {
    render(<TiraSemana dias={semana()} />);
    const dias = screen.getAllByRole('button');
    dias[3]!.focus();
    fireEvent.keyDown(dias[3]!, { key: 'ArrowRight' });
    expect(dias[4]).toHaveFocus();
    expect(dias[4]!.tabIndex).toBe(0);
    expect(dias[3]!.tabIndex).toBe(-1);
    fireEvent.keyDown(dias[4]!, { key: 'End' });
    expect(dias[6]).toHaveFocus();
    fireEvent.keyDown(dias[6]!, { key: 'ArrowRight' });
    expect(dias[0]).toHaveFocus();
    fireEvent.keyDown(dias[0]!, { key: 'ArrowLeft' });
    expect(dias[6]).toHaveFocus();
    fireEvent.keyDown(dias[6]!, { key: 'Home' });
    expect(dias[0]).toHaveFocus();
  });

  it('hoy empieza abierto; al tocar otro día se despliega (aria-expanded) con lo que se hizo', async () => {
    render(<TiraSemana dias={semana()} />);
    const dias = screen.getAllByRole('button');
    expect(dias.map((dia) => dia.getAttribute('aria-expanded'))).toEqual(['false', 'false', 'false', 'true', 'false', 'false', 'false']);
    expect(screen.getByText('Aún no entrenas hoy.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrenar hoy' })).toHaveAttribute('href', '/gym/entrenamiento');

    fireEvent.click(dias[0]!);
    expect(dias[0]).toHaveAttribute('aria-expanded', 'true');
    expect(dias[3]).toHaveAttribute('aria-expanded', 'false');
    expect(await screen.findByRole('link', { name: 'Press de banca' })).toHaveAttribute('href', '/gym/ejercicios/e1');

    fireEvent.click(dias[5]!);
    expect(await screen.findByText('Día de descanso.')).toBeInTheDocument();

    fireEvent.click(dias[5]!);
    expect(dias[5]).toHaveAttribute('aria-expanded', 'false');
  });
});
