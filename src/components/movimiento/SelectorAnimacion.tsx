'use client';

import { useId, useState } from 'react';
import { aplicarNivelMovimiento, useNivelMovimiento } from '@/components/ui/ProveedorMovimiento';
import { enviarJson } from '@/lib/http/cliente';
import { ETIQUETAS_NIVEL, NIVELES_ANIMACION, type NivelAnimacion } from '@/lib/reglas/animacion';

// Preferencia "Animaciones" del perfil: Completas, Suaves o Mínimas, y la vibración al guardar. Se aplica al
// instante (cookies y <html>) y se guarda en el perfil; si falla, vuelve a como estaba.
export function SelectorAnimacion({ nivelInicial, vibracionInicial }: { nivelInicial: NivelAnimacion; vibracionInicial: boolean }) {
  const [nivel, setNivel] = useState(nivelInicial);
  const [vibracion, setVibracion] = useState(vibracionInicial);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const { sistemaReduce } = useNivelMovimiento();
  const idTitulo = useId();
  const idAviso = useId();

  const guardar = async (nuevoNivel: NivelAnimacion, nuevaVibracion: boolean) => {
    const anterior = { nivel, vibracion };
    setNivel(nuevoNivel);
    setVibracion(nuevaVibracion);
    aplicarNivelMovimiento(nuevoNivel, nuevaVibracion);
    setMensaje(null);
    const respuesta = await enviarJson('/api/gym/perfil/animacion', { nivel: nuevoNivel, vibracion: nuevaVibracion });
    if (!respuesta.ok) {
      setNivel(anterior.nivel);
      setVibracion(anterior.vibracion);
      aplicarNivelMovimiento(anterior.nivel, anterior.vibracion);
      setMensaje({ texto: `No se pudo guardar: ${respuesta.mensaje}`, error: true });
      return;
    }
    setMensaje({ texto: 'Listo: guardado.', error: false });
  };

  return (
    <div className="space-y-3">
      <fieldset aria-describedby={sistemaReduce ? idAviso : undefined}>
        <legend id={idTitulo} className="font-medium text-texto">
          Animaciones
        </legend>
        {sistemaReduce ? (
          <p id={idAviso} className="mt-1 rounded-gym bg-aviso-suave px-3 py-2 text-sm text-aviso">
            Tu sistema pide reducir el movimiento, así que la app usa Mínimas aunque elijas otro nivel.
          </p>
        ) : null}
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {NIVELES_ANIMACION.map((opcion) => (
            <label
              key={opcion}
              className="flex min-h-11 cursor-pointer gap-3 rounded-gym border border-borde p-3 has-[:checked]:border-primario has-[:checked]:bg-primario-suave has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primario"
            >
              <input
                type="radio"
                name="nivel-animacion"
                value={opcion}
                checked={nivel === opcion}
                onChange={() => void guardar(opcion, vibracion)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span>
                <span className="block font-semibold text-texto">
                  {ETIQUETAS_NIVEL[opcion].nombre}
                  {opcion === 'completas' ? <span className="font-normal text-texto-suave"> (por defecto)</span> : null}
                </span>
                <span className="block text-sm text-texto-suave">{ETIQUETAS_NIVEL[opcion].descripcion}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-texto">
        <input type="checkbox" checked={vibracion} onChange={(evento) => void guardar(nivel, evento.target.checked)} className="h-4 w-4" />
        Vibración breve al guardar una sesión y al lograr una meta (si tu teléfono la tiene)
      </label>
      <p role="status" className={`text-sm ${mensaje?.error ? 'text-peligro' : 'text-texto-suave'}`}>
        {mensaje?.texto ?? ''}
      </p>
    </div>
  );
}
