'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { kgAGramos } from '@/lib/formato';
import { enviarJson } from '@/lib/http/cliente';
import {
  ENFOQUES,
  rangoPorTipo,
  validarEjercicio,
  type Enfoque,
  type TipoEjercicio,
} from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaEjercicio } from '@/lib/validacion/esquemas';

const aNumero = (texto: string) => (texto.trim() === '' ? undefined : Number(texto));

// Tarjetas seleccionables: cada enfoque muestra su descripción y el rango que sugiere.
export function SelectorEnfoque({
  tipo,
  enfoque,
  onCambio,
  apilado = false,
}: {
  tipo: TipoEjercicio;
  enfoque: Enfoque;
  onCambio: (enfoque: Enfoque) => void;
  apilado?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-texto">Enfoque</legend>
      <div className={`grid gap-2 ${apilado ? '' : 'sm:grid-cols-3'}`}>
        {ENFOQUES.map((opcion) => {
          const [min, max] = rangoPorTipo(tipo, opcion.valor);
          const activo = opcion.valor === enfoque;

          return (
            <label
              key={opcion.valor}
              className={`cursor-pointer rounded-gym border p-3 transition focus-within:ring-2 focus-within:ring-primario-suave ${
                activo ? 'border-primario bg-primario-suave' : 'border-borde bg-superficie hover:border-primario'
              }`}
            >
              <input
                type="radio"
                name="enfoque"
                value={opcion.valor}
                checked={activo}
                onChange={() => onCambio(opcion.valor)}
                className="sr-only"
              />
              <span className="block text-sm font-semibold text-texto">{opcion.texto}</span>
              <span className="block text-xs tabular-nums text-texto-suave">
                {min}–{max} reps · {opcion.descripcion}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FormularioEjercicio() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoEjercicio>('peso');
  const [enfoque, setEnfoque] = useState<Enfoque>('hipertrofia');
  const [pesoRefKg, setPesoRefKg] = useState('');
  const [nivel, setNivel] = useState('');
  const [rangoMin, setRangoMin] = useState(String(rangoPorTipo('peso')[0]));
  const [rangoMax, setRangoMax] = useState(String(rangoPorTipo('peso')[1]));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Cambiar el tipo o el enfoque aplica el rango sugerido; después se puede ajustar a mano.
  const aplicarRango = (nuevoTipo: TipoEjercicio, nuevoEnfoque: Enfoque) => {
    const [min, max] = rangoPorTipo(nuevoTipo, nuevoEnfoque);
    setTipo(nuevoTipo);
    setEnfoque(nuevoEnfoque);
    setRangoMin(String(min));
    setRangoMax(String(max));
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');

    const validacion = esquemaEjercicio.safeParse({
      nombre,
      tipo,
      enfoque,
      pesoRefKg: tipo === 'peso' ? aNumero(pesoRefKg) : undefined,
      nivel: tipo === 'calistenia' ? nivel : undefined,
      rangoMin: aNumero(rangoMin),
      rangoMax: aNumero(rangoMax),
    });

    if (!validacion.success) {
      setError(validacion.error.issues[0]?.message ?? 'Revise los datos ingresados.');
      return;
    }

    const datos = validacion.data;

    try {
      validarEjercicio({
        nombre: datos.nombre,
        tipo: datos.tipo,
        pesoRefGramos: datos.pesoRefKg === undefined ? null : kgAGramos(datos.pesoRefKg),
        ...(datos.rangoMin === undefined ? {} : { rangoMin: datos.rangoMin }),
        ...(datos.rangoMax === undefined ? {} : { rangoMax: datos.rangoMax }),
      });
    } catch (causa) {
      setError(causa instanceof ErrorDeNegocio ? causa.message : 'Revise los datos ingresados.');
      return;
    }

    setGuardando(true);
    const respuesta = await enviarJson<{ id: string }>('/api/gym/ejercicios', datos);

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      setGuardando(false);
      return;
    }

    router.push(`/gym/ejercicios/${respuesta.datos.id}/prueba`);
    router.refresh();
  };

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <Campo
        etiqueta="Nombre"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
        maxLength={120}
        required
      />

      <Selector
        etiqueta="Tipo"
        value={tipo}
        onChange={(evento) => aplicarRango(evento.target.value as TipoEjercicio, enfoque)}
        opciones={[
          { valor: 'peso', texto: 'Peso' },
          { valor: 'calistenia', texto: 'Calistenia' },
        ]}
      />

      <SelectorEnfoque
        tipo={tipo}
        enfoque={enfoque}
        onCambio={(nuevoEnfoque) => aplicarRango(tipo, nuevoEnfoque)}
      />

      {tipo === 'peso' ? (
        <Campo
          etiqueta="Peso de referencia inicial (kg)"
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={pesoRefKg}
          onChange={(evento) => setPesoRefKg(evento.target.value)}
          required
        />
      ) : (
        <Campo
          etiqueta="Nivel o variante"
          value={nivel}
          onChange={(evento) => setNivel(evento.target.value)}
          maxLength={80}
          ayuda="Opcional. Por ejemplo, dominada estricta."
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Rango mínimo (reps)"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={rangoMin}
          onChange={(evento) => setRangoMin(evento.target.value)}
        />
        <Campo
          etiqueta="Rango máximo (reps)"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={rangoMax}
          onChange={(evento) => setRangoMax(evento.target.value)}
        />
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      <Boton type="submit" cargando={guardando} className="w-full sm:w-auto">
        Guardar ejercicio
      </Boton>
    </form>
  );
}
