'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { CLASES_CONTROL } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { enviarJson } from '@/lib/http/cliente';
import { confirmacionValida, type AccionPersona, type EstadoPersona } from '@/lib/reglas/personasAdmin';

interface Props {
  id: string;
  estado: EstadoPersona;
  correo: string;
}

// Qué dice cada confirmación. La página solo muestra este componente con el rol 'admin' y si la cuenta no es la
// propia ni de administración; la API lo vuelve a comprobar.
const TEXTOS: Record<AccionPersona, { boton: string; titulo: string; explicacion: string; confirmar: string }> = {
  reenviar_confirmacion: {
    boton: 'Reenviar confirmación',
    titulo: 'Reenviar el enlace de confirmación',
    explicacion: 'Se envía de nuevo el correo para confirmar la cuenta.',
    confirmar: 'Reenviar',
  },
  reenviar_tutor: {
    boton: 'Reenviar al tutor',
    titulo: 'Reenviar el correo al tutor',
    explicacion: 'Se envía de nuevo la solicitud de autorización al correo del tutor (con el límite diario de siempre).',
    confirmar: 'Reenviar',
  },
  suspender: {
    boton: 'Suspender',
    titulo: 'Suspender la cuenta',
    explicacion: 'La persona no podrá entrar ni usar la app hasta que la reactives. Sus datos se conservan.',
    confirmar: 'Suspender',
  },
  reactivar: {
    boton: 'Reactivar',
    titulo: 'Reactivar la cuenta',
    explicacion: 'La persona podrá volver a entrar con su contraseña.',
    confirmar: 'Reactivar',
  },
  eliminar: {
    boton: 'Eliminar cuenta',
    titulo: 'Eliminar la cuenta y sus datos',
    explicacion: 'Se borran la cuenta y todos sus datos. No se puede deshacer.',
    confirmar: 'Eliminar para siempre',
  },
};

export function AccionesPersona({ id, estado, correo }: Props) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<AccionPersona | null>(null);
  const [escrito, setEscrito] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const idCampo = useId();

  const disponibles: AccionPersona[] = [
    ...(estado === 'sin_confirmar' ? (['reenviar_confirmacion'] as const) : []),
    ...(estado === 'menor_pendiente' ? (['reenviar_tutor'] as const) : []),
    estado === 'suspendida' ? 'reactivar' : 'suspender',
    'eliminar',
  ];

  const cerrar = () => {
    setAbierta(null);
    setEscrito('');
    setError(null);
  };

  const confirmar = async () => {
    if (!abierta) return;
    setEnviando(true);
    setError(null);
    const respuesta = await enviarJson<{ mensaje: string }>(`/api/admin/personas/${id}/acciones`, {
      accion: abierta,
      ...(abierta === 'eliminar' ? { confirmacion: escrito } : {}),
    });
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      return;
    }
    if (abierta === 'eliminar') {
      router.push('/admin/personas');
      router.refresh();
      return;
    }
    cerrar();
    setMensaje(respuesta.datos.mensaje);
    router.refresh();
  };

  const textos = abierta ? TEXTOS[abierta] : null;
  const puedeConfirmar = abierta !== 'eliminar' || confirmacionValida(escrito, correo);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {disponibles.map((accion) => (
          <Boton
            key={accion}
            variante={accion === 'eliminar' || accion === 'suspender' ? 'peligro' : 'secundario'}
            onClick={() => {
              setMensaje(null);
              setAbierta(accion);
            }}
          >
            {TEXTOS[accion].boton}
          </Boton>
        ))}
      </div>
      {mensaje ? <Aviso tipo="exito">{mensaje}</Aviso> : null}

      {abierta && textos ? (
        <Modal titulo={textos.titulo} onCerrar={cerrar} {...(abierta === 'eliminar' ? { focoInicial: campo } : {})}>
          <form
            className="space-y-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (puedeConfirmar && !enviando) void confirmar();
            }}
          >
            <p className="text-base text-texto">{textos.explicacion}</p>
            {abierta === 'eliminar' ? (
              <div>
                <label htmlFor={idCampo} className="mb-1 block text-sm font-medium text-texto">
                  Escribe el correo completo de la cuenta para confirmar
                </label>
                <input
                  ref={campo}
                  id={idCampo}
                  type="email"
                  autoComplete="off"
                  spellCheck={false}
                  value={escrito}
                  onChange={(evento) => setEscrito(evento.target.value)}
                  className={CLASES_CONTROL}
                />
              </div>
            ) : null}
            {error ? <Aviso tipo="error">{error}</Aviso> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Boton variante="secundario" onClick={cerrar}>
                Cancelar
              </Boton>
              <Boton type="submit" variante={abierta === 'eliminar' || abierta === 'suspender' ? 'peligro' : 'primario'} disabled={!puedeConfirmar} cargando={enviando}>
                {textos.confirmar}
              </Boton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
