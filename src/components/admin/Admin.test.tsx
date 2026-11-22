import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  ruta: '/admin',
  mfa: {
    listFactors: vi.fn(),
    unenroll: vi.fn(),
    enroll: vi.fn(),
    challengeAndVerify: vi.fn(),
  },
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh, push: vi.fn() }),
  usePathname: () => mocks.ruta,
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { mfa: mocks.mfa, signOut: mocks.signOut } } }));

import { BarraSuperiorAdmin } from './BarraSuperiorAdmin';
import { FormularioDosPasos } from './FormularioDosPasos';
import { GraficoArea } from './graficos/GraficoArea';
import { GraficoBarras } from './graficos/GraficoBarras';
import { MedidorSemicircular } from './graficos/MedidorSemicircular';
import { MiniBarras } from './graficos/MiniBarras';
import { MedidorMeta } from './MedidorMeta';
import { MenuAdmin } from './MenuAdmin';
import { PanelTendencia } from './PanelTendencia';
import { TarjetaIndicador } from './TarjetaIndicador';
import { VigilanteInactividad } from './VigilanteInactividad';
import { completarMeses, proyectarMeta, variacion } from '@/lib/reglas/admin';

afterEach(cleanup);

const PUNTOS = [
  { etiqueta: 'sept', etiquetaLarga: 'sept 2026', valor: 4 },
  { etiqueta: 'oct', etiquetaLarga: 'oct 2026', valor: 9 },
  { etiqueta: 'nov', etiquetaLarga: 'nov 2026', valor: 6 },
];
const CONTADORES = { personasPendientes: 3, correosConError24h: 2, activasMes: 12, totalCuentas: 40 };
const MESES = completarMeses(
  [
    { mes: '2026-10', registros: 5, activas: 8, sesiones: 30, series: 90, mensajes: 12 },
    { mes: '2026-11', registros: 7, activas: 10, sesiones: 41, series: 120, mensajes: 20 },
  ],
  '2026-11-21',
  12,
);

async function sinProblemas(contenedor: HTMLElement) {
  expect(revisarBasico(contenedor)).toEqual([]);
  expect(await revisarConAxe(contenedor)).toEqual([]);
}

describe('gráficos SVG accesibles', () => {
  it('área, barras, mini barras y medidor: título, descripción y tabla alternativa con los datos', async () => {
    const { container } = render(
      <div>
        <GraficoArea titulo="Sesiones por mes" descripcion="Últimos 3 meses" nombreValor="Sesiones" puntos={PUNTOS} />
        <GraficoBarras titulo="Sesiones por día" descripcion="Última semana" nombreValor="Sesiones" puntos={PUNTOS} />
        <MiniBarras titulo="Registros por día" descripcion="Subieron esta semana" puntos={PUNTOS} tabla nombreValor="Registros" />
        <MedidorSemicircular titulo="Meta del mes" valor={20} total={50} etiquetaValor="Activas" etiquetaTotal="Meta" />
      </div>,
    );
    await sinProblemas(container);

    const figura = screen.getByRole('figure', { name: 'Sesiones por mes' });
    expect(within(figura).getByRole('img', { name: 'Sesiones por mes' })).toHaveAccessibleDescription('Últimos 3 meses');
    // La tabla alternativa tiene todos los puntos, con la etiqueta larga.
    const tabla = within(figura).getByRole('table', { name: 'Sesiones por mes', hidden: true });
    expect(within(tabla).getAllByRole('row', { hidden: true })).toHaveLength(4);
    expect(tabla).toHaveTextContent('oct 2026');
    expect(screen.getByRole('figure', { name: /Meta del mes: 20 de 50 \(40 %\)/ })).toBeInTheDocument();
  });
});

