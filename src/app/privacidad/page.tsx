import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { VolverAlInicio } from '@/components/auth/VolverAlInicio';
import { EDAD_MINIMA_REGISTRO, EDAD_MINIMA_SIN_AUTORIZACION, VIGENCIA_AUTORIZACION_DIAS } from '@/lib/config/gym';
import { correoDeContacto } from '@/lib/correo';

export const metadata: Metadata = {
  title: 'Privacidad · Gym Assistant',
  description: 'Qué datos guarda Gym Assistant, para qué los usa y cómo ejercer tus derechos.',
};

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function PrivacidadPage() {
  const contacto = correoDeContacto();
  const enlaceContacto = contacto ? (
    <a href={`mailto:${contacto}`} className="font-medium text-emerald-700 underline underline-offset-4">
      {contacto}
    </a>
  ) : (
    'el correo de soporte de la app'
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f7fbf7_0%,#eefaf1_45%,#f5faf5_100%)] px-4 py-10 sm:px-6">
      <article className="mx-auto w-full max-w-2xl space-y-6 rounded-[2rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_25px_80px_rgba(20,83,45,0.12)] sm:p-8">
        <div className="-ml-3 -mt-1">
          <VolverAlInicio />
        </div>
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Gym Assistant</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-900">Política de privacidad</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tratamos tus datos según la Ley 1581 de 2012 de Colombia (protección de datos personales).
          </p>
        </header>

        <Seccion titulo="Qué datos guardamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>Tu correo y tu contraseña (cifrada), para que puedas entrar.</li>
            <li>Tu nombre, el apodo con el que quieres que te llamemos, tu fecha de nacimiento y tu género.</li>
            <li>Tu foto de perfil, si decides subir una. Se guarda en un almacenamiento privado.</li>
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
        </Seccion>

        <Seccion titulo="Menores de edad">
          <p>
            Necesitas al menos {EDAD_MINIMA_REGISTRO} años para usar Gym Assistant. Si tienes menos de{' '}
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
        </Seccion>

        <Seccion titulo="Tus derechos">
          <p>
            Puedes conocer, actualizar y corregir tus datos, pedir que los eliminemos y revocar esta autorización. Tu
            nombre, apodo, género y foto los cambias desde tu perfil. Para corregir la fecha de nacimiento o pedir que
            borremos tu cuenta, escríbenos a {enlaceContacto}.
          </p>
        </Seccion>

        <p className="border-t border-emerald-100 pt-4 text-sm text-slate-600">
          ¿Aún no tienes cuenta?{' '}
          <Link href="/registro" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
            Regístrate
          </Link>
        </p>
      </article>
    </main>
  );
}
