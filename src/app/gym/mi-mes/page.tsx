import { CompartirMes } from '@/components/mes/CompartirMes';
import { HistoriaMes } from '@/components/mes/HistoriaMes';
import { Icono } from '@/components/ui/Icono';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerResumenMes } from '@/lib/dataService';
import { hoyBogota } from '@/lib/reglas/fechas';
import { DIAS_AVISO_MES, esMesValido, mesAnterior, mesDeFecha, nombreMes, tituloMes } from '@/lib/reglas/resumenMes';

export const metadata = { title: 'Tu mes en el gym · Gym Assistant' };

// Sin ?mes=: la primera semana del mes, el mes que acaba de terminar; después, el mes en curso.
function mesPorDefecto(hoy: string): string {
  const actual = mesDeFecha(hoy);
  return Number(hoy.slice(8)) <= DIAS_AVISO_MES ? mesAnterior(actual) : actual;
}

export default async function MiMesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { id: usuarioId } = await exigirSesionDePagina();
  const { mes: pedido } = await searchParams;
  const hoy = hoyBogota();
  const mes = pedido && esMesValido(pedido) && pedido <= mesDeFecha(hoy) ? pedido : mesPorDefecto(hoy);
  const resumen = await obtenerResumenMes(usuarioId, mes);
  const anterior = mesAnterior(mes);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="font-titulos text-titulo-1 font-bold text-texto">Tu mes en el gym</h1>
        <p className="text-sm text-texto-suave">{tituloMes(mes)}</p>
        <nav aria-label="Otros meses" className="mt-2 flex flex-wrap gap-2">
          {/* <a> y no <Link>: es la misma página con otra consulta, que en producción no termina bajo el
              loading.tsx de /gym (ver EnlaceLocal). Aquí sí hace falta pedir la página al servidor. */}
          <a
            href={`/gym/mi-mes?mes=${anterior}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-boton px-2 text-sm font-semibold text-primario hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
          >
            <Icono nombre="flechaIzquierda" className="h-4 w-4" />
            Ver {nombreMes(anterior)}
          </a>
        </nav>
      </div>
      <HistoriaMes key={mes} resumen={resumen} />
      <CompartirMes mes={mes} />
    </div>
  );
}
