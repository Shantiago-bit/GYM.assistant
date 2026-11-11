'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Avatar } from '@/components/gym/Avatar';
import { Boton } from '@/components/ui/Boton';
import { FOTO_LADO_PX, FOTO_MAX_BYTES } from '@/lib/config/gym';
import { enviarJson } from '@/lib/http/cliente';

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];

// Recorta el centro de la foto en un cuadrado de hasta 512 px y la pasa a WebP en el navegador, sin
// dependencias. Si el navegador no sabe generar WebP, toBlob devuelve PNG; el servidor acepta ambos.
async function prepararFoto(archivo: File): Promise<Blob> {
  const url = URL.createObjectURL(archivo);
  try {
    const imagen = await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const elemento = new Image();
      elemento.onload = () => resolver(elemento);
      elemento.onerror = () => rechazar(new Error('imagen ilegible'));
      elemento.src = url;
    });
    const lado = Math.min(imagen.naturalWidth, imagen.naturalHeight);
    const destino = Math.min(FOTO_LADO_PX, lado);
    const lienzo = document.createElement('canvas');
    lienzo.width = destino;
    lienzo.height = destino;
    const contexto = lienzo.getContext('2d');
    if (!contexto || lado === 0) throw new Error('sin lienzo');
    contexto.drawImage(
      imagen,
      (imagen.naturalWidth - lado) / 2,
      (imagen.naturalHeight - lado) / 2,
      lado,
      lado,
      0,
      0,
      destino,
      destino,
    );
    return await new Promise<Blob>((resolver, rechazar) =>
      lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('sin imagen'))), 'image/webp', 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FotoPerfil({ nombre, avatarUrl }: { nombre: string; avatarUrl: string | null }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  const subir = async (archivo: File) => {
    setMensaje(null);
    if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
      setMensaje({ texto: 'La foto debe ser una imagen JPEG, PNG o WebP.', error: true });
      return;
    }
    setOcupado(true);
    try {
      const foto = await prepararFoto(archivo);
      if (foto.size > FOTO_MAX_BYTES) {
        setMensaje({ texto: 'La foto pesa demasiado. Prueba con otra.', error: true });
        return;
      }
      const formulario = new FormData();
      formulario.append('foto', foto, 'avatar.webp');
      const respuesta = await fetch('/api/gym/perfil/foto', { method: 'POST', body: formulario });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        datos?: { avatarUrl: string | null };
        error?: { mensaje: string };
      };
      if (!cuerpo.ok) {
        setMensaje({ texto: cuerpo.error?.mensaje ?? 'No se pudo guardar la foto.', error: true });
        return;
      }
      setUrl(cuerpo.datos?.avatarUrl ?? null);
      setMensaje({ texto: 'Foto actualizada.', error: false });
      router.refresh();
    } catch {
      setMensaje({ texto: 'No se pudo leer esa imagen. Prueba con otra.', error: true });
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const quitar = async () => {
    setMensaje(null);
    setOcupado(true);
    const respuesta = await enviarJson('/api/gym/perfil/foto', undefined, 'DELETE');
    setOcupado(false);
    if (!respuesta.ok) {
      setMensaje({ texto: respuesta.mensaje, error: true });
      return;
    }
    setUrl(null);
    setMensaje({ texto: 'Foto eliminada.', error: false });
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar url={url} nombre={nombre} tamano="grande" className="ring-4 ring-primario-suave" />
      <input
        ref={entrada}
        type="file"
        accept={TIPOS_ACEPTADOS.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0];
          if (archivo) void subir(archivo);
        }}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Boton variante="secundario" disabled={ocupado} onClick={() => entrada.current?.click()}>
          {ocupado ? 'Guardando…' : 'Cambiar foto'}
        </Boton>
        {url ? (
          <Boton variante="fantasma" disabled={ocupado} onClick={() => void quitar()}>
            Quitar foto
          </Boton>
        ) : null}
      </div>
      {mensaje ? (
        <p role={mensaje.error ? 'alert' : 'status'} className={`text-sm ${mensaje.error ? 'text-red-700' : 'text-texto-suave'}`}>
          {mensaje.texto}
        </p>
      ) : null}
    </div>
  );
}
