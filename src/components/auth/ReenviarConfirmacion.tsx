'use client';

import { useEffect, useState } from 'react';
import { ESPERA_REENVIO_SEGUNDOS } from '@/lib/config/gym';

const BOTON =
  'rounded-2xl border border-borde bg-white px-4 py-2 text-sm font-semibold text-primario transition hover:bg-primario-suave disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:bg-none disabled:text-texto disabled:shadow-none';

// Ayuda cuando el correo de confirmación tarda: dónde buscarlo y "Reenviar enlace", con una espera visible de
// 60 s entre pedidos. La respuesta del servidor es siempre la misma, exista o no la cuenta.
export function ReenviarConfirmacion({
  correo,
  esperarAlInicio = true,
  textoBoton = 'Reenviar enlace',
}: {
  correo: string;
  esperarAlInicio?: boolean;
  textoBoton?: string;
}) {
  const [restantes, setRestantes] = useState(esperarAlInicio ? ESPERA_REENVIO_SEGUNDOS : 0);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  useEffect(() => {
    if (restantes <= 0) return;
    const temporizador = setTimeout(() => setRestantes((actual) => actual - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [restantes]);

  const reenviar = async () => {
    setEnviando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch('/api/auth/registro/reenviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo.trim().toLowerCase() }),
      });
      const cuerpo = (await respuesta.json()) as { ok: boolean; datos?: { mensaje: string }; error?: { mensaje: string } };
      setMensaje(
        cuerpo.ok
          ? { texto: cuerpo.datos?.mensaje ?? 'Listo.', error: false }
          : { texto: cuerpo.error?.mensaje ?? 'No se pudo reenviar. Inténtalo más tarde.', error: true },
      );
    } catch {
      setMensaje({ texto: 'No se pudo conectar. Inténtalo de nuevo.', error: true });
    } finally {
      setEnviando(false);
      setRestantes(ESPERA_REENVIO_SEGUNDOS);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-borde bg-white p-4 text-sm text-texto-suave">
      <p>¿No te llegó? Revisa las carpetas Spam, Promociones o Correo no deseado. Puede tardar unos minutos.</p>
      <button type="button" onClick={() => void reenviar()} disabled={enviando || restantes > 0} className={BOTON}>
        {restantes > 0 ? `${textoBoton} (${restantes} s)` : enviando ? 'Enviando…' : textoBoton}
      </button>
      {mensaje ? (
        <p role={mensaje.error ? 'alert' : 'status'} className={mensaje.error ? 'text-peligro' : 'text-primario'}>
          {mensaje.texto}
        </p>
      ) : null}
    </div>
  );
}
