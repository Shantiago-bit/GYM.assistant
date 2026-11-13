'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useId, useState, type FormEvent } from 'react';
import { ModalMetaAlcanzada } from '@/components/gym/ModalMetaAlcanzada';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Termino } from '@/components/ui/Termino';
import type { LogroMeta, SerieKg } from '@/lib/datos/tipos';
import { kgAGramos } from '@/lib/formato';
import { enviarJson } from '@/lib/http/cliente';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { validarSesion } from '@/lib/reglas/sesion';
import { admiteExtras, leerListaNumeros, TIPOS_SERIE, type TipoSerie } from '@/lib/reglas/tecnicas';
import { GLOSARIO } from '@/lib/textos/glosario';
import { esquemaSeries } from '@/lib/validacion/esquemas';

export interface FilaSerie {
  reps: string;
  kg: string;
  rir: string;
  tipoSerie: TipoSerie;
  // Mini series de rest-pause, myo-reps o drop set, y los pesos de las bajadas del drop set.
  miniReps: string;
  miniKg: string;
  etiqueta?: string | undefined;
}

function filaVacia(kg: string, etiqueta?: string): FilaSerie {
  return { reps: '', kg, rir: '', tipoSerie: 'normal', miniReps: '', miniKg: '', etiqueta };
}

export function filasIniciales(cantidad: number, pesoKg: number | null): FilaSerie[] {
  return filasDesdePesos(Array.from({ length: cantidad }, () => pesoKg));
}

// Una fila por serie con el peso y la etiqueta que propone el plan del método.
export function filasDesdePesos(pesosKg: (number | null)[], etiquetas: string[] = []): FilaSerie[] {
  return pesosKg.map((pesoKg, indice) =>
    filaVacia(pesoKg === null ? '' : String(pesoKg), etiquetas[indice] || undefined),
  );
}

function leerExtras(fila: FilaSerie, tipo: TipoEjercicio, numero: number): SerieKg['extras'] {
  if (!admiteExtras(fila.tipoSerie) || fila.miniReps.trim() === '') {
    return undefined;
  }

  const reps = leerListaNumeros(fila.miniReps, false);
  if (!reps || reps.length === 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', `Serie ${numero}: escribe las mini series como "3 2 2".`);
  }

  if (fila.tipoSerie !== 'drop_set' || tipo !== 'peso') {
    return reps.map((valor) => ({ reps: valor }));
  }

  const pesos = leerListaNumeros(fila.miniKg, true);
  if (!pesos || pesos.length !== reps.length) {
    throw new ErrorDeNegocio(
      'DATOS_INVALIDOS',
      `Serie ${numero}: anota un peso por cada bajada del drop set (por ejemplo "40 30").`,
    );
  }
  return reps.map((valor, indice) => ({ reps: valor, pesoKg: pesos[indice] }));
}

// Convierte las filas del formulario en series válidas, o lanza el mensaje para el usuario.
export function leerSeries(filas: FilaSerie[], tipo: TipoEjercicio): SerieKg[] {
  const sinReps = filas.findIndex((fila) => fila.reps.trim() === '');
  if (sinReps >= 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', `Escribe cuántas repeticiones hiciste en la serie ${sinReps + 1}.`);
  }

  const validacion = esquemaSeries.safeParse(
    filas.map((fila, indice) => ({
      reps: Number(fila.reps),
      pesoKg: tipo === 'peso' && fila.kg.trim() !== '' ? Number(fila.kg) : undefined,
      rir: fila.rir.trim() === '' ? undefined : Number(fila.rir),
      tipoSerie: fila.tipoSerie,
      extras: leerExtras(fila, tipo, indice + 1),
    })),
  );

  if (!validacion.success) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', validacion.error.issues[0]?.message);
  }

  validarSesion(
    validacion.data.map((serie) => ({
      reps: serie.reps,
      pesoGramos: serie.pesoKg === undefined ? null : kgAGramos(serie.pesoKg),
      rir: serie.rir ?? null,
      tipoSerie: serie.tipoSerie ?? 'normal',
      extras:
        serie.extras?.map((extra) => ({
          reps: extra.reps,
          pesoGramos: extra.pesoKg === undefined ? null : kgAGramos(extra.pesoKg),
        })) ?? null,
    })),
    tipo,
  );

  return validacion.data;
}

