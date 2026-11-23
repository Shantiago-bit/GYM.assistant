import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { VolverAlInicio } from '@/components/auth/VolverAlInicio';
import { EDAD_MINIMA_REGISTRO, EDAD_MINIMA_SIN_AUTORIZACION, VIGENCIA_AUTORIZACION_DIAS } from '@/lib/config/gym';
import { correoDeContacto } from '@/lib/correo';
import { NOMBRE_APP } from '@/lib/config/marca';
import { LogotipoAgon } from '@/components/marca/LogotipoAgon';

export const metadata: Metadata = {
  title: 'Privacidad',
  description: `Qué datos guarda ${NOMBRE_APP}, para qué los usa y cómo ejercer tus derechos.`,
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-titulo-2 font-bold text-texto">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-texto">{children}</div>
    </section>
  );
}

export default function PrivacidadPage() {
  const contacto = correoDeContacto();
  const enlaceContacto = contacto ? (
    <a href={`mailto:${contacto}`} className="font-medium text-primario underline underline-offset-4">
      {contacto}
    </a>
  ) : (
    'el correo de soporte de la app'
  );

  return (
    <main id="contenido" tabIndex={-1} className="min-h-screen fondo-marca px-4 py-10 sm:px-6">
      <article className="mx-auto w-full max-w-2xl space-y-6 rounded-[2rem] border border-borde bg-superficie p-5 shadow-elevada sm:p-8">
        <div className="-ml-3 -mt-1">
          <VolverAlInicio />
        </div>
        <header>
          <LogotipoAgon tamano="sm" />
          <h1 className="mt-4 text-titulo-1 font-bold text-texto">Política de privacidad</h1>
          <p className="mt-2 text-sm text-texto-suave">
            {NOMBRE_APP} (antes Gym Assistant) es la misma app con otro nombre: esta política no cambia por eso.
          </p>
          <p className="mt-2 text-sm text-texto-suave">
            Tratamos tus datos según la Ley 1581 de 2012 de Colombia (protección de datos personales).
          </p>
        </header>

        <Seccion titulo="Qué datos guardamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>Tu correo y tu contraseña (cifrada), para que puedas entrar.</li>
            <li>Tu nombre, el apodo con el que quieres que te llamemos, tu fecha de nacimiento y tu género.</li>
            <li>Tu foto de perfil, si decides subir una. Se guarda en un almacenamiento privado.</li>
            <li>Los días de la semana que eliges para entrenar, con los cambios que hagas (para calcular tu racha).</li>
            <li>Tus ejercicios, sesiones y series, y el conteo diario de mensajes al chat.</li>
          </ul>
        </Seccion>

        <Seccion titulo="Para qué los usamos">
          <p>
            Para saludarte por tu nombre, calcular tu edad y adaptar los consejos, felicitarte en tu cumpleaños, mostrar
            tus récords y tu racha, y calcular cuándo te toca progresar. No vendemos ni compartimos tus datos con fines
            publicitarios.
          </p>
        </Seccion>

        <Seccion titulo="CHRONO, el asistente">
          <p>
            Los mensajes que escribes en el chat, y los datos de entrenamiento que CHRONO consulta para responderte, se
            envían a Groq, el servicio que procesa las respuestas. De tu perfil, CHRONO solo recibe tu apodo (o tu
            nombre), tu edad y si hoy es tu cumpleaños: nunca tu fecha de nacimiento, tu correo ni tu foto.
          </p>
          <p>
            Si usas &quot;Que CHRONO lo interprete&quot; al anotar series, solo se envía a Groq esa frase y el tipo de
            ejercicio, y cuenta como un mensaje del límite diario.
          </p>
        </Seccion>

        <Seccion titulo="Imagen de tu mes para compartir">
          <p>
            En &quot;Tu mes en el gym&quot; puedes crear una imagen con el resumen de tu mes. Se genera en el momento, solo
            con tus datos y solo para ti; la app no la guarda ni la publica. Por defecto muestra tus días entrenados, tu
            racha, cuántos récords lograste y tu ejercicio estrella, sin tu nombre, tu correo ni tus pesos. Tu apodo y
            los pesos de tus récords solo aparecen si tú los activas antes de compartirla, y compartirla depende de ti.
          </p>
        </Seccion>

        <Seccion titulo="Dictado por voz">
          <p>
            El botón del micrófono de &quot;Escríbelo rápido&quot; usa el reconocimiento de voz de tu navegador. Tu voz
            la procesa el servicio de voz del navegador (por ejemplo, Google en Chrome), no {NOMBRE_APP}: la app solo
            recibe el texto reconocido, para mostrarte las series antes de guardarlas, y no guarda audio. El micrófono
            solo aparece si tu navegador tiene esa función y solo escucha mientras lo tienes activado.
          </p>
        </Seccion>

        <Seccion titulo="Menores de edad">
          <p>
            Necesitas al menos {EDAD_MINIMA_REGISTRO} años para usar {NOMBRE_APP}. Si tienes menos de{' '}
            {EDAD_MINIMA_SIN_AUTORIZACION}, tu mamá, papá o tutor debe autorizar la cuenta desde un enlace que le
            enviamos por correo; el enlace vence a los {VIGENCIA_AUTORIZACION_DIAS} días y, si no se acepta, la cuenta
            se elimina. Con menores, CHRONO es especialmente prudente con los consejos.
          </p>
        </Seccion>

        <Seccion titulo="Dónde se guardan y por cuánto tiempo">
          <p>
            En la base de datos y el almacenamiento de la app (Supabase), con acceso restringido al servidor. Se
            conservan mientras tengas tu cuenta. Al eliminarla, se borran tu perfil, tus entrenamientos, las
            autorizaciones y tu foto.
          </p>
          <p>
            Las personas administradoras de {NOMBRE_APP} pueden ver los datos de tu cuenta para dar soporte y cumplir
            solicitudes; cada acceso queda registrado. Las estadísticas del panel de administración son cifras
            agregadas, sin nombres ni correos.
          </p>
        </Seccion>

        <Seccion titulo="Tus derechos">
          <p>
            Puedes conocer, actualizar y corregir tus datos, pedir que los eliminemos y revocar esta autorización. Tu
            nombre, apodo, género y foto los cambias desde tu perfil. Para corregir la fecha de nacimiento o pedir que
            borremos tu cuenta, escríbenos a {enlaceContacto}.
          </p>
        </Seccion>

        <p className="border-t border-borde pt-4 text-sm text-texto-suave">
          ¿Aún no tienes cuenta?{' '}
          <Link href="/registro" className="font-medium text-primario underline-offset-4 hover:underline">
            Regístrate
          </Link>
        </p>
      </article>
    </main>
  );
}
