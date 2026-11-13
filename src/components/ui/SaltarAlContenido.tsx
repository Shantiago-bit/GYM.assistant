// Primer elemento enfocable de cada página: lleva el foco al <main id="contenido">, saltando el menú.
export function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only rounded-gym bg-superficie px-4 py-3 font-semibold text-texto shadow-soft focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
    >
      Saltar al contenido
    </a>
  );
}
