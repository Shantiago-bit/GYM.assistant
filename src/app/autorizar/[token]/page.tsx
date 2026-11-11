import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FormularioAutorizacion } from '@/components/auth/FormularioAutorizacion';
import { VIGENCIA_AUTORIZACION_DIAS } from '@/lib/config/gym';
import { obtenerAutorizacionPorHash, obtenerPerfil, supabaseAdmin } from '@/lib/dataService';
import { estadoEnlace, fechaLarga } from '@/lib/reglas/autorizacion';
import { MENSAJES } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { calcularEdad, nombreParaMostrar } from '@/lib/reglas/perfil';
import { calcularHashToken } from '@/lib/tokenRecuperacion';

export const dynamic = 'force-dynamic';

// El token va en la URL: que no se indexe ni viaje como "Referer" a otros sitios.
export const metadata: Metadata = {
  title: 'Autorizar cuenta · Gym Assistant',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

function Marco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f7fbf7_0%,#eefaf1_45%,#f5faf5_100%)] px-4 py-10 sm:px-6">
      <article className="w-full max-w-xl space-y-5 rounded-[2rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_25px_80px_rgba(20,83,45,0.12)] sm:p-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Gym Assistant</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-900 sm:text-3xl">{titulo}</h1>
        </header>
        {children}
      </article>
    </main>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">{children}</p>;
}

// Página pública para el tutor. Abrirla no decide nada: la respuesta se envía con un botón.
export default async function AutorizarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const autorizacion = /^[0-9a-f]{64}$/.test(token) ? await obtenerAutorizacionPorHash(calcularHashToken(token)) : null;
  const perfil = autorizacion ? await obtenerPerfil(autorizacion.usuarioId) : null;

  if (!autorizacion || !perfil) {
    return (
      <Marco titulo="Enlace no válido">
        <Aviso>{MENSAJES.AUTORIZACION_INVALIDA}</Aviso>
      </Marco>
    );
  }

  const estado = estadoEnlace(autorizacion);
  if (estado === 'usado' || perfil.autorizacion !== 'pendiente') {
    return (
      <Marco titulo="Solicitud respondida">
        <Aviso>
          {perfil.autorizacion === 'aprobada'
            ? 'Ya autorizaste esta cuenta. No tienes que hacer nada más.'
            : MENSAJES.AUTORIZACION_USADA}
        </Aviso>
      </Marco>
    );
  }
  if (estado === 'vencido') {
    return (
      <Marco titulo="Enlace vencido">
        <Aviso>{MENSAJES.AUTORIZACION_VENCIDA}</Aviso>
      </Marco>
    );
  }

  const apodo = nombreParaMostrar(perfil.nombre, perfil.apodo);
  const edad = calcularEdad(perfil.fechaNacimiento, hoyBogota());
  const { data } = await supabaseAdmin.auth.admin.getUserById(autorizacion.usuarioId);

  return (
    <Marco titulo={`${apodo} quiere usar Gym Assistant`}>
      <p className="text-sm leading-relaxed text-slate-700">
        <strong className="text-slate-900">{perfil.nombre}</strong> ({edad} años) se registró
        {data.user?.email ? (
          <>
            {' '}con el correo <strong className="text-slate-900">{data.user.email}</strong>
          </>
        ) : null}{' '}
        y escribió tu correo como el de su mamá, papá o tutor. Por su edad, la cuenta solo se activa si la autorizas.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700">
        <li>
          Guardamos su nombre, apodo, fecha de nacimiento, género, correo, la foto de perfil si sube una, y sus
          entrenamientos.
        </li>
        <li>
          Los mensajes del chat y los datos que CHRONO consulta se procesan con Groq; de su perfil, CHRONO solo recibe
          su apodo, su edad y si es su cumpleaños.
        </li>
        <li>
          Puedes pedir que corrijamos o eliminemos sus datos, o retirar la autorización, cuando quieras (Ley 1581 de
          2012).{' '}
          <Link
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-700 underline underline-offset-4"
          >
            Política de privacidad
          </Link>
        </li>
      </ul>
      <Aviso>
        Tienes hasta el {fechaLarga(autorizacion.venceDia)} para responder ({VIGENCIA_AUTORIZACION_DIAS} días desde el
        registro). Si no respondes, la cuenta se eliminará.
      </Aviso>
      <FormularioAutorizacion token={token} apodo={apodo} />
    </Marco>
  );
}
