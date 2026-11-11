import { FormularioCompletarPerfil } from '@/components/gym/FormularioCompletarPerfil';
import { Tarjeta } from '@/components/ui/Tarjeta';

// Pantalla para cuentas sin perfil (creadas antes del registro en dos pasos). La muestra el layout de /gym en
// cualquier ruta, sin redirigir: un redirect() en el layout, compartido por origen y destino, deja la
// navegación del cliente en un bucle.
export function PantallaCompletarPerfil() {
  return (
    <Tarjeta className="p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primario">Gym Assistant</p>
      <h1 className="mt-2 text-2xl font-bold text-texto">Completa tu perfil</h1>
      <p className="mb-5 mt-1 text-sm text-texto-suave">
        Antes de seguir, cuéntanos cómo te llamas y cuándo naciste. Solo te lo pediremos una vez.
      </p>
      <FormularioCompletarPerfil />
    </Tarjeta>
  );
}
