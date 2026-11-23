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
import { NOMBRE_APP } from '@/lib/config/marca';
import { LogotipoAgon } from '@/components/marca/LogotipoAgon';

export const dynamic = 'force-dynamic';

// El token va en la URL: que no se indexe ni viaje como "Referer" a otros sitios.
export const metadata: Metadata = {
  title: 'Autorizar cuenta',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

function Marco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center fondo-marca px-4 py-10 sm:px-6">
      <article className="w-full max-w-xl space-y-5 rounded-[2rem] border border-borde bg-superficie p-5 shadow-elevada sm:p-8">
        <header>
          <LogotipoAgon tamano="sm" />
          <h1 className="mt-4text-titulo-1 font-bold text-texto">{titulo}</h1>
        </header>
        {children}
      </article>
    </main>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-fondo px-4 py-3 text-sm leading-relaxed text-texto">{children}</p>;
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
    <Marco titulo={`${apodo} quiere usar ${NOMBRE_APP}`}>
      <p className="text-sm leading-relaxed text-texto">
        <strong className="text-texto">{perfil.nombre}</strong> ({edad} años) se registró
        {data.user?.email ? (
          <>
            {' '}con el correo <strong className="text-texto">{data.user.email}</strong>
          </>
        ) : null}{' '}
        y escribió tu correo como el de su mamá, papá o tutor. Por su edad, la cuenta solo se activa si la autorizas.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-texto">
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
            className="font-medium text-primario underline underline-offset-4"
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
