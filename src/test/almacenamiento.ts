// localStorage (o sessionStorage) en memoria para las pruebas (el jsdom de este proyecto no los trae). `bloqueado`
// simula un navegador que lo niega (modo privado, sitio bloqueado): cada acceso lanza un error.
export function instalarAlmacenamiento({
  bloqueado = false,
  tipo = 'localStorage',
}: { bloqueado?: boolean; tipo?: 'localStorage' | 'sessionStorage' } = {}): Storage {
  const datos = new Map<string, string>();
  const fallar = () => {
    throw new Error('almacenamiento bloqueado');
  };
  const almacenamiento: Storage = {
    get length() {
      return bloqueado ? fallar() : datos.size;
    },
    clear: () => (bloqueado ? fallar() : datos.clear()),
    getItem: (clave) => (bloqueado ? fallar() : (datos.get(clave) ?? null)),
    key: (indice) => (bloqueado ? fallar() : ([...datos.keys()][indice] ?? null)),
    removeItem: (clave) => (bloqueado ? fallar() : void datos.delete(clave)),
    setItem: (clave, valor) => (bloqueado ? fallar() : void datos.set(clave, String(valor))),
  };
  Object.defineProperty(window, tipo, { value: almacenamiento, configurable: true });
  return almacenamiento;
}