describe('estructura del panel', () => {
  beforeEach(() => {
    mocks.ruta = '/admin';
  });

  it('menú lateral agrupado, con contadores, "Próximamente" y la barra de cuentas activas', async () => {
    const { container } = render(<MenuAdmin contadores={CONTADORES} />);
    await sinProblemas(container);
    const [lateral] = screen.getAllByRole('navigation', { name: 'Panel de administración' });
    expect(within(lateral!).getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page');
    expect(lateral).toHaveTextContent('Plataforma');
    expect(lateral).toHaveTextContent('Operación');
    expect(lateral).toHaveTextContent('Personas· Próximamente3 cuentas pendientes');
    expect(lateral).toHaveTextContent('2 correos con error en las últimas 24 horas');
    expect(screen.getAllByText(/Cuentas activas este mes:/)[0]!.closest('p')).toHaveTextContent('Cuentas activas este mes: 12 de 40 registradas');
  });

  it('en móvil el menú se abre con su botón, Escape lo cierra y el foco vuelve al botón', async () => {
    render(<MenuAdmin contadores={CONTADORES} />);
    const boton = screen.getByRole('button', { name: 'Menú del panel' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(boton.getAttribute('aria-controls')!)!;
    expect(panel).toBeVisible();
    await waitFor(() => expect(within(panel).getByRole('link', { name: 'Resumen' })).toHaveFocus());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
  });

  it('barra superior con el buscador (próximamente), el enlace a la app y el rol', async () => {
    const { container } = render(<BarraSuperiorAdmin nombre="Santi" rol="lectura" />);
    await sinProblemas(container);
    expect(screen.getByRole('searchbox', { name: /Buscar personas/ })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Ir a la app' })).toHaveAttribute('href', '/gym');
    expect(screen.getByText('Solo lectura')).toBeInTheDocument();
  });

  it('tarjetas con la insignia de variación (texto, no solo color) y el medidor de la meta', async () => {
    const { container } = render(
      <div>
        <TarjetaIndicador titulo="Sesiones del mes" valor={41} variacion={variacion(41, 30)} />
        <TarjetaIndicador titulo="Registros del mes" valor={3} variacion={variacion(3, 0)} />
        <MedidorMeta meta={proyectarMeta({ activas: 20, meta: 50, dia: 20, diasDelMes: 30 })} activasHoy={4} />
      </div>,
    );
    await sinProblemas(container);
    expect(screen.getByText('+37 %').closest('span')).toHaveTextContent('+37 % frente al mes anterior');
    expect(screen.getByText('nuevo')).toBeInTheDocument();
    expect(screen.getByText('Por debajo')).toBeInTheDocument();
  });

  it('selectores de métrica y periodo con aria-pressed y teclado', async () => {
    const { container } = render(<PanelTendencia meses={MESES} totalCuentas={40} activasPeriodo={{ 3: 11, 6: 15, 12: 20 }} />);
    await sinProblemas(container);
    expect(screen.getByRole('heading', { name: 'Personas activas por mes' })).toBeInTheDocument();
    const sesiones = screen.getByRole('button', { name: 'Sesiones' });
    sesiones.focus();
    fireEvent.click(sesiones);
    expect(sesiones).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Sesiones por mes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3 M (3 meses)' }));
    expect(screen.getByRole('table', { name: 'Sesiones por mes, últimos 3 meses', hidden: true })).toBeInTheDocument();
    expect(screen.getByText('Personas activas', { selector: 'dt' }).nextElementSibling).toHaveTextContent('11');
  });
});

describe('cierre por inactividad', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('avisa un minuto antes; "Seguir aquí" reinicia el plazo; sin respuesta, cierra la sesión', () => {
    const cerrar = vi.fn();
    render(<VigilanteInactividad minutos={30} avisoSegundos={60} alCerrarSesion={cerrar} />);

    act(() => vi.advanceTimersByTime(29 * 60_000 - 1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('dialog', { name: '¿Sigues ahí?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Seguir aquí' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(29 * 60_000));
    expect(cerrar).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(60_000));
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('la actividad (teclado, puntero) aplaza el cierre', () => {
    const cerrar = vi.fn();
    render(<VigilanteInactividad minutos={30} avisoSegundos={60} alCerrarSesion={cerrar} />);
    act(() => vi.advanceTimersByTime(20 * 60_000));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    act(() => vi.advanceTimersByTime(20 * 60_000));
    expect(cerrar).not.toHaveBeenCalled();
  });
});

describe('verificación en dos pasos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mfa.unenroll.mockResolvedValue({ data: {}, error: null });
  });

  it('sin factor: muestra el QR con texto alternativo y la clave; un código correcto entra al panel', async () => {
    mocks.mfa.listFactors.mockResolvedValue({ data: { all: [{ id: 'viejo', factor_type: 'totp', status: 'unverified' }], totp: [] }, error: null });
    mocks.mfa.enroll.mockResolvedValue({ data: { id: 'f1', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'CLAVEPRUEBA', uri: '' } }, error: null });
    mocks.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    const { container } = render(<FormularioDosPasos />);

    expect(await screen.findByRole('img', { name: /Código QR/ })).toBeInTheDocument();
    expect(mocks.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'viejo' });
    expect(screen.getByText('CLAVEPRUEBA')).toBeInTheDocument();
    await sinProblemas(container);

    fireEvent.change(screen.getByLabelText('Código de verificación'), { target: { value: '123 456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Activar y entrar' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin'));
    expect(mocks.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '123456' });
  });

  it('con factor: pide el código; uno incorrecto muestra el error accesible y no entra', async () => {
    mocks.mfa.listFactors.mockResolvedValue({ data: { all: [], totp: [{ id: 'f2' }] }, error: null });
    mocks.mfa.challengeAndVerify.mockResolvedValue({ data: null, error: { message: 'Invalid TOTP code entered' } });
    render(<FormularioDosPasos />);

    const campo = await screen.findByLabelText('Código de verificación');
    expect(mocks.mfa.enroll).not.toHaveBeenCalled();
    fireEvent.change(campo, { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar y entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe los 6 dígitos');

    fireEvent.change(campo, { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar y entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El código no es correcto');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
