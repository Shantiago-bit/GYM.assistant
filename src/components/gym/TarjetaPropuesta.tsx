import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import type { PropuestaVista } from '@/lib/chat/propuestas';

const TEXTO_CONFIRMAR: Record<PropuestaVista['accion'], string> = {
  crear: 'Confirmar y crear',
  modificar: 'Confirmar cambios',
  archivar: 'Confirmar y eliminar',
};

// Ningún cambio propuesto por CHRONO se aplica sin que la persona pulse Confirmar aquí.
export function TarjetaPropuesta({
  propuesta,
  deshabilitada,
  alConfirmar,
  alCancelar,
}: {
  propuesta: PropuestaVista;
  deshabilitada: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}) {
  const decidible = propuesta.estado === 'pendiente' || propuesta.estado === 'error';

  return (
    <div
      role="group"
      aria-label={propuesta.titulo}
      className="w-full max-w-md rounded-gym border-2 border-primario bg-superficie p-3.5 text-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-primario">Propuesta de CHRONO</p>
      <p className="mt-1 font-semibold text-texto">{propuesta.titulo}</p>
      <ul className="mt-2 space-y-0.5 text-texto-suave">
        {propuesta.detalle.map((linea) => (
          <li key={linea}>{linea}</li>
        ))}
      </ul>

      {propuesta.estado === 'error' && propuesta.error ? (
        <div className="mt-3">
          <Aviso tipo="error">{propuesta.error}</Aviso>
        </div>
      ) : null}

      {decidible ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Boton
            variante={propuesta.accion === 'archivar' ? 'peligro' : 'primario'}
            disabled={deshabilitada}
            onClick={alConfirmar}
          >
            {TEXTO_CONFIRMAR[propuesta.accion]}
          </Boton>
          <Boton variante="secundario" disabled={deshabilitada} onClick={alCancelar}>
            Cancelar
          </Boton>
        </div>
      ) : propuesta.estado === 'aplicando' ? (
        <p className="mt-3 text-texto-suave" role="status">
          Aplicando…
        </p>
      ) : propuesta.estado === 'confirmada' ? (
        <p className="mt-3 font-semibold text-emerald-700">✅ Confirmado</p>
      ) : (
        <p className="mt-3 text-texto-suave">Cancelada: no se hizo ningún cambio.</p>
      )}
    </div>
  );
}
