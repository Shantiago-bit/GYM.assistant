'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
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

export type CampoSerie = 'reps' | 'kg' | 'rir' | 'miniReps' | 'miniKg';

// Error de un campo concreto: el formulario lo muestra junto al campo y lleva el foco al primero.
export interface ErrorSerie {
  indice: number;
  campo: CampoSerie;
  mensaje: string;
}

const REPS_MAXIMAS = 1000;
const PESO_MAXIMO_KG = 2000;
const aNumero = (texto: string) => Number(texto.trim().replace(',', '.'));

// Revisa cada campo y devuelve todos los errores, con un mensaje que dice cómo arreglarlo.
export function validarFilas(filas: FilaSerie[], tipo: TipoEjercicio, avanzado = false): ErrorSerie[] {
  const errores: ErrorSerie[] = [];
  filas.forEach((fila, indice) => {
    const n = indice + 1;
    const agregar = (campo: CampoSerie, mensaje: string) => errores.push({ indice, campo, mensaje });

    const reps = aNumero(fila.reps);
    if (fila.reps.trim() === '') agregar('reps', `Escribe cuántas repeticiones hiciste en la serie ${n}.`);
    else if (!Number.isInteger(reps) || reps < 0 || reps > REPS_MAXIMAS)
      agregar('reps', `Las repeticiones de la serie ${n} van en número entero, de 0 a ${REPS_MAXIMAS}; por ejemplo 10.`);

    if (tipo === 'peso') {
      const kg = aNumero(fila.kg);
      if (fila.kg.trim() === '') agregar('kg', `Escribe el peso en kilos de la serie ${n}, por ejemplo 40 o 42,5.`);
      else if (!Number.isFinite(kg) || kg < 0 || kg > PESO_MAXIMO_KG)
        agregar('kg', `El peso de la serie ${n} va de 0 a ${PESO_MAXIMO_KG} kg, por ejemplo 40 o 42,5.`);
    }

    if (fila.rir.trim() !== '') {
      const rir = aNumero(fila.rir);
      if (!Number.isInteger(rir) || rir < 0 || rir > 10)
        agregar(
          'rir',
          avanzado
            ? `El RIR de la serie ${n} es un número entero de 0 a 10. Si no lo sabes, déjalo vacío.`
            : `Las repeticiones que te quedaron en la serie ${n} van de 0 a 10. Si no lo sabes, déjalo vacío.`,
        );
    }

    if (admiteExtras(fila.tipoSerie) && fila.miniReps.trim() !== '') {
      const extras = leerListaNumeros(fila.miniReps, false);
      if (!extras || extras.length === 0 || extras.some((valor) => valor < 1))
        agregar('miniReps', `Serie ${n}: escribe las repeticiones extra separadas por espacios, por ejemplo "3 2 2".`);
      else if (fila.tipoSerie === 'drop_set' && tipo === 'peso') {
        const pesos = leerListaNumeros(fila.miniKg, true);
        if (!pesos || pesos.length !== extras.length)
          agregar('miniKg', `Serie ${n}: escribe un peso por cada bajada (${extras.length}), por ejemplo "40 30".`);
      }
    }
  });
  return errores;
}

