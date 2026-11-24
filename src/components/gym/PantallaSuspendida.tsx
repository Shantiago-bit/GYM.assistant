import { BotonCerrarSesion } from '@/components/gym/BotonCerrarSesion';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { NOMBRE_APP } from '@/lib/config/marca';

// Lo que ve una cuenta suspendida desde el panel de administración en cualquier ruta de /gym: nada de la app,
// solo cómo escribirnos.
export function PantallaSuspendida({ contacto }: { contacto: string | null }) {
  return (
    <Tarjeta className="space-y-3 p-6">
      <h1 className="text-titulo-1 font-bold text-texto">Tu cuenta está suspendida</h1>
      <p className="text-base text-texto-suave">
        Por ahora no puedes usar {NOMBRE_APP} con esta cuenta. Si crees que es un error o quieres saber por qué, escríbenos
        {contacto ? (
          <>
            {' '}a{' '}
            <a href={`mailto:${contacto}`} className="font-medium text-primario underline underline-offset-4">
              {contacto}
            </a>
          </>
        ) : null}
        .
      </p>
      <BotonCerrarSesion />
    </Tarjeta>
  );
}
