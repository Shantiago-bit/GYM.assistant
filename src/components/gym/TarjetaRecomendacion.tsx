import { Insignia } from '@/components/ui/Insignia';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Termino } from '@/components/ui/Termino';
import { NotaMetodo, PlanSesion } from '@/components/gym/PlanSesion';
import type { Metodo, PlanSerie, Recomendacion, TipoEjercicio } from '@/lib/dataService';
import { formatearPeso } from '@/lib/formato';
import { fraseAccion } from '@/lib/reglas/siguientePaso';

function titulo(recomendacion: Recomendacion): string {
  switch (recomendacion.accion) {
    case 'subir_peso':
      return `Subir el peso a ${formatearPeso(recomendacion.pesoSugeridoGramos ?? 0)}`;
    case 'subir_reps':
      return `Subir la meta a ${recomendacion.metaRepsSugerida} repeticiones`;
    case 'bajar_peso':
      return `Bajar el peso a ${formatearPeso(recomendacion.pesoSugeridoGramos ?? 0)}`;
    case 'subir_variante':
      return 'Probar una variante más difícil';
    case 'mantener':
      return 'Mantener el objetivo';
  }
}

// Recomendación de la próxima sesión: la etiqueta (Subir, Mantener, Descarga o Pendiente), una frase de acción
// concreta ("La próxima vez usa 62,5 kg y busca 8 repeticiones por serie"), el porqué y el plan por serie.
// conFrase=false cuando la frase ya está en "Tu siguiente paso", encima.
export function TarjetaRecomendacion({
  recomendacion,
  sinPrueba,
  plan,
  ejercicio,
  avanzado = false,
  conFrase = true,
}: {
  recomendacion: Recomendacion;
  sinPrueba: boolean;
  plan?: PlanSerie[];
  ejercicio: { tipo: TipoEjercicio; metodo: Metodo; rango: [number, number] };
  avanzado?: boolean;
  conFrase?: boolean;
}) {
  const baja = !sinPrueba && recomendacion.accion === 'bajar_peso';
  const sube = !sinPrueba && !baja && recomendacion.accion !== 'mantener';
  const etiqueta = sinPrueba ? 'Pendiente' : sube ? 'Subir' : baja ? (avanzado ? 'Descarga' : 'Semana más suave') : 'Mantener';

  return (
    <Tarjeta className={`border-l-4 ${sube ? 'border-l-subir' : 'border-l-mantener'}`} data-guia="detalle-recomendacion">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-texto-suave">Próxima sesión</h2>
        <span className="inline-flex items-center">
          <Insignia tono={sube ? 'subir' : 'mantener'}>{etiqueta}</Insignia>
          {baja && avanzado ? <Termino id="descarga">{null}</Termino> : null}
        </span>
      </div>
      <p className="mt-2 text-xl font-bold text-texto">
        {sinPrueba ? (avanzado ? 'Falta la prueba inicial' : 'Falta la primera medición') : titulo(recomendacion)}
      </p>
      {!sinPrueba && conFrase ? (
        <p className="mt-2 text-base font-medium text-texto">{fraseAccion(recomendacion, ejercicio)}</p>
      ) : null}
      <p className="mt-1 text-sm text-texto-suave">{recomendacion.mensaje}</p>
      {!sinPrueba && plan && plan.length > 0 ? (
        <div className="mt-3">
          <PlanSesion plan={plan} avanzado={avanzado} />
          <NotaMetodo plan={plan} />
        </div>
      ) : null}
    </Tarjeta>
  );
}
