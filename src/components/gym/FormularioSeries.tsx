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
import { esquemaSeries } from '@/lib/validacion/esquemas';

export interface FilaSerie {
  reps: string;
  kg: string;
  rir: string;
}

export function filasIniciales(cantidad: number, pesoKg: number | null): FilaSerie[] {
  return filasDesdePesos(Array.from({ length: cantidad }, () => pesoKg));
}

// Una fila por serie con el peso que propone el plan del método.
export function filasDesdePesos(pesosKg: (number | null)[]): FilaSerie[] {
  return pesosKg.map((pesoKg) => ({
    reps: '',
    kg: pesoKg === null ? '' : String(pesoKg),
    rir: '',
  }));
}

// Convierte las filas del formulario en series válidas, o lanza el mensaje para el usuario.
export function leerSeries(filas: FilaSerie[], tipo: TipoEjercicio): SerieKg[] {
  if (filas.some((fila) => fila.reps.trim() === '')) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Completa las repeticiones de todas las series.');
  }

  const validacion = esquemaSeries.safeParse(
    filas.map((fila) => ({
      reps: Number(fila.reps),
      pesoKg: tipo === 'peso' && fila.kg.trim() !== '' ? Number(fila.kg) : undefined,
      rir: fila.rir.trim() === '' ? undefined : Number(fila.rir),
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
    })),
    tipo,
  );

  return validacion.data;
}

export function EditorSeries({
  tipo,
  filas,
  onCambio,
  etiquetas = [],
}: {
  tipo: TipoEjercicio;
  filas: FilaSerie[];
  onCambio: (filas: FilaSerie[]) => void;
  etiquetas?: string[];
}) {
  const cambiar = (indice: number, campo: keyof FilaSerie, valor: string) => {
    onCambio(filas.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)));
  };

  const agregar = () => {
    onCambio([...filas, { reps: '', kg: filas.at(-1)?.kg ?? '', rir: '' }]);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Series</legend>
      {filas.map((fila, indice) => (
        <div key={indice} className="flex items-end gap-2">
          <span className="w-14 shrink-0 pb-2 text-sm font-medium leading-tight text-texto-suave">
            Serie {indice + 1}
            {etiquetas[indice] ? (
              <span className="block truncate text-xs font-normal">{etiquetas[indice]}</span>
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
              onChange={(evento) => cambiar(indice, 'reps', evento.target.value)}
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
                onChange={(evento) => cambiar(indice, 'kg', evento.target.value)}
                className="tabular-nums"
              />
            </div>
          ) : null}
          <div className="w-16 shrink-0">
            <Campo
              etiqueta="RIR"
              type="number"
              inputMode="numeric"
              min={0}
              max={10}
              step={1}
              placeholder="—"
              value={fila.rir}
              onChange={(evento) => cambiar(indice, 'rir', evento.target.value)}
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
      ))}
      <Boton variante="secundario" onClick={agregar}>
        Agregar serie
      </Boton>
      <details className="rounded-gym border border-borde bg-fondo px-3 py-2 text-sm text-texto-suave">
        <summary className="cursor-pointer font-medium text-texto">¿Qué es el RIR?</summary>
        <p className="mt-2">
          Repeticiones en reserva: cuántas más podrías haber hecho con buena técnica. 0 es el fallo; 2 es que
          te sobraban dos. Es opcional, pero mejora la recomendación: si llegas al tope del rango con 3 o más en
          reserva en todas las series, la app sugiere un salto de peso doble.
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
      ? filasDesdePesos(pesosPlanKg)
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

      <EditorSeries tipo={tipo} filas={filas} onCambio={setFilas} etiquetas={etiquetas ?? []} />

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto">
        {textoBoton}
      </Boton>
    </form>
  );
}
