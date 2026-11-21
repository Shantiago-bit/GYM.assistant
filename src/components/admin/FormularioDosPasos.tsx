'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Boton } from '@/components/ui/Boton';
import { supabase } from '@/lib/supabase';

type Estado =
  | { paso: 'cargando' }
  | { paso: 'registrar'; factorId: string; qr: string; secreto: string }
  | { paso: 'verificar'; factorId: string }
  | { paso: 'error'; mensaje: string };

const NOMBRE_FACTOR = 'Gym Assistant (administración)';
const MENSAJE_CODIGO = 'El código no es correcto o ya cambió. Escribe el que muestra tu app ahora (son 6 dígitos).';

// Verificación en dos pasos (MFA TOTP de Supabase Auth). Si la cuenta no tiene un factor verificado, muestra el
// QR para registrarlo en una app de autenticación (Google Authenticator, Microsoft Authenticator, 1Password…);
// si lo tiene, pide el código de 6 dígitos. Al verificar, la sesión pasa a aal2 y se entra al panel.
export function FormularioDosPasos() {
  const router = useRouter();
  const idCampo = useId();
  const idAyuda = useId();
  const [estado, setEstado] = useState<Estado>({ paso: 'cargando' });
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    (async () => {
      if (!supabase) {
        setEstado({ paso: 'error', mensaje: 'La app no está configurada para iniciar sesión.' });
        return;
      }
      const { data, error: errorFactores } = await supabase.auth.mfa.listFactors();
      if (!vigente) return;
      if (errorFactores || !data) {
        setEstado({ paso: 'error', mensaje: 'No se pudo consultar tu verificación en dos pasos. Recarga la página.' });
        return;
      }
      const verificado = data.totp[0];
      if (verificado) {
        setEstado({ paso: 'verificar', factorId: verificado.id });
        return;
      }
      // Un registro que quedó a medias se borra antes de empezar otro (Supabase no admite dos con el mismo nombre).
      for (const pendiente of data.all.filter((factor) => factor.factor_type === 'totp' && factor.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: pendiente.id });
      }
      const { data: nuevo, error: errorRegistro } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: NOMBRE_FACTOR });
      if (!vigente) return;
      if (errorRegistro || !nuevo) {
        setEstado({
          paso: 'error',
          mensaje: 'No se pudo iniciar el registro. Revisa que la verificación en dos pasos (TOTP) esté activa en Supabase.',
        });
        return;
      }
      setEstado({ paso: 'registrar', factorId: nuevo.id, qr: nuevo.totp.qr_code, secreto: nuevo.totp.secret });
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const verificar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!supabase || (estado.paso !== 'registrar' && estado.paso !== 'verificar')) return;
    const limpio = codigo.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(limpio)) {
      setError('Escribe los 6 dígitos que muestra tu app.');
      return;
    }
    setEnviando(true);
    setError(null);
    const { error: errorVerificacion } = await supabase.auth.mfa.challengeAndVerify({ factorId: estado.factorId, code: limpio });
    setEnviando(false);
    if (errorVerificacion) {
      setError(MENSAJE_CODIGO);
      return;
    }
    router.replace('/admin');
    router.refresh();
  };

  if (estado.paso === 'cargando') {
    return (
      <p role="status" className="text-sm text-texto-suave">
        Preparando la verificación…
      </p>
    );
  }
  if (estado.paso === 'error') {
    return (
      <p role="alert" className="text-sm text-red-700">
        {estado.mensaje}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {estado.paso === 'registrar' ? (
        <ol className="list-decimal space-y-3 pl-5 text-sm text-texto">
          <li>Abre una app de autenticación en tu teléfono (Google Authenticator, Microsoft Authenticator, 1Password…).</li>
          <li>
            Escanea este código QR:
            {/* El QR llega de Supabase como imagen SVG en una URL data: (no sale a ningún otro servicio). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={estado.qr} alt="Código QR para añadir Gym Assistant a tu app de autenticación" className="mt-2 h-48 w-48 rounded-xl bg-white p-2" />
          </li>
          <li>
            ¿No puedes escanearlo? Escribe esta clave en la app:{' '}
            <code className="break-all rounded bg-primario-suave px-1.5 py-0.5 text-sm font-semibold">{estado.secreto}</code>
          </li>
          <li>Escribe abajo el código de 6 dígitos que aparece en la app.</li>
        </ol>
      ) : (
        <p className="text-sm text-texto">Abre tu app de autenticación y escribe el código de 6 dígitos de Gym Assistant.</p>
      )}

      <form onSubmit={verificar} noValidate className="space-y-3">
        <div>
          <label htmlFor={idCampo} className="block text-sm font-semibold text-texto">
            Código de verificación
          </label>
          <input
            id={idCampo}
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idAyuda : undefined}
            className="mt-1 min-h-11 w-40 rounded-gym border border-borde bg-white px-3 text-lg tracking-[0.3em] text-texto"
          />
          {error ? (
            <p id={idAyuda} role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <Boton type="submit" cargando={enviando}>
          {estado.paso === 'registrar' ? 'Activar y entrar' : 'Verificar y entrar'}
        </Boton>
      </form>
    </div>
  );
}
