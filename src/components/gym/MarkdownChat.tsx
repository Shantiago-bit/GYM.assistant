import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// react-markdown no interpreta HTML: el texto del asistente no puede inyectar etiquetas en la página.
const COMPONENTES: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-3 font-semibold first:mt-0">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold text-texto">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} className="text-primario underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-primario-suave px-1 py-0.5 text-[0.9em]">{children}</code>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-gym border border-borde">
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
