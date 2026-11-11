import { Aviso } from '@/components/ui/Aviso';

// Aviso tras eliminar o restaurar un ejercicio; la acción llega en ?aviso= al volver a la página.
const TEXTOS: Record<string, string> = {
  eliminado: 'Ejercicio eliminado.',
  restaurado: 'Ejercicio restaurado: vuelve a tu lista con todo su histórico.',
};

export function AvisoAccion({ aviso }: { aviso: string | undefined }) {
  const texto = aviso ? TEXTOS[aviso] : undefined;
  if (!texto) return null;

  return (
    <div className="mb-4">
      <Aviso tipo="exito">{texto}</Aviso>
    </div>
  );
}