function leerExtras(fila: FilaSerie, tipo: TipoEjercicio, numero: number): SerieKg['extras'] {
  if (!admiteExtras(fila.tipoSerie) || fila.miniReps.trim() === '') {
    return undefined;
  }

  const reps = leerListaNumeros(fila.miniReps, false);
  if (!reps || reps.length === 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', `Serie ${numero}: escribe las repeticiones extra como "3 2 2".`);
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
  const primero = validarFilas(filas, tipo)[0];
  if (primero) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', primero.mensaje);
  }

  const validacion = esquemaSeries.safeParse(
    filas.map((fila, indice) => ({
      reps: aNumero(fila.reps),
      pesoKg: tipo === 'peso' && fila.kg.trim() !== '' ? aNumero(fila.kg) : undefined,
      rir: fila.rir.trim() === '' ? undefined : aNumero(fila.rir),
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

// Quita los errores de los campos que la persona cambió (o todos, si agregó o quitó series).
export function erroresVigentes(errores: ErrorSerie[], antes: FilaSerie[], despues: FilaSerie[]): ErrorSerie[] {
  if (antes.length !== despues.length) return [];
  return errores.filter((error) => antes[error.indice]?.[error.campo] === despues[error.indice]?.[error.campo]);
}

// Lleva el foco al primer campo marcado con aria-invalid dentro de un contenedor.
export function enfocarPrimerError(contenedor: HTMLElement | null): void {
  contenedor?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

// Calentamiento sugerido: la mitad del peso de la primera serie, redondeada a 0,5 kg.
function pesoAproximacion(kg: string): string {
  const valor = Number(kg.replace(',', '.'));
  return Number.isFinite(valor) && valor > 0 ? String(Math.floor(valor / 2 / 0.5) * 0.5) : '';
}

const CLASES_CONTROL_CHICO =
  'min-h-11 w-24 min-w-0 flex-1 rounded-gym border bg-superficie px-2 py-1 text-base tabular-nums text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave';

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

// Campo de texto libre de las mini series y las bajadas, con su error junto al campo.
function CampoLista({
  etiqueta,
  valor,
  onCambio,
  ejemplo,
  inputMode,
  error,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  ejemplo: string;
  inputMode: 'numeric' | 'decimal';
  error: string | undefined;
}) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-sm text-texto-suave">
        {etiqueta}
      </label>
      <input
        id={id}
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        placeholder={ejemplo}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CLASES_CONTROL_CHICO} w-full ${error ? 'border-red-700' : 'border-borde'}`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// Técnica, mini series y bajadas del drop set de una serie.
function DetallesSerie({
  tipo,
  fila,
  numero,
  avanzado,
  guia,
  errorDe,
  onCambio,
}: {
  tipo: TipoEjercicio;
  fila: FilaSerie;
  numero: number;
  avanzado: boolean;
  guia: boolean;
  errorDe: (campo: CampoSerie) => string | undefined;
  onCambio: (cambios: Partial<FilaSerie>) => void;
}) {
  const idTecnica = useId();
  const conExtras = admiteExtras(fila.tipoSerie);
  const descripcion = explicacionTecnica(fila.tipoSerie, avanzado);
  const etiqueta = avanzado ? 'Técnica' : 'Cómo la hiciste';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2" data-guia={guia ? 'serie-tecnica' : undefined}>
        <label htmlFor={idTecnica} className="text-sm text-texto-suave">
          {etiqueta}
        </label>
        {avanzado ? <Termino id="tecnica">{null}</Termino> : null}
        <select
          id={idTecnica}
          value={fila.tipoSerie}
          onChange={(evento) => onCambio({ tipoSerie: evento.target.value as TipoSerie })}
          className="min-h-11 min-w-0 max-w-full rounded-gym border border-borde bg-superficie px-2 py-1 text-base text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
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
        <div className="flex flex-wrap gap-2">
          <CampoLista
            etiqueta={fila.tipoSerie === 'drop_set' ? 'Repeticiones de cada bajada' : avanzado ? 'Mini series' : 'Repeticiones extra'}
            valor={fila.miniReps}
            onCambio={(valor) => onCambio({ miniReps: valor })}
            ejemplo="3 2 2"
            inputMode="numeric"
            error={errorDe('miniReps')}
          />
          {fila.tipoSerie === 'drop_set' && tipo === 'peso' ? (
            <CampoLista
              etiqueta="Peso de cada bajada (kg)"
              valor={fila.miniKg}
              onCambio={(valor) => onCambio({ miniKg: valor })}
              ejemplo="40 30"
              inputMode="decimal"
              error={errorDe('miniKg')}
            />
          ) : null}
        </div>
      ) : null}
      {descripcion ? <p className="text-sm text-texto-suave">{descripcion}</p> : null}
    </div>
  );
}

const CAMPOS_DE_DETALLE: CampoSerie[] = ['rir', 'miniReps', 'miniKg'];

// Una fila con el RIR o una técnica ya anotados arranca con "Más detalles" abierto.
const tieneDetalles = (fila: FilaSerie) => fila.rir.trim() !== '' || fila.tipoSerie !== 'normal';

// Cada serie es una tarjeta: "Serie N" y "Quitar" arriba; Repeticiones y Peso (kg) grandes; en el modo
// sencillo el RIR y la técnica van en "Más detalles", y en el avanzado quedan a la vista.
export function EditorSeries({
  tipo,
  filas,
  onCambio,
  avanzado = false,
  errores = [],
}: {
  tipo: TipoEjercicio;
  filas: FilaSerie[];
  onCambio: (filas: FilaSerie[]) => void;
  avanzado?: boolean;
  errores?: ErrorSerie[];
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

  return (
    <fieldset className="space-y-3" data-guia="series">
      <legend className="sr-only">Series</legend>
      {filas.map((fila, indice) => {
        const numero = indice + 1;
        const esAproximacion = fila.tipoSerie === 'aproximacion';
        const errorDe = (campo: CampoSerie) =>
          errores.find((error) => error.indice === indice && error.campo === campo)?.mensaje;
        const conErrorEnDetalles = CAMPOS_DE_DETALLE.some((campo) => errorDe(campo));
        const verDetalles = avanzado || abiertas.has(indice) || conErrorEnDetalles;
        const idDetalles = `${idEditor}-detalles-${numero}`;
        const etiquetaRir = avanzado ? 'RIR' : 'Repeticiones que te quedaron';

        const detalles = (
          <div className="space-y-3">
            <div className={avanzado ? '' : 'max-w-xs'} data-guia={indice === 0 ? 'serie-rir' : undefined}>
              <Campo
                etiqueta={etiquetaRir}
                junto={<Termino id="rir">{null}</Termino>}
                type="number"
                inputMode="numeric"
                min={0}
                max={10}
                step={1}
                value={fila.rir}
                onChange={(evento) => cambiar(indice, { rir: evento.target.value })}
                className="tabular-nums"
                aria-label={`${etiquetaRir} en la serie ${numero} (opcional)`}
                error={errorDe('rir')}
                ayuda={avanzado ? undefined : 'Opcional.'}
              />
            </div>
            <DetallesSerie
              tipo={tipo}
              fila={fila}
              numero={numero}
              avanzado={avanzado}
              guia={indice === 0}
              errorDe={errorDe}
              onCambio={(cambios) => cambiar(indice, cambios)}
            />
          </div>
        );

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
              <Boton
                variante="fantasma"
                disabled={filas.length === 1}
                aria-label={`Quitar serie ${numero}`}
                onClick={() => quitar(indice)}
              >
                Quitar
              </Boton>
            </div>
            <div className={`grid items-start gap-3 ${tipo === 'peso' ? 'grid-cols-2' : 'grid-cols-1 sm:max-w-xs'}`}>
              <Campo
                etiqueta="Repeticiones"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={fila.reps}
                onChange={(evento) => cambiar(indice, { reps: evento.target.value })}
                className="text-lg tabular-nums"
                aria-label={`Repeticiones de la serie ${numero}`}
                error={errorDe('reps')}
              />
              {tipo === 'peso' ? (
                <Campo
                  etiqueta="Peso (kg)"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={fila.kg}
                  onChange={(evento) => cambiar(indice, { kg: evento.target.value })}
                  className="text-lg tabular-nums"
                  aria-label={`Peso en kilos de la serie ${numero}`}
                  error={errorDe('kg')}
                />
              ) : null}
            </div>
            {avanzado ? (
              detalles
            ) : (
              <div>
                <button
                  type="button"
                  aria-expanded={verDetalles}
                  aria-controls={idDetalles}
                  onClick={() => alternar(indice)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-gym px-1 text-sm font-medium text-primario underline-offset-4 hover:underline"
                >
                  <span aria-hidden="true">{verDetalles ? '▾' : '▸'}</span> Más detalles
                  <span className="sr-only"> de la serie {numero}</span>
                </button>
                <div id={idDetalles} hidden={!verDetalles} className="mt-2">
                  {detalles}
                </div>
              </div>
            )}
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
  const formulario = useRef<HTMLFormElement>(null);
  const [filas, setFilas] = useState(() =>
    pesosPlanKg && pesosPlanKg.length > 0
      ? filasDesdePesos(pesosPlanKg, etiquetas)
      : filasIniciales(cantidadSeries, pesoInicialKg),
  );
  const [fecha, setFecha] = useState(fechaMaxima ?? '');
  const [errorFecha, setErrorFecha] = useState('');
  const [errores, setErrores] = useState<ErrorSerie[]>([]);
  const [intento, setIntento] = useState(0);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [logro, setLogro] = useState<LogroMeta | null>(null);

  // Tras un envío con errores, el foco va al primer campo marcado.
  useEffect(() => {
    if (intento > 0) enfocarPrimerError(formulario.current);
  }, [intento]);

  const irAlDestino = useCallback(() => {
    router.push(destino as Route);
    router.refresh();
  }, [router, destino]);

  const cambiarFilas = (nuevas: FilaSerie[]) => {
    setErrores((actuales) => erroresVigentes(actuales, filas, nuevas));
    setFilas(nuevas);
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');

    const encontrados = validarFilas(filas, tipo, avanzado);
    const fechaMala = Boolean(fechaMaxima && fecha > fechaMaxima);
    setErrores(encontrados);
    setErrorFecha(fechaMala ? 'La fecha no puede ser futura: elige hoy o un día anterior.' : '');
    if (encontrados.length > 0 || fechaMala) {
      setIntento((valor) => valor + 1);
      return;
    }

    let series: SerieKg[];
    try {
      series = leerSeries(filas, tipo);
    } catch (causa) {
      setError(causa instanceof ErrorDeNegocio ? causa.message : 'Revisa las series: cada una necesita sus repeticiones.');
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

  const cantidadErrores = errores.length + (errorFecha ? 1 : 0);

  return (
    <form ref={formulario} onSubmit={enviar} className="space-y-4" noValidate>
      {logro ? <ModalMetaAlcanzada logros={[logro]} onCerrar={irAlDestino} avanzado={avanzado} /> : null}

      {fechaMaxima ? (
        <Campo
          etiqueta="Fecha"
          type="date"
          max={fechaMaxima}
          value={fecha}
          onChange={(evento) => {
            setFecha(evento.target.value);
            setErrorFecha('');
          }}
          error={errorFecha || undefined}
        />
      ) : null}

      <EditorSeries tipo={tipo} filas={filas} onCambio={cambiarFilas} avanzado={avanzado} errores={errores} />

      {/* Resumen para lectores de pantalla; cada mensaje está junto a su campo. */}
      <p role="status" className="text-sm font-medium text-red-700">
        {cantidadErrores > 0
          ? cantidadErrores === 1
            ? 'Falta corregir 1 dato: está marcado en rojo.'
            : `Faltan corregir ${cantidadErrores} datos: están marcados en rojo.`
          : ''}
      </p>
      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto" data-guia="series-guardar">
        {textoBoton}
      </Boton>
    </form>
  );
}
