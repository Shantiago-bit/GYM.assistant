import { ChatGym } from '@/components/gym/ChatGym';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { limiteDiarioChat } from '@/lib/chat/limite';
import type { ContextoChat } from '@/lib/chat/contextoVisible';
import { sugerenciasInteligentes, type EstadoHoy } from '@/lib/chat/sugerencias';
import {
  listarEjercicios,
  listarFechasConSesion,
  obtenerDatosInicio,
  obtenerHistorialDias,
  obtenerMensajesChatDia,
  obtenerPerfil,
  sesionesDe,
} from '@/lib/dataService';
import { formatearFecha, formatearPeso } from '@/lib/formato';
import { horaBogota, saludoSegunHora } from '@/lib/reglas/admin';
import { estadoConstelacion } from '@/lib/reglas/constelacion';
import { hoyBogota } from '@/lib/reglas/fechas';
import { desdeParaInicio, fraseCorta, preguntaInicial, recomendacionDelListado, tendenciaEjercicio, ultimoRecord } from '@/lib/reglas/inicio';
import { nombreParaMostrar } from '@/lib/reglas/perfil';
import { calcularRacha, diasEnFecha, esDiaPlanificado, NOMBRES_DIA } from '@/lib/reglas/racha';

export const metadata = { title: 'CHRONO (asistente)' };

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ pregunta?: string | string[] }>;
}) {
  const { id } = await exigirSesionDePagina();
  const { pregunta } = await searchParams;
  const hoy = hoyBogota();

  // El panel "Lo que sé de ti" y las sugerencias usan los mismos datos que CHRONO recibe como contexto (perfil,
  // días, ejercicios con su recomendación) más la racha, la constelación y el último récord del inicio. Nada de
  // esto viaja al modelo: CHRONO arma su propio contexto en /api/gym/chat, como siempre.
  const [perfil, todos, fechas, historialDias, datos, usados] = await Promise.all([
    obtenerPerfil(id),
    listarEjercicios(id),
    listarFechasConSesion(id),
    obtenerHistorialDias(id),
    obtenerDatosInicio(id, desdeParaInicio(hoy)),
    obtenerMensajesChatDia(id, hoy).catch(() => 0),
  ]);
  const activos = todos.filter((ejercicio) => !ejercicio.archivado);
  const avanzado = perfil?.modoAvanzado ?? false;
  const estadoHoy: EstadoHoy = fechas.includes(hoy) ? 'entrenado' : esDiaPlanificado(hoy, historialDias) ? 'entrenar' : 'descanso';
  const constelacion = estadoConstelacion({ hoy, historialDias, fechasConSesion: fechas });
  const record = ultimoRecord(datos.marcas, hoy);

  const contexto: ContextoChat = {
    apodo: perfil ? nombreParaMostrar(perfil.nombre, perfil.apodo) : '',
    saludo: saludoSegunHora(horaBogota(new Date())),
    // De lunes a domingo.
    dias: [...diasEnFecha(historialDias, hoy)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((dia) => NOMBRES_DIA[dia] ?? ''),
    estadoHoy,
    racha: calcularRacha(fechas, hoy, historialDias).actual,
    constelacion: {
      nombre: constelacion.constelacion.nombre,
      encendidas: constelacion.encendidas,
      total: constelacion.total,
    },
    ejercicios: activos.map((ejercicio) => ({
      id: ejercicio.id,
      nombre: ejercicio.nombre,
      frase: fraseCorta(recomendacionDelListado(ejercicio, sesionesDe(datos.sesiones, ejercicio.id)), avanzado).texto,
    })),
    record: record
      ? {
          nombre: record.nombre,
          marca:
            record.tipo === 'peso'
              ? `${formatearPeso(record.valor)}${record.reps ? ` × ${record.reps}` : ''}`
              : `${record.valor} repeticiones`,
          fecha: formatearFecha(record.fecha),
        }
      : null,
    sugerencias: sugerenciasInteligentes({
      hoy,
      estadoHoy,
      ejercicios: activos.map((ejercicio) => ({
        nombre: ejercicio.nombre,
        listo: ejercicio.listoParaSubir,
        marcas: sesionesDe(datos.sesiones, ejercicio.id).flatMap((sesion) => {
          const valor = tendenciaEjercicio([sesion], ejercicio.tipo)[0];
          return valor === undefined ? [] : [{ fecha: sesion.fecha, valor }];
        }),
      })),
    }),
  };

  return (
    <ChatGym
      usuarioId={id}
      preguntaInicial={preguntaInicial(pregunta)}
      contexto={contexto}
      usoInicial={{ usados, limite: limiteDiarioChat() }}
    />
  );
}
