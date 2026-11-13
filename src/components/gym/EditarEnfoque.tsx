'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';
import { SelectorEnfoque, SelectorMetodo } from '@/components/gym/FormularioEjercicio';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { CLASES_OPCION_MENU } from '@/components/ui/MenuMasOpciones';
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
  avanzado = false,
}: {
  id: string;
  tipo: TipoEjercicio;
  enfoqueActual: Enfoque;
  metodoActual: Metodo;
  rangoActual: [number, number];
  avanzado?: boolean;
}) {
  const etiqueta = avanzado ? 'Enfoque, método y rango' : 'Cambiar objetivo y repeticiones';
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
      {/* Opción del menú "Más opciones" del detalle. */}
      <button type="button" role="menuitem" tabIndex={-1} className={CLASES_OPCION_MENU} onClick={() => setAbierto(true)}>
        {etiqueta}
      </button>

      {abierto ? (
        <Modal titulo={etiqueta} onCerrar={cerrar}>
          <form onSubmit={guardar} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" noValidate>
            <SelectorEnfoque tipo={tipo} enfoque={enfoque} onCambio={cambiarEnfoque} apilado avanzado={avanzado} />
            {avanzado ? (
              <SelectorMetodo tipo={tipo} metodo={metodo} onCambio={setMetodo} avanzado />
            ) : (
              <details className="rounded-gym border border-borde px-3 py-2">
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-texto">
                  Cómo repartes el peso (opcional)
                </summary>
                <div className="mt-2">
                  <SelectorMetodo tipo={tipo} metodo={metodo} onCambio={setMetodo} />
                </div>
              </details>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Campo
                etiqueta={avanzado ? 'Rango mínimo' : 'Repeticiones mínimas'}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={rangoMin}
                onChange={(evento) => setRangoMin(evento.target.value)}
              />
              <Campo
                etiqueta={avanzado ? 'Rango máximo' : 'Repeticiones máximas'}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={rangoMax}
                onChange={(evento) => setRangoMax(evento.target.value)}
              />
            </div>
            <p className="text-sm text-texto-suave">
              Deja margen entre el mínimo y el máximo: primero subes repeticiones y, al llegar al máximo, subes el
              peso.
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
