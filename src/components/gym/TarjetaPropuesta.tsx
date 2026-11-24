import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Icono, type NombreIcono } from '@/components/ui/Icono';
import { SimboloChrono } from '@/components/marca/SimboloChrono';
import type { PropuestaVista } from '@/lib/chat/propuestas';

type Accion = PropuestaVista['accion'];

const TEXTO_CONFIRMAR: Record<Accion, string> = {
  crear: 'Confirmar y crear',
  modificar: 'Confirmar cambios',
  archivar: 'Confirmar y archivar',
  restaurar: 'Confirmar y restaurar',
};

// Un ícono y un color por tipo de acción: crear (lavanda), modificar (azul de calistenia), archivar (ámbar) y
// restaurar (verde de subir). El color va en el borde y el ícono; el texto conserva su contraste.
const ESTILO: Record<Accion, { icono: NombreIcono; etiqueta: string; hecho: string; borde: string; color: string }> = {
  crear: { icono: 'mancuerna', etiqueta: 'Crear ejercicio', hecho: 'Creado', borde: 'border-lavanda', color: 'text-primario' },
  modificar: { icono: 'lapiz', etiqueta: 'Modificar ejercicio', hecho: 'Modificado', borde: 'border-calistenia', color: 'text-calistenia' },
  archivar: { icono: 'archivo', etiqueta: 'Archivar ejercicio', hecho: 'Archivado', borde: 'border-aviso', color: 'text-aviso' },
  restaurar: { icono: 'restaurar', etiqueta: 'Restaurar ejercicio', hecho: 'Restaurado', borde: 'border-subir', color: 'text-subir' },
};

// "Enfoque: Fuerza → Hipertrofia" se muestra como antes → después; las demás líneas, tal cual.
export function partirCambio(linea: string): { etiqueta: string; antes: string; despues: string } | null {
  const separador = linea.indexOf(': ');
  if (separador < 0 || !linea.includes(' → ')) return null;
  const [antes, despues] = linea.slice(separador + 2).split(' → ');
  if (!antes || !despues) return null;
  return { etiqueta: linea.slice(0, separador), antes, despues };
}

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
  const estilo = ESTILO[propuesta.accion];
  const decidible = propuesta.estado === 'pendiente' || propuesta.estado === 'error';
  const respondida = propuesta.estado === 'confirmada' || propuesta.estado === 'cancelada';

  // Ya respondida: la tarjeta queda compacta, con un chip de estado.
  if (respondida) {
    const confirmada = propuesta.estado === 'confirmada';
    return (
      <div role="group" aria-label={propuesta.titulo} data-estado={propuesta.estado} className={`flex w-full max-w-md items-center gap-3 rounded-gym border border-l-4 border-borde ${estilo.borde} bg-superficie px-3.5 py-2.5 text-sm`}>
        <Icono nombre={estilo.icono} className={`h-5 w-5 shrink-0 ${estilo.color}`} />
        <p className="min-w-0 flex-1 truncate font-medium text-texto">{propuesta.titulo}</p>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ${confirmada ? 'bg-exito-suave text-exito' : 'bg-primario-suave text-texto-suave'}`}>
          {confirmada ? (
            <>
              {estilo.hecho} <Icono nombre="check" className="h-4 w-4" />
            </>
          ) : (
            'Cancelado'
          )}
        </span>
      </div>
    );
  }

  const cambios = propuesta.detalle.map((linea) => ({ linea, cambio: partirCambio(linea) }));

  return (
    <div role="group" aria-label={propuesta.titulo} data-estado={propuesta.estado} className={`tarjeta-propuesta w-full max-w-md rounded-tarjeta border border-l-4 border-borde ${estilo.borde} bg-superficie p-4 text-base shadow-suave`}>
      <p className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wide ${estilo.color}`}>
        <Icono nombre={estilo.icono} className="h-5 w-5 shrink-0" />
        {estilo.etiqueta}
        <span className="ml-auto inline-flex items-center gap-1 text-texto-suave normal-case tracking-normal">
          <SimboloChrono variante="mono" tamano={16} className="shrink-0" />
          Propuesta de CHRONO
        </span>
      </p>
      <p className="mt-2 font-semibold text-texto">{propuesta.titulo}</p>
      <ul className="mt-2 space-y-1.5 text-texto-suave">
        {cambios.map(({ linea, cambio }) =>
          cambio ? (
            <li key={linea} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm">{cambio.etiqueta}:</span>
              <span>{cambio.antes}</span>
              <Icono nombre="flechaDerecha" className="h-4 w-4 self-center text-texto-suave" />
              <span className="sr-only">pasa a</span>
              <span className="font-semibold text-texto">{cambio.despues}</span>
            </li>
          ) : (
            <li key={linea}>{linea}</li>
          ),
        )}
      </ul>

      {propuesta.estado === 'error' && propuesta.error ? (
        <div className="mt-3">
          <Aviso tipo="error">{propuesta.error}</Aviso>
        </div>
      ) : null}

      {decidible ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Boton disabled={deshabilitada} onClick={alConfirmar} className="min-h-12 w-full">
            {TEXTO_CONFIRMAR[propuesta.accion]}
          </Boton>
          <Boton variante="secundario" disabled={deshabilitada} onClick={alCancelar} className="min-h-12 w-full">
            Cancelar
          </Boton>
        </div>
      ) : (
        <p className="mt-3 text-texto-suave" role="status">
          Aplicando…
        </p>
      )}
    </div>
  );
}
