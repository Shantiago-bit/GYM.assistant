import { AccionesEspera } from '@/components/gym/AccionesEspera';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { obtenerSolicitudPendiente, type Perfil } from '@/lib/dataService';
import { enmascararCorreo, fechaLarga, reenviosRestantes } from '@/lib/reglas/autorizacion';
import { nombreParaMostrar } from '@/lib/reglas/perfil';

// Pantalla de las cuentas de menores que aún no autoriza su tutor. El layout de /gym la muestra en cualquier
// ruta (sin redirigir, ver PantallaCompletarPerfil).
export async function PantallaEsperaAutorizacion({ perfil }: { perfil: Perfil }) {
  if (perfil.autorizacion === 'rechazada') {
    return (
      <Tarjeta className="space-y-3 p-6">
        <h1 className="text-2xl font-bold text-texto">Tu tutor no autorizó la cuenta</h1>
        <p className="text-texto-suave">La cuenta y sus datos se eliminarán.</p>
        <AccionesEspera restantesIniciales={0} />
      </Tarjeta>
    );
  }

  const solicitud = await obtenerSolicitudPendiente(perfil.usuarioId);
  return (
    <Tarjeta className="space-y-4 p-6">
      <p className="text-4xl" aria-hidden="true">
        ⏳
      </p>
      <h1 className="text-2xl font-bold text-texto">Esperando autorización</h1>
      <p className="text-texto">
        Hola, {nombreParaMostrar(perfil.nombre, perfil.apodo)}. Le enviamos un correo
        {solicitud ? (
          <>
            {' '}a <strong>{enmascararCorreo(solicitud.correoTutor)}</strong>
          </>
        ) : null}{' '}
        para que tu mamá, papá o tutor autorice tu cuenta. Cuando acepte, podrás usar Gym Assistant.
      </p>
      {solicitud ? (
        <p className="text-sm text-texto-suave">
          Si no responde antes del {fechaLarga(solicitud.venceDia)}, la cuenta se eliminará. Pídele que revise su
          bandeja de entrada y la carpeta de spam.
        </p>
      ) : null}
      <AccionesEspera restantesIniciales={solicitud ? reenviosRestantes(solicitud.reenviosHoy) : 0} />
    </Tarjeta>
  );
}
