import { ChatGym } from '@/components/gym/ChatGym';
import { exigirSesionDePagina } from '@/lib/auth/sesion';

export const metadata = { title: 'CHRONO (asistente) · Gym Assistant' };

export default async function ChatPage() {
  const { id } = await exigirSesionDePagina();

  return <ChatGym usuarioId={id} />;
}
