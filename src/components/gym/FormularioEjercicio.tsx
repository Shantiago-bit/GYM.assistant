'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Selector } from '@/components/ui/Selector';
import { kgAGramos } from '@/lib/formato';
import { enviarJson } from '@/lib/http/cliente';
import { rangoPorTipo, validarEjercicio, type TipoEjercicio } from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaEjercicio } from '@/lib/validacion/esquemas';

const aNumero = (texto: string) => (texto.trim() === '' ? undefined : Number(texto));

export function FormularioEjercicio() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoEjercicio>('peso');
  const [pesoRefKg, setPesoRefKg] = useState('');
  const [nivel, setNivel] = useState('');
  const [rangoMin, setRangoMin] = useState(String(rangoPorTipo('peso')[0]));
  const [rangoMax, setRangoMax] = useState(String(rangoPorTipo('peso')[1]));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cambiarTipo = (nuevoTipo: TipoEjercicio) => {
    const [min, max] = rangoPorTipo(nuevoTipo);
    setTipo(nuevoTipo);
    setRangoMin(String(min));
    setRangoMax(String(max));
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');

    const validacion = esquemaEjercicio.safeParse({
      nombre,
      tipo,
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
        onChange={(evento) => cambiarTipo(evento.target.value as TipoEjercicio)}
        opciones={[
          { valor: 'peso', texto: 'Peso' },
          { valor: 'calistenia', texto: 'Calistenia' },
        ]}
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