// Calentamiento sugerido: la mitad del peso de la primera serie, redondeada a 0,5 kg.
function pesoAproximacion(kg: string): string {
  const valor = Number(kg.replace(',', '.'));
  return Number.isFinite(valor) && valor > 0 ? String(Math.floor(valor / 2 / 0.5) * 0.5) : '';
}

const CLASES_CONTROL_CHICO =
  'min-h-11 w-24 min-w-0 flex-1 rounded-gym border border-borde bg-superficie px-2 py-1 text-base tabular-nums text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave';

// Nombre de una técnica: el técnico en el modo avanzado y el llano en el sencillo.
function textoTecnica(valor: TipoSerie, avanzado: boolean): string {
  const opcion = TIPOS_SERIE.find((tipoSerie) => tipoSerie.valor === valor);
  if (avanzado || valor === 'normal') return opcion?.texto ?? valor;
  return GLOSARIO[valor].llano;
}

function explicacionTecnica(valor: TipoSerie, avanzado: boolean): string | undefined {
  if (valor === 'normal') return undefined;
  return avanzado ? TIPOS_SERIE.find((opcion) => opcion.valor === valor)?.descripcion : GLOSARIO[valor].explicacion;
}

// Técnica, mini series y bajadas del drop set de una serie.
function DetallesSerie({
  tipo,
  fila,
  numero,
  avanzado,
  guia,
  onCambio,
}: {
  tipo: TipoEjercicio;
  fila: FilaSerie;
  numero: number;
  avanzado: boolean;
  guia: boolean;
  onCambio: (cambios: Partial<FilaSerie>) => void;
}) {
  const idTecnica = useId();
  const conExtras = admiteExtras(fila.tipoSerie);
  const descripcion = explicacionTecnica(fila.tipoSerie, avanzado);
  const etiqueta = avanzado ? 'Técnica' : 'Cómo la hiciste';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2" data-guia={guia ? 'serie-tecnica' : undefined}>
        <label htmlFor={idTecnica} className="text-sm text-texto-suave">
          {etiqueta}
        </label>
        {avanzado ? <Termino id="tecnica">{null}</Termino> : null}
        <select
          id={idTecnica}
          value={fila.tipoSerie}
          onChange={(evento) => onCambio({ tipoSerie: evento.target.value as TipoSerie })}
          className="min-h-11 rounded-gym border border-borde bg-superficie px-2 py-1 text-base text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
          aria-label={`${etiqueta} (serie ${numero})`}
        >
          {TIPOS_SERIE.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {textoTecnica(opcion.valor, avanzado)}
            </option>
          ))}
        </select>
      </div>
      {conExtras ? (
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-texto-suave">
          {fila.tipoSerie === 'drop_set' ? 'Repeticiones de cada bajada' : avanzado ? 'Mini series' : 'Repeticiones extra'}
          <input
            value={fila.miniReps}
            onChange={(evento) => onCambio({ miniReps: evento.target.value })}
            placeholder="3 2 2"
            inputMode="numeric"
            className={CLASES_CONTROL_CHICO}
          />
        </label>
      ) : null}
      {fila.tipoSerie === 'drop_set' && tipo === 'peso' ? (
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-texto-suave">
          Peso de cada bajada (kg)
          <input
            value={fila.miniKg}
            onChange={(evento) => onCambio({ miniKg: evento.target.value })}
            placeholder="40 30"
            inputMode="decimal"
            className={CLASES_CONTROL_CHICO}
          />
        </label>
      ) : null}
      {descripcion ? <p className="w-full text-sm text-texto-suave">{descripcion}</p> : null}
    </div>
  );
}

// Una fila con el RIR o una técnica ya anotados arranca con "Más detalles" abierto.
const tieneDetalles = (fila: FilaSerie) => fila.rir.trim() !== '' || fila.tipoSerie !== 'normal';

