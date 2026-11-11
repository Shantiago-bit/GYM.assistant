'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';
import { ModalMetaAlcanzada } from '@/components/gym/ModalMetaAlcanzada';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import type { LogroMeta, SerieKg } from '@/lib/datos/tipos';
import { kgAGramos } from '@/lib/formato';
import { enviarJson } from '@/lib/http/cliente';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { validarSesion } from '@/lib/reglas/sesion';
import { admiteExtras, leerListaNumeros, TIPOS_SERIE, type TipoSerie } from '@/lib/reglas/tecnicas';
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
  if (filas.some((fila) => fila.reps.trim() === '')) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Completa las repeticiones de todas las series.');
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

export function EditorSeries({
  tipo,
  filas,
  onCambio,
}: {
  tipo: TipoEjercicio;
  filas: FilaSerie[];
  onCambio: (filas: FilaSerie[]) => void;
}) {
  const cambiar = (indice: number, cambios: Partial<FilaSerie>) => {
    onCambio(filas.map((fila, i) => (i === indice ? { ...fila, ...cambios } : fila)));
  };

  const agregar = () => {
    onCambio([...filas, filaVacia(filas.at(-1)?.kg ?? '')]);
  };

  const agregarAproximacion = () => {
    const primera = filas.find((fila) => fila.tipoSerie !== 'aproximacion');
    const aproximacion: FilaSerie = {
      ...filaVacia(tipo === 'peso' ? pesoAproximacion(primera?.kg ?? '') : '', 'Calentamiento'),
      tipoSerie: 'aproximacion',
    };
    onCambio([aproximacion, ...filas]);
  };

  return (
    <fieldset className="space-y-3" data-guia="series">
      <legend className="sr-only">Series</legend>
      {filas.map((fila, indice) => {
        const esAproximacion = fila.tipoSerie === 'aproximacion';
        const conExtras = admiteExtras(fila.tipoSerie);
        const descripcion = TIPOS_SERIE.find((opcion) => opcion.valor === fila.tipoSerie)?.descripcion;

        return (
          <div
            key={indice}
            className={`space-y-2 rounded-gym ${esAproximacion ? 'border border-dashed border-borde bg-fondo p-2' : ''}`}
          >
            <div className="flex items-end gap-2">
              <span className="w-14 shrink-0 pb-2 text-sm font-medium leading-tight text-texto-suave">
                Serie {indice + 1}
                {fila.etiqueta ? (
                  <span className="block truncate text-xs font-normal">{fila.etiqueta}</span>
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <Campo
                  etiqueta="Reps"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={fila.reps}
                  onChange={(evento) => cambiar(indice, { reps: evento.target.value })}
                  className="tabular-nums"
                />
              </div>
              {tipo === 'peso' ? (
                <div className="min-w-0 flex-1">
                  <Campo
                    etiqueta="Kg"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={fila.kg}
                    onChange={(evento) => cambiar(indice, { kg: evento.target.value })}
                    className="tabular-nums"
                  />
                </div>
              ) : null}
              <div className="w-16 shrink-0" data-guia={indice === 0 ? 'serie-rir' : undefined}>
                <Campo
                  etiqueta="RIR"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  step={1}
                  placeholder="—"
                  value={fila.rir}
                  onChange={(evento) => cambiar(indice, { rir: evento.target.value })}
                  className="tabular-nums"
                  aria-label={`RIR de la serie ${indice + 1} (opcional)`}
                />
              </div>
              <Boton
                variante="fantasma"
                disabled={filas.length === 1}
                aria-label={`Quitar serie ${indice + 1}`}
                onClick={() => onCambio(filas.filter((_, i) => i !== indice))}
                className="!px-3"
              >
                <span aria-hidden="true">✕</span>
              </Boton>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:pl-16">
              <label
                className="flex items-center gap-2 text-xs text-texto-suave"
                data-guia={indice === 0 ? 'serie-tecnica' : undefined}
              >
                Técnica
                <select
                  value={fila.tipoSerie}
                  onChange={(evento) => cambiar(indice, { tipoSerie: evento.target.value as TipoSerie })}
                  className="min-h-9 rounded-gym border border-borde bg-superficie px-2 py-1 text-sm text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
                  aria-label={`Técnica de la serie ${indice + 1}`}
                >
                  {TIPOS_SERIE.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.texto}
                    </option>
                  ))}
                </select>
              </label>
              {conExtras ? (
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-texto-suave">
                  {fila.tipoSerie === 'drop_set' ? 'Reps de cada bajada' : 'Mini series'}
                  <input
                    value={fila.miniReps}
                    onChange={(evento) => cambiar(indice, { miniReps: evento.target.value })}
                    placeholder="3 2 2"
                    inputMode="numeric"
                    className="min-h-9 w-24 min-w-0 flex-1 rounded-gym border border-borde bg-superficie px-2 py-1 text-sm tabular-nums text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
                  />
                </label>
              ) : null}
              {fila.tipoSerie === 'drop_set' && tipo === 'peso' ? (
                <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-texto-suave">
                  Kg de cada bajada
                  <input
                    value={fila.miniKg}
                    onChange={(evento) => cambiar(indice, { miniKg: evento.target.value })}
                    placeholder="40 30"
                    inputMode="decimal"
                    className="min-h-9 w-24 min-w-0 flex-1 rounded-gym border border-borde bg-superficie px-2 py-1 text-sm tabular-nums text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
                  />
                </label>
              ) : null}
              {fila.tipoSerie !== 'normal' && descripcion ? (
                <p className="w-full text-xs text-texto-suave">{descripcion}</p>
              ) : null}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2" data-guia="series-agregar">
        <Boton variante="secundario" onClick={agregar}>
          Agregar serie
        </Boton>
        <Boton variante="fantasma" onClick={agregarAproximacion}>
          + Aproximación
        </Boton>
      </div>
      <details className="rounded-gym border border-borde bg-fondo px-3 py-2 text-sm text-texto-suave">
        <summary className="cursor-pointer font-medium text-texto">¿Qué son el RIR y las técnicas?</summary>
        <p className="mt-2">
          <strong className="text-texto">RIR</strong>: repeticiones en reserva, cuántas más podrías haber hecho con
          buena técnica (0 es el fallo). Es opcional; si llegas al tope del rango con 3 o más en reserva, la app
          sugiere un salto de peso doble.
        </p>
        <p className="mt-2">
          <strong className="text-texto">Técnicas</strong>: en rest-pause, myo-reps y drop set, anota en
          &quot;Reps&quot; la serie principal y en &quot;Mini series&quot; las que siguen. La meta del rango se mide
          con la serie principal; las mini series suman al volumen. Las series de aproximación no cuentan para
          nada salvo el histórico.
        </p>
      </details>
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
      setError(causa instanceof ErrorDeNegocio ? causa.message : 'Revise los datos ingresados.');
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
      {logro ? <ModalMetaAlcanzada logros={[logro]} onCerrar={irAlDestino} /> : null}

      {fechaMaxima ? (
        <Campo
          etiqueta="Fecha"
          type="date"
          max={fechaMaxima}
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
        />
      ) : null}

      <EditorSeries tipo={tipo} filas={filas} onCambio={setFilas} />

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto" data-guia="series-guardar">
        {textoBoton}
      </Boton>
    </form>
  );
}
