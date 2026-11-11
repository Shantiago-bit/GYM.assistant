import { GuiaInteractiva } from '@/components/gym/GuiaInteractiva';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerDatosPrimerosPasos, obtenerEstadoGuia } from '@/lib/dataService';
import { TEXTOS_GUIA } from '@/lib/guia/contenido';
import { calcularPrimerosPasos } from '@/lib/reglas/guia';

export const dynamic = 'force-dynamic';

export default async function GuiaPage() {
  const { id: usuarioId } = await exigirSesionDePagina();
  const [estado, datos] = await Promise.all([obtenerEstadoGuia(usuarioId), obtenerDatosPrimerosPasos(usuarioId)]);

  return (
    <>
      <div className="mb-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-texto">{TEXTOS_GUIA.titulo}</h1>
        <p className="mt-1 text-sm text-texto-suave">{TEXTOS_GUIA.introduccion}</p>
      </div>
      <GuiaInteractiva
        completadaInicial={estado.guiaCompletada}
        pasosOcultosInicial={estado.primerosPasosOcultos}
        primerosPasos={calcularPrimerosPasos(datos)}
      />
    </>
  );
}
