import { redirect } from 'next/navigation';

export const metadata = { title: 'Esperando autorización · Gym Assistant' };

// Mientras la cuenta espera la autorización del tutor, el layout de /gym muestra la pantalla de espera en
// lugar de esta página. Si se llega aquí, la cuenta ya está habilitada.
export default function EsperandoAutorizacionPage() {
  redirect('/gym');
}
