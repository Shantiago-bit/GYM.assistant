import { ChatGym } from '@/components/gym/ChatGym';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { preguntaInicial } from '@/lib/reglas/inicio';

export const metadata = { title: 'CHRONO (asistente) · Gym Assistant' };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ pregunta?: string | string[] }>;
}) {
  const { id } = await exigirSesionDePagina();
  const { pregunta } = await searchParams;

  return <ChatGym usuarioId={id} preguntaInicial={preguntaInicial(pregunta)} />;
}
