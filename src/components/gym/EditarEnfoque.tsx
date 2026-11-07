'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';
import { SelectorEnfoque, SelectorMetodo } from '@/components/gym/FormularioEjercicio';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { enviarJson } from '@/lib/http/cliente';
import { rangoPorTipo, type Enfoque, type TipoEjercicio } from '@/lib/reglas/ejercicio';
import type { Metodo } from '@/lib/reglas/metodos';
import { esquemaEnfoque } from '@/lib/validacion/esquemas';

export function EditarEnfoque({
  id,
  tipo,
  enfoqueActual,
  metodoActual,
  rangoActual,
}: {
  id: string;
  tipo: TipoEjercicio;
  enfoqueActual: Enfoque;
  metodoActual: Metodo;
  rangoActual: [number, number];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enfoque, setEnfoque] = useState(enfoqueActual);
  const [metodo, setMetodo] = useState(metodoActual);
  const [rangoMin, setRangoMin] = useState(String(rangoActual[0]));
  const [rangoMax, setRangoMax] = useState(String(rangoActual[1]));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const cerrar = useCallback(() => setAbierto(false), []);

  const cambiarEnfoque = (nuevo: Enfoque) => {
    const [min, max] = rangoPorTipo(tipo, nuevo);
    setEnfoque(nuevo);
    setRangoMin(String(min));
    setRangoMax(String(max));
  };

  const guardar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setError('');

    const validacion = esquemaEnfoque.safeParse({
      enfoque,
      metodo,
      rangoMin: rangoMin.trim() === '' ? undefined : Number(rangoMin),
      rangoMax: rangoMax.trim() === '' ? undefined : Number(rangoMax),
    });

    if (!validacion.success) {
      setError(validacion.error.issues[0]?.message ?? 'Revise los datos ingresados.');
      return;
    }

    setGuardando(true);
    const respuesta = await enviarJson(`/api/gym/ejercicios/${id}/enfoque`, validacion.data);
    setGuardando(false);

    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      return;
    }

    setAbierto(false);
    router.refresh();
  };

  return (
    <>
      <Boton variante="secundario" onClick={() => setAbierto(true)}>
        Enfoque y método
      </Boton>

      {abierto ? (
        <Modal titulo="Enfoque, método y rango" onCerrar={cerrar}>
          <form onSubmit={guardar} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" noValidate>
            <SelectorEnfoque tipo={tipo} enfoque={enfoque} onCambio={cambiarEnfoque} apilado />
            <SelectorMetodo tipo={tipo} metodo={metodo} onCambio={setMetodo} />
            <div className="grid grid-cols-2 gap-3">
              <Campo
                etiqueta="Rango mínimo"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={rangoMin}
                onChange={(evento) => setRangoMin(evento.target.value)}
              />
              <Campo
                etiqueta="Rango máximo"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={rangoMax}
                onChange={(evento) => setRangoMax(evento.target.value)}
              />
            </div>
            <p className="text-sm text-texto-suave">
              Deja margen entre el mínimo y el máximo: la doble progresión necesita repeticiones que subir antes de
              aumentar el peso.
            </p>
            {error ? <Aviso tipo="error">{error}</Aviso> : null}
            <div className="flex justify-end gap-2">
              <Boton variante="secundario" onClick={cerrar}>
                Cancelar
              </Boton>
              <Boton type="submit" cargando={guardando}>
                Guardar
              </Boton>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
