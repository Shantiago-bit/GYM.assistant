import { LoginForm } from '@/components/auth/LoginForm';
import { correoDeContacto } from '@/lib/correo';
import { VolverAlInicio } from '@/components/auth/VolverAlInicio';
import { LogotipoKairos } from '@/components/marca/LogotipoKairos';

export const metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen items-center justify-center fondo-marca px-4 py-10 sm:px-6">
      <div className="w-full max-w-md rounded-[2rem] border border-borde bg-superficie p-5 shadow-elevada backdrop-blur-xl sm:p-8">
        <div className="-ml-3 -mt-1 mb-4">
          <VolverAlInicio />
        </div>
        <div className="mb-8 text-center">
          <LogotipoKairos variante="apilada" tamano="md" className="mb-2" />
          <h1 className="mt-3 text-titulo-1 font-bold text-texto">Inicia sesión</h1>
        </div>

        <LoginForm contacto={correoDeContacto()} />
      </div>
    </main>
  );
}
