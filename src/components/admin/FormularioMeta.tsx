'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { Modal } from '@/components/ui/Modal';
import { enviarJson } from '@/lib/http/cliente';
import { esMetaValida, META_MAXIMA, META_MINIMA } from '@/lib/reglas/admin';

const formato = (valor: number) => valor.toLocaleString('es-CO');

// Cambia la meta mensual de personas activas. La página solo lo muestra con el rol 'admin'; la API lo vuelve a
// comprobar (403 con 'lectura'). Primero valida aquí y pide confirmación en un modal; el cambio queda auditado.
export function FormularioMeta({ metaActual }: { metaActual: number }) {
  const router = useRouter();
  const [texto, setTexto] = useState(String(metaActual));
  const [errorCampo, setErrorCampo] = useState<string | undefined>(undefined);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const revisar = () => {
    setMensaje(null);
    // Number('') es 0 y Number('12,5') es NaN: los dos quedan fuera de esMetaValida.
    const valor = texto.trim() === '' ? Number.NaN : Number(texto);
    if (!esMetaValida(valor)) {
      setErrorCampo(`Escribe un número entero entre ${formato(META_MINIMA)} y ${formato(META_MAXIMA)}.`);
      return;
    }
    if (valor === metaActual) {
      setErrorCampo(`La meta ya es de ${formato(metaActual)} personas activas por mes.`);
      return;
    }
    setErrorCampo(undefined);
    setErrorEnvio(null);
    setConfirmando(valor);
  };

  const cerrar = () => {
    setConfirmando(null);
    setErrorEnvio(null);
  };

  const confirmar = async () => {
    if (confirmando === null) return;
    setEnviando(true);
    setErrorEnvio(null);
    const respuesta = await enviarJson<{ mensaje: string }>('/api/admin/metas', { valor: confirmando }, 'PUT');
    setEnviando(false);
    if (!respuesta.ok) {
      setErrorEnvio(respuesta.mensaje);
      return;
    }
    cerrar();
    setMensaje(respuesta.datos.mensaje);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <form
        noValidate
        aria-label="Cambiar la meta del mes"
        className="flex flex-col gap-3 sm:flex-row sm:items-start"
        onSubmit={(evento) => {
          evento.preventDefault();
          revisar();
        }}
      >
        <div className="sm:w-64">
          <Campo
            etiqueta="Nueva meta (personas activas por mes)"
            type="number"
            inputMode="numeric"
            min={META_MINIMA}
            max={META_MAXIMA}
            step={1}
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value);
              setErrorCampo(undefined);
            }}
            error={errorCampo}
            ayuda={`Entre ${formato(META_MINIMA)} y ${formato(META_MAXIMA)}.`}
          />
        </div>
        <Boton type="submit" className="sm:mt-6">
          Guardar meta
        </Boton>
      </form>
      {mensaje ? <Aviso tipo="exito">{mensaje}</Aviso> : null}

      {confirmando !== null ? (
        <Modal titulo="Cambiar la meta del mes" onCerrar={cerrar}>
          <form
            className="space-y-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (!enviando) void confirmar();
            }}
          >
            <p className="text-base text-texto">
              La meta pasa de <strong>{formato(metaActual)}</strong> a <strong>{formato(confirmando)}</strong> personas
              activas por mes. El resumen se recalcula con la meta nueva y el cambio queda en la auditoría.
            </p>
            {errorEnvio ? <Aviso tipo="error">{errorEnvio}</Aviso> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Boton variante="secundario" onClick={cerrar}>
                Cancelar
              </Boton>
              <Boton type="submit" cargando={enviando}>
                Cambiar meta
              </Boton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
