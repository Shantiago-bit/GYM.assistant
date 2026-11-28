'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { enviarJson } from '@/lib/http/cliente';

// Envía un correo de prueba a la cuenta de quien administra, con confirmación. La página solo lo muestra con el
// rol 'admin'; la API lo vuelve a comprobar, nunca recibe una dirección y permite uno por minuto.
export function BotonCorreoPrueba({ destinatarioMascara }: { destinatarioMascara: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cerrar = () => {
    setAbierto(false);
    setError(null);
  };

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    const respuesta = await enviarJson<{ mensaje: string }>('/api/admin/correos/prueba');
    setEnviando(false);
    if (!respuesta.ok) {
      setError(respuesta.mensaje);
      return;
    }
    cerrar();
    setMensaje(respuesta.datos.mensaje);
    // El envío aparece enseguida en el registro y en las cifras.
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <Boton
        variante="secundario"
        onClick={() => {
          setMensaje(null);
          setAbierto(true);
        }}
      >
        Enviar correo de prueba
      </Boton>
      {mensaje ? <Aviso tipo="exito">{mensaje}</Aviso> : null}

      {abierto ? (
        <Modal titulo="Enviar un correo de prueba" onCerrar={cerrar}>
          <form
            className="space-y-3"
            onSubmit={(evento) => {
              evento.preventDefault();
              if (!enviando) void confirmar();
            }}
          >
            <p className="text-base text-texto">
              Se envía el correo de prueba, con el mismo diseño que los correos reales, a tu cuenta (
              <strong>{destinatarioMascara}</strong>). Queda en el registro de correos y en la auditoría. Puedes enviar
              uno por minuto.
            </p>
            {error ? <Aviso tipo="error">{error}</Aviso> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Boton variante="secundario" onClick={cerrar}>
                Cancelar
              </Boton>
              <Boton type="submit" cargando={enviando}>
                Enviar
              </Boton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
