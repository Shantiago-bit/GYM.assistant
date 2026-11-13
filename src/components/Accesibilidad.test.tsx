import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/gym',
}));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock('@/components/guia/ProveedorGuia', () => ({ useGuia: () => ({ abrirPanel: vi.fn() }) }));
vi.mock('@/components/guia/PanelGuia', () => ({ PanelGuia: () => null }));

import { BotonArchivar } from '@/components/gym/BotonArchivar';
import { EditarEnfoque } from '@/components/gym/EditarEnfoque';
import { FormularioEjercicio } from '@/components/gym/FormularioEjercicio';
import { FormularioSeries } from '@/components/gym/FormularioSeries';
import { HistorialSesiones } from '@/components/gym/HistorialSesiones';
import { InterruptorModo } from '@/components/gym/InterruptorModo';
import { ModalMetaAlcanzada } from '@/components/gym/ModalMetaAlcanzada';
import { NavegacionGym } from '@/components/gym/NavegacionGym';
import { Progreso1RM } from '@/components/gym/Progreso1RM';
import { TarjetaEjercicio } from '@/components/gym/TarjetaEjercicio';
import { TarjetaRecomendacion } from '@/components/gym/TarjetaRecomendacion';
import { TarjetaSiguientePaso } from '@/components/gym/TarjetaSiguientePaso';
import { MenuMasOpciones } from '@/components/ui/MenuMasOpciones';
import { SelectorDias } from '@/components/ui/SelectorDias';
import { Termino } from '@/components/ui/Termino';
import type { EjercicioListado, LogroMeta, PlanSerie, Sesion } from '@/lib/dataService';

const SESIONES: Sesion[] = [
  {
    id: 's2',
    fecha: '2026-11-10',
    esPrueba: false,
    series: [
      { numero: 1, reps: 12, pesoGramos: 40000, rir: 2, tipoSerie: 'normal' },
      { numero: 2, reps: 8, pesoGramos: 40000, rir: null, tipoSerie: 'drop_set', extras: [{ reps: 4, pesoGramos: 30000 }] },
    ],
  },
  { id: 's1', fecha: '2026-11-03', esPrueba: true, series: [{ numero: 1, reps: 10, pesoGramos: 40000, rir: null }] },
];
const PLAN: PlanSerie[] = [
  { etiqueta: 'Principal', pesoGramos: 40000, repsMin: 8, repsMax: 12, clave: true },
  { etiqueta: 'Descarga', pesoGramos: 36000, repsMin: 8, repsMax: 12, clave: false },
];
const EJERCICIO: EjercicioListado = {
  id: 'e1',
  nombre: 'Press de banca',
  tipo: 'peso',
  enfoque: 'hipertrofia',
  metodo: 'rectas',
  rango: [8, 12],
  pesoRefGramos: 40000,
  nivel: null,
  metaReps: 12,
  archivado: false,
  totalSesiones: 2,
  ultimaFecha: '2026-11-10',
  listoParaSubir: true,
};
const LOGRO: LogroMeta = {
  nombre: 'Press de banca',
  tipo: 'peso',
  rango: [8, 12],
  series: [{ reps: 12, pesoGramos: 40000 }],
  volumenGramos: 480000,
  pesoSiguienteGramos: 42500,
  incrementoGramos: 2500,
  metaRepsSiguiente: 8,
  saltoDoble: false,
  metodo: 'rectas',
};
const RECOMENDACION = { accion: 'subir_peso' as const, pesoSugeridoGramos: 42500, metaRepsSugerida: 8, mensaje: 'Sube el peso.' };

const series = (avanzado: boolean, tipo: 'peso' | 'calistenia' = 'peso') => (
  <FormularioSeries
    tipo={tipo}
    urlEnvio="/api/x"
    destino="/gym"
    textoBoton="Guardar sesión"
    pesoInicialKg={40}
    fechaMaxima="2026-11-13"
    avanzado={avanzado}
  />
);

