import { ImageResponse } from 'next/og';
import { exigirSesion } from '@/lib/auth/sesion';
import { obtenerPerfil, obtenerResumenMes } from '@/lib/dataService';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { nombreParaMostrar } from '@/lib/reglas/perfil';
import { esMesValido, mesDeFecha, textosImagen, tituloMes } from '@/lib/reglas/resumenMes';
import { NOMBRE_APP } from '@/lib/config/marca';

export const dynamic = 'force-dynamic';

// Colores fijos: la imagen se dibuja en el servidor (Satori), que no lee las variables CSS. Son los de la paleta.
const COLOR = {
  fondo: '#6a4bbd', // color-fijo: --color-primario
  fondoFuerte: '#563a9e', // color-fijo: --color-primario-fuerte
  texto: '#ffffff', // color-fijo: texto sobre el primario
  suave: '#efeafb', // color-fijo: --color-primario-suave
} as const;

// El pie: el nombre de la app y, si está configurado, el dominio (APP_URL). Nunca la URL de una vista previa.
function pie(): string {
  const dominio = process.env.APP_URL?.trim() ? new URL(process.env.APP_URL.trim()).hostname : null;
  return dominio ? `${NOMBRE_APP} · ${dominio}` : NOMBRE_APP;
}

// Imagen de "Tu mes en el gym" (formato de historia, 1080 × 1920) de la cuenta de la sesión: no recibe ningún id,
// así que no hay forma de pedir la de otra cuenta. Por defecto, sin pesos, sin nombre ni correo; ?apodo=1 y
// ?pesos=1 los agregan (la persona los enciende antes de compartir).
export const GET = conManejoDeErrores(async (request) => {
  const { id: usuarioId } = await exigirSesion();
  const parametros = new URL(request.url).searchParams;
  const mes = parametros.get('mes') ?? mesDeFecha(hoyBogota());
  if (!esMesValido(mes) || mes > mesDeFecha(hoyBogota())) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El mes no es válido.');
  }
  const conApodo = parametros.get('apodo') === '1';
  const [resumen, perfil] = await Promise.all([
    obtenerResumenMes(usuarioId, mes),
    conApodo ? obtenerPerfil(usuarioId) : Promise.resolve(null),
  ]);
  const textos = textosImagen(resumen, {
    apodo: conApodo && perfil ? nombreParaMostrar(perfil.nombre, perfil.apodo) : null,
    conPesos: parametros.get('pesos') === '1',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '120px 90px',
          backgroundImage: `linear-gradient(160deg, ${COLOR.fondo}, ${COLOR.fondoFuerte})`,
          color: COLOR.texto,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 44, color: COLOR.suave }}>{tituloMes(mes)}</div>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>{textos.titulo}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {textos.cifras.map((cifra) => (
            <div key={cifra.etiqueta} style={{ display: 'flex', alignItems: 'baseline', gap: 28 }}>
              <div style={{ fontSize: 150, fontWeight: 700, lineHeight: 1 }}>{cifra.valor}</div>
              <div style={{ fontSize: 48, color: COLOR.suave }}>{cifra.etiqueta}</div>
            </div>
          ))}
          {textos.records.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {textos.records.map((record) => (
                <div key={record} style={{ fontSize: 40 }}>
                  {record}
                </div>
              ))}
            </div>
          ) : null}
          {textos.estrella ? (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20 }}>
              <div style={{ fontSize: 40, color: COLOR.suave }}>Ejercicio estrella</div>
              <div style={{ fontSize: 64, fontWeight: 700 }}>{textos.estrella}</div>
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 36, color: COLOR.suave }}>{pie()}</div>
      </div>
    ),
    { width: 1080, height: 1920, headers: { 'Cache-Control': 'private, no-store' } },
  );
});
