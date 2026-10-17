import { notFound } from 'next/navigation';

import { PruebaCorreoFormulario } from './prueba-correo-form';

export default function PruebaCorreoPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <PruebaCorreoFormulario />;
}