// Las pantallas principales, armadas con sus componentes reales.
const PANTALLAS: [string, () => ReactElement][] = [
  ['menú principal', () => <NavegacionGym nombre="Ana" avatarUrl={null} />],
  ['crear ejercicio (sencillo)', () => <FormularioEjercicio />],
  ['crear ejercicio (avanzado)', () => <FormularioEjercicio avanzado />],
  ['series con peso (sencillo)', () => series(false)],
  ['series con peso (avanzado)', () => series(true)],
  ['series con tu cuerpo (sencillo)', () => series(false, 'calistenia')],
  [
    'siguiente paso',
    () => (
      <TarjetaSiguientePaso
        paso={{ titulo: 'Sube a 42,5 kg', explicacion: 'La próxima vez usa 42,5 kg.', accion: { texto: 'Anotar solo este ejercicio', href: '/gym/ejercicios/e1/sesion' } }}
      />
    ),
  ],
  [
    'recomendación (avanzado)',
    () => (
      <TarjetaRecomendacion recomendacion={RECOMENDACION} sinPrueba={false} plan={PLAN} ejercicio={EJERCICIO} avanzado />
    ),
  ],
  ['tarjeta de ejercicio', () => <TarjetaEjercicio ejercicio={EJERCICIO} />],
  ['histórico y peso máximo', () => (
    <>
      <Progreso1RM sesiones={SESIONES} />
      <HistorialSesiones sesiones={SESIONES} avanzado />
    </>
  )],
  [
    'más opciones',
    () => (
      <MenuMasOpciones>
        <EditarEnfoque id="e1" tipo="peso" enfoqueActual="hipertrofia" metodoActual="rectas" rangoActual={[8, 12]} />
        <BotonArchivar id="e1" nombre="Press de banca" />
      </MenuMasOpciones>
    ),
  ],
  ['interruptor del modo', () => <InterruptorModo inicial={false} />],
  ['días de entrenamiento', () => <SelectorDias valor={[1, 3, 5]} alCambiar={() => undefined} />],
  ['meta alcanzada', () => <ModalMetaAlcanzada logros={[LOGRO]} onCerrar={() => undefined} />],
];

afterEach(cleanup);

describe('accesibilidad de las pantallas principales', () => {
  it.each(PANTALLAS)('%s: sin imágenes sin alt, botones sin nombre ni campos sin etiqueta', (_nombre, crear) => {
    render(crear());
    expect(revisarBasico(document.body)).toEqual([]);
  });

  it.each(PANTALLAS)('%s: axe-core sin violaciones', async (_nombre, crear) => {
    render(crear());
    expect(await revisarConAxe(document.body)).toEqual([]);
  });

  it('con errores a la vista y el "?" abierto también pasa axe-core', async () => {
    render(
      <>
        {series(false)}
        <Termino id="rir" />
      </>,
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso en kilos de la serie 1' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar sesión' }));
    fireEvent.click(screen.getByRole('button', { name: '¿Qué es RIR?' }));
    expect(screen.getAllByRole('spinbutton', { name: /Repeticiones de la serie/ })[0]).toHaveAttribute('aria-invalid', 'true');
    expect(revisarBasico(document.body)).toEqual([]);
    expect(await revisarConAxe(document.body)).toEqual([]);
  });

  it('la revisión básica sí detecta los problemas', () => {
    render(
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src="/x.png" />
        <button type="button" />
        <input type="text" />
      </div>,
    );
    expect(revisarBasico(document.body)).toHaveLength(3);
  });

  it('axe-core sí detecta los problemas', async () => {
    render(
      <div>
        <button type="button" />
        <h1>Título</h1>
        <h3>Salta un nivel</h3>
      </div>,
    );
    const problemas = (await revisarConAxe(document.body)).join(' ');
    expect(problemas).toContain('button-name');
    expect(problemas).toContain('heading-order');
  });
});
