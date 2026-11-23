import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { BALDOSA_FIJA } from '@/lib/config/marca';

// Ícono de la pantalla de inicio en iPhone y iPad (180 × 180). iOS redondea las esquinas, así que la baldosa va a
// sangre (sin borde ni esquinas propias) y el escudo con la barra ocupa el 70 %, como en el ícono de la app.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function IconoApple() {
  const simbolo = readFileSync(path.join(process.cwd(), 'Doc/marca/agon/agon-simbolo.svg'));
  const datos = `data:image/svg+xml;base64,${simbolo.toString('base64')}`;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: BALDOSA_FIJA }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori dibuja <img>, no next/image */}
        <img src={datos} width={126} height={126} alt="" />
      </div>
    ),
    size,
  );
}