export function EditorSeries({
  tipo,
  filas,
  onCambio,
  avanzado = false,
}: {
  tipo: TipoEjercicio;
  filas: FilaSerie[];
  onCambio: (filas: FilaSerie[]) => void;
  avanzado?: boolean;
}) {
  const idEditor = useId();
  // Modo sencillo: series (por posición) con "Más detalles" abierto.
  const [abiertas, setAbiertas] = useState<Set<number>>(
    () => new Set(filas.flatMap((fila, indice) => (tieneDetalles(fila) ? [indice] : []))),
  );

  const cambiar = (indice: number, cambios: Partial<FilaSerie>) => {
    onCambio(filas.map((fila, i) => (i === indice ? { ...fila, ...cambios } : fila)));
  };

  const alternar = (indice: number) => {
    setAbiertas((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(indice)) siguiente.delete(indice);
      else siguiente.add(indice);
      return siguiente;
    });
  };

  const quitar = (indice: number) => {
    onCambio(filas.filter((_, i) => i !== indice));
    setAbiertas((actual) => new Set([...actual].filter((i) => i !== indice).map((i) => (i > indice ? i - 1 : i))));
  };

  const agregar = () => {
    onCambio([...filas, filaVacia(filas.at(-1)?.kg ?? '')]);
  };

  // La serie de calentamiento solo se agrega si la persona la pide; nunca sola.
  const agregarAproximacion = () => {
    const primera = filas.find((fila) => fila.tipoSerie !== 'aproximacion');
    const aproximacion: FilaSerie = {
      ...filaVacia(tipo === 'peso' ? pesoAproximacion(primera?.kg ?? '') : '', 'Calentamiento'),
      tipoSerie: 'aproximacion',
    };
    onCambio([aproximacion, ...filas]);
    setAbiertas((actual) => new Set([0, ...[...actual].map((i) => i + 1)]));
  };

  const campoRir = (fila: FilaSerie, indice: number) => (
    <Campo
      etiqueta={avanzado ? 'RIR' : 'Repeticiones que te quedaron'}
      junto={<Termino id="rir">{null}</Termino>}
      type="number"
      inputMode="numeric"
      min={0}
      max={10}
      step={1}
      value={fila.rir}
      onChange={(evento) => cambiar(indice, { rir: evento.target.value })}
      className="tabular-nums"
      aria-label={`${avanzado ? 'RIR' : 'Repeticiones que te quedaron'} en la serie ${indice + 1} (opcional)`}
    />
  );

  return (
    <fieldset className="space-y-3" data-guia="series">
      <legend className="sr-only">Series</legend>
      {filas.map((fila, indice) => {
        const numero = indice + 1;
        const esAproximacion = fila.tipoSerie === 'aproximacion';
        const verDetalles = abiertas.has(indice);
        const idDetalles = `${idEditor}-detalles-${numero}`;

        const repeticiones = (
          <Campo
            etiqueta={avanzado ? 'Reps' : 'Repeticiones'}
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={fila.reps}
            onChange={(evento) => cambiar(indice, { reps: evento.target.value })}
            className="tabular-nums"
            aria-label={`Repeticiones de la serie ${numero}`}
          />
        );
        const peso =
          tipo === 'peso' ? (
            <Campo
              etiqueta={avanzado ? 'Kg' : 'Peso (kg)'}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={fila.kg}
              onChange={(evento) => cambiar(indice, { kg: evento.target.value })}
              className="tabular-nums"
              aria-label={`Peso en kilos de la serie ${numero}`}
            />
          ) : null;
        const botonQuitar = (
          <Boton
            variante="fantasma"
            disabled={filas.length === 1}
            aria-label={`Quitar serie ${numero}`}
            onClick={() => quitar(indice)}
            className={avanzado ? '!px-3' : ''}
          >
            {avanzado ? <span aria-hidden="true">✕</span> : 'Quitar'}
          </Boton>
        );

        if (!avanzado) {
          return (
            <div
              key={indice}
              className={`space-y-3 rounded-gym border p-3 ${esAproximacion ? 'border-dashed border-borde bg-fondo' : 'border-borde bg-superficie'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-texto">
                  Serie {numero}
                  {fila.etiqueta ? <span className="ml-2 text-sm font-normal text-texto-suave">{fila.etiqueta}</span> : null}
                </p>
                {botonQuitar}
              </div>
              <div className={`grid gap-3 ${peso ? 'grid-cols-2' : ''}`}>
                {repeticiones}
                {peso}
              </div>
              <div>
                <button
                  type="button"
                  aria-expanded={verDetalles}
                  aria-controls={idDetalles}
                  onClick={() => alternar(indice)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-gym px-1 text-sm font-medium text-primario underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
                >
                  <span aria-hidden="true">{verDetalles ? '▾' : '▸'}</span> Más detalles
                  <span className="sr-only"> de la serie {numero}</span>
                </button>
                <div id={idDetalles} hidden={!verDetalles} className="mt-2 space-y-3">
                  <div className="max-w-xs" data-guia={indice === 0 ? 'serie-rir' : undefined}>
                    {campoRir(fila, indice)}
                  </div>
                  <DetallesSerie
                    tipo={tipo}
                    fila={fila}
                    numero={numero}
                    avanzado={false}
                    guia={indice === 0}
                    onCambio={(cambios) => cambiar(indice, cambios)}
                  />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={indice}
            className={`space-y-2 rounded-gym ${esAproximacion ? 'border border-dashed border-borde bg-fondo p-2' : ''}`}
          >
            <div className="flex items-end gap-2">
              <span className="w-14 shrink-0 pb-2 text-sm font-medium leading-tight text-texto-suave">
                Serie {numero}
                {fila.etiqueta ? <span className="block truncate text-sm font-normal">{fila.etiqueta}</span> : null}
              </span>
              <div className="min-w-0 flex-1">{repeticiones}</div>
              {peso ? <div className="min-w-0 flex-1">{peso}</div> : null}
              <div className="w-24 shrink-0" data-guia={indice === 0 ? 'serie-rir' : undefined}>
                {campoRir(fila, indice)}
              </div>
              {botonQuitar}
            </div>
            <div className="sm:pl-16">
              <DetallesSerie
                tipo={tipo}
                fila={fila}
                numero={numero}
                avanzado
                guia={indice === 0}
                onCambio={(cambios) => cambiar(indice, cambios)}
              />
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2" data-guia="series-agregar">
        <Boton variante="secundario" onClick={agregar}>
          Agregar serie
        </Boton>
        <Boton variante="fantasma" onClick={agregarAproximacion}>
          {avanzado ? '+ Aproximación' : '+ Serie de calentamiento'}
        </Boton>
      </div>
    </fieldset>
  );
}

interface PropiedadesFormulario {
  tipo: TipoEjercicio;
  urlEnvio: string;
  destino: string;
  textoBoton: string;
  pesoInicialKg: number | null;
  cantidadSeries?: number;
  // Si hay plan, cada serie arranca con su propio peso y su etiqueta.
  pesosPlanKg?: (number | null)[];
  etiquetas?: string[];
  fechaMaxima?: string;
  avanzado?: boolean;
}

export function FormularioSeries({
  tipo,
  urlEnvio,
  destino,
  textoBoton,
  pesoInicialKg,
  cantidadSeries = 3,
  pesosPlanKg,
  etiquetas,
  fechaMaxima,
  avanzado = false,
}: PropiedadesFormulario) {
  const router = useRouter();
  const [filas, setFilas] = useState(() =>
    pesosPlanKg && pesosPlanKg.length > 0
      ? filasDesdePesos(pesosPlanKg, etiquetas)
      : filasIniciales(cantidadSeries, pesoInicialKg),
  );
  const [fecha, setFecha] = useState(fechaMaxima ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [logro, setLogro] = useState<LogroMeta | null>(null);

  const irAlDestino = useCallback(() => {
    router.push(destino as Route);
    router.refresh();
  }, [router, destino]);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');

    let series: SerieKg[];

    try {
      series = leerSeries(filas, tipo);
    } catch (causa) {
      setError(causa instanceof ErrorDeNegocio ? causa.message : 'Revisa las series: cada una necesita sus repeticiones.');
      return;
    }

    if (fechaMaxima && fecha > fechaMaxima) {
      setError('La fecha no puede ser futura.');
      return;
    }

    setGuardando(true);
    const respuesta = await enviarJson<{ logro?: LogroMeta | null }>(urlEnvio, {
      series,
      ...(fechaMaxima && fecha ? { fecha } : {}),
    });

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      setGuardando(false);
      return;
    }

    // Si se cumplió la meta del rango, se muestra el resumen antes de salir del formulario.
    if (respuesta.datos.logro) {
      setLogro(respuesta.datos.logro);
      return;
    }

    irAlDestino();
  };

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {logro ? <ModalMetaAlcanzada logros={[logro]} onCerrar={irAlDestino} avanzado={avanzado} /> : null}

      {fechaMaxima ? (
        <Campo
          etiqueta="Fecha"
          type="date"
          max={fechaMaxima}
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
        />
      ) : null}

      <EditorSeries tipo={tipo} filas={filas} onCambio={setFilas} avanzado={avanzado} />

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto" data-guia="series-guardar">
        {textoBoton}
      </Boton>
    </form>
  );
}
