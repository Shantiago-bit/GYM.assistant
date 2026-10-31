'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import type { SerieKg } from '@/lib/datos/tipos';
import { kgAGramos } from '@/lib/formato';
import { enviarJson } from '@/lib/http/cliente';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { validarSesion } from '@/lib/reglas/sesion';
import { esquemaSeries } from '@/lib/validacion/esquemas';

export interface FilaSerie {
  reps: string;
  kg: string;
}

export function filasIniciales(cantidad: number, pesoKg: number | null): FilaSerie[] {
  return Array.from({ length: cantidad }, () => ({
    reps: '',
    kg: pesoKg === null ? '' : String(pesoKg),
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
    })),
  );

  if (!validacion.success) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', validacion.error.issues[0]?.message);
  }

  validarSesion(
    validacion.data.map((serie) => ({
      reps: serie.reps,
      pesoGramos: serie.pesoKg === undefined ? null : kgAGramos(serie.pesoKg),
    })),
    tipo,
  );

  return validacion.data;
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
  const cambiar = (indice: number, campo: keyof FilaSerie, valor: string) => {
    onCambio(filas.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)));
  };

  const agregar = () => {
    onCambio([...filas, { reps: '', kg: filas.at(-1)?.kg ?? '' }]);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Series</legend>
      {filas.map((fila, indice) => (
        <div key={indice} className="flex items-end gap-2">
          <span className="w-16 shrink-0 pb-3 text-sm font-medium text-texto-suave">
            Serie {indice + 1}
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
          <Boton
            variante="fantasma"
            disabled={filas.length === 1}
            aria-label={`Quitar serie ${indice + 1}`}
            onClick={() => onCambio(filas.filter((_, i) => i !== indice))}
          >
            Quitar
          </Boton>
        </div>
      ))}
      <Boton variante="secundario" onClick={agregar}>
        Agregar serie
      </Boton>
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
  fechaMaxima?: string;
}

export function FormularioSeries({
  tipo,
  urlEnvio,
  destino,
  textoBoton,
  pesoInicialKg,
  cantidadSeries = 3,
  fechaMaxima,
}: PropiedadesFormulario) {
  const router = useRouter();
  const [filas, setFilas] = useState(() => filasIniciales(cantidadSeries, pesoInicialKg));
  const [fecha, setFecha] = useState(fechaMaxima ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

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
    const respuesta = await enviarJson(urlEnvio, {
      series,
      ...(fechaMaxima && fecha ? { fecha } : {}),
    });

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      setGuardando(false);
      return;
    }

    router.push(destino as Route);
    router.refresh();
  };

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
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

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto">
        {textoBoton}
      </Boton>
    </form>
  );
}
