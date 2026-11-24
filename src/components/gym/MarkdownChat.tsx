import { Children, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icono } from '@/components/ui/Icono';

// Las notas de la app ("✅ Listo: …") conservan el emoji en el texto, porque CHRONO lo lee para saber el
// resultado de una propuesta; en pantalla se dibuja como un ícono SVG.
const MARCA_LISTO = '✅';

function conIconoListo(children: ReactNode): ReactNode {
  const partes = Children.toArray(children);
  const primera = partes[0];
  if (typeof primera !== 'string' || !primera.startsWith(MARCA_LISTO)) return children;
  return (
    <span className="inline-flex items-start gap-1.5">
      <Icono nombre="checkCirculo" className="mt-0.5 h-5 w-5 text-primario" />
      <span>
        {primera.slice(MARCA_LISTO.length).trimStart()}
        {partes.slice(1)}
      </span>
    </span>
  );
}

// react-markdown no interpreta HTML: el texto del asistente no puede inyectar etiquetas en la página.
const COMPONENTES: Components = {
  p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{conIconoListo(children)}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6 marker:text-primario">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-primario">{children}</ol>,
  h1: ({ children }) => <h2 className="mb-2 mt-5 font-titulos text-xl font-bold text-texto first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="mb-2 mt-5 font-titulos text-lg font-bold text-texto first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-4 font-semibold text-texto first:mt-0">{children}</h3>,
  strong: ({ children }) => <strong className="font-semibold text-texto">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} className="text-primario underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-primario pl-4 text-texto-suave">{children}</blockquote>,
  // Los títulos empiezan en h2 (el h1 de la página es CHRONO). Tablas y bloques de código hacen scroll de lado y se
  // pueden enfocar para moverlos con el teclado (WCAG 2.1.1). Bloques de código con scroll horizontal; el código en línea, con fondo suave.
  pre: ({ children }) => (
    <pre tabIndex={0} className="my-3 overflow-x-auto rounded-gym border border-borde bg-fondo p-3 text-sm leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  code: ({ children }) => <code className="rounded bg-primario-suave px-1 py-0.5 text-[0.9em]">{children}</code>,
  table: ({ children }) => (
    <div tabIndex={0} className="my-3 overflow-x-auto rounded-gym border border-borde focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-primario-suave">{children}</thead>,
  th: ({ children }) => <th className="whitespace-nowrap px-3 py-2 font-semibold">{children}</th>,
  // Sin cortes dentro de una celda: en pantallas angostas la tabla se desplaza de lado.
  td: ({ children }) => <td className="whitespace-nowrap border-t border-borde px-3 py-2 tabular-nums">{children}</td>,
};

export function MarkdownChat({ texto }: { texto: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTES}>
      {texto}
    </Markdown>
  );
}
