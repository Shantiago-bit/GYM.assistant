import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistroForm } from './RegistroForm';

const fetchFalso = vi.fn();

const respuesta = (estado: number, cuerpo: unknown) => ({ ok: estado < 400, status: estado, json: async () => cuerpo });
const ok = (datos: unknown) => respuesta(200, { ok: true, datos });
const fallo = (estado: number, mensaje: string) => respuesta(estado, { ok: false, error: { codigo: 'X', mensaje } });

const PERFIL = { nombre: 'Santiago Carbono', apodo: 'Santi', fechaNacimiento: '1998-04-02', genero: 'hombre', dias: [1, 3, 5] };

function llenarPaso1(datos = PERFIL) {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: datos.nombre } });
  fireEvent.change(screen.getByLabelText('¿Cómo quieres que te llamemos?'), { target: { value: datos.apodo } });
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: datos.fechaNacimiento } });
  fireEvent.change(screen.getByLabelText('Género'), { target: { value: datos.genero } });
  fireEvent.click(screen.getByRole('button', { name: '3 días (L-X-V)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
}

function llenarPaso2(contrasena = 'secure-password-123', confirmacion = contrasena) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: '  SANTIAGO@example.com ' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: contrasena } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: confirmacion } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));
}

const cuerpoEnviado = (llamada: number) => JSON.parse(fetchFalso.mock.calls[llamada]![1].body);

describe('registro en dos pasos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchFalso);
    fetchFalso.mockImplementation(async (url: string) =>
      url === '/api/auth/registro/perfil'
        ? ok({ requiereAutorizacion: false })
        : ok({ mensaje: 'Si el correo es nuevo, recibirás un enlace para confirmar tu cuenta.' }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('paso 1 revisa los datos y paso 2 crea la cuenta con el perfil', async () => {
    render(<RegistroForm />);
    expect(screen.getByRole('heading', { name: 'Cuéntanos de ti' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('href', '/privacidad');
    llenarPaso1();

    expect(await screen.findByRole('heading', { name: 'Tu cuenta' })).toBeInTheDocument();
    expect(fetchFalso.mock.calls[0]![0]).toBe('/api/auth/registro/perfil');
    expect(cuerpoEnviado(0)).toEqual(PERFIL);
    expect(screen.queryByLabelText('Correo de tu mamá, papá o tutor')).not.toBeInTheDocument();

    llenarPaso2();
    expect(await screen.findByRole('status')).toHaveTextContent(/enlace para confirmar/i);
    expect(fetchFalso.mock.calls[1]![0]).toBe('/api/auth/registro');
    expect(cuerpoEnviado(1)).toEqual({ perfil: PERFIL, email: 'santiago@example.com', password: 'secure-password-123' });
  });

  it('"Atrás" vuelve al paso 1 sin perder lo escrito', async () => {
    render(<RegistroForm />);
    llenarPaso1();
    await screen.findByRole('heading', { name: 'Tu cuenta' });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'santi@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Santiago Carbono');
    expect(screen.getByLabelText('¿Cómo quieres que te llamemos?')).toHaveValue('Santi');
    expect(screen.getByLabelText('Género')).toHaveValue('hombre');

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Tu cuenta' });
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('santi@example.com');
  });

  it('a un menor le pide el correo de su tutor, distinto al suyo', async () => {
    fetchFalso.mockResolvedValueOnce(ok({ requiereAutorizacion: true }));
    render(<RegistroForm />);
    llenarPaso1();

    const tutor = await screen.findByLabelText('Correo de tu mamá, papá o tutor');
    expect(screen.getByText('Le enviaremos un correo para que autorice tu cuenta. Podrás entrar cuando acepte.')).toBeInTheDocument();
    fireEvent.change(tutor, { target: { value: 'santiago@example.com' } });
    llenarPaso2();

    expect(screen.getByRole('alert')).toHaveTextContent('El correo de tu tutor debe ser distinto al tuyo.');
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('muestra el número de intento si el nombre no está permitido', async () => {
    fetchFalso.mockResolvedValueOnce(fallo(422, 'Ese nombre no está permitido. Elige otro, por favor. (Intento 2 de 5)'));
    render(<RegistroForm />);
    llenarPaso1();

    expect(await screen.findByRole('alert')).toHaveTextContent('(Intento 2 de 5)');
    expect(screen.getByRole('heading', { name: 'Cuéntanos de ti' })).toBeInTheDocument();
  });

  it('al quinto intento cancela el registro y borra el formulario', async () => {
    const cancelado =
      'Se canceló la creación de la cuenta porque el nombre elegido no cumple las normas. Puedes volver a intentarlo en 30 minutos.';
    fetchFalso.mockResolvedValueOnce(fallo(429, cancelado));
    render(<RegistroForm />);
    llenarPaso1();

    expect(await screen.findByRole('alert')).toHaveTextContent(cancelado);
    expect(screen.getByLabelText('Nombre')).toHaveValue('');
    expect(screen.getByLabelText('¿Cómo quieres que te llamemos?')).toHaveValue('');
    expect(screen.getByLabelText('Género')).toHaveValue('');
  });

  it('valida en el navegador antes de enviar', () => {
    render(<RegistroForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu nombre');
    llenarPaso1({ ...PERFIL, fechaNacimiento: '2999-01-01' });
    expect(screen.getByRole('alert')).toHaveTextContent('La fecha de nacimiento no puede ser futura.');
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('no registra contraseñas que no coinciden', async () => {
    render(<RegistroForm />);
    llenarPaso1();
    await screen.findByRole('heading', { name: 'Tu cuenta' });
    llenarPaso2('secure-password-123', 'different-password');

    expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('muestra el error que devuelve la app y avisa si no hay conexión', async () => {
    render(<RegistroForm />);
    llenarPaso1();
    await screen.findByRole('heading', { name: 'Tu cuenta' });

    fetchFalso.mockResolvedValueOnce(fallo(502, 'No se pudo enviar el correo de confirmación. Intenta de nuevo en unos minutos.'));
    llenarPaso2();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar el correo de confirmación');

    fetchFalso.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo conectar/));
  });
});

describe('cuando el correo tarda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchFalso);
    fetchFalso.mockImplementation(async (url: string) =>
      url === '/api/auth/registro/perfil'
        ? ok({ requiereAutorizacion: false })
        : url === '/api/auth/registro/reenviar'
          ? ok({ mensaje: 'Si hay una cuenta pendiente de confirmar con ese correo, te enviamos un nuevo enlace.' })
          : ok({ mensaje: 'Si el correo es nuevo, recibirás un enlace para confirmar tu cuenta.' }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('muestra dónde buscarlo y "Reenviar enlace" con una cuenta regresiva de 60 s', async () => {
    render(<RegistroForm />);
    llenarPaso1();
    await screen.findByRole('heading', { name: 'Tu cuenta' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    llenarPaso2();

    expect(
      await screen.findByText('¿No te llegó? Revisa las carpetas Spam, Promociones o Correo no deseado. Puede tardar unos minutos.'),
    ).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: /Reenviar enlace \(60 s\)/ });
    expect(boton).toBeDisabled();

    for (let segundo = 0; segundo < 61; segundo++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    const habilitado = screen.getByRole('button', { name: 'Reenviar enlace' });
    expect(habilitado).toBeEnabled();

    fireEvent.click(habilitado);
    await waitFor(() =>
      expect(fetchFalso).toHaveBeenCalledWith('/api/auth/registro/reenviar', expect.objectContaining({ method: 'POST' })),
    );
    expect(JSON.parse(fetchFalso.mock.calls.at(-1)![1].body)).toEqual({ email: 'santiago@example.com' });
    expect(await screen.findByText(/te enviamos un nuevo enlace/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reenviar enlace \(\d+ s\)/ })).toBeDisabled();
  });

  it('un error del servidor no se muestra como "correo no válido"', async () => {
    render(<RegistroForm />);
    llenarPaso1();
    await screen.findByRole('heading', { name: 'Tu cuenta' });
    fetchFalso.mockResolvedValueOnce(fallo(500, 'Ocurrió un error inesperado. Intente de nuevo.'));
    llenarPaso2();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Ocurrió un error inesperado');
    expect(alerta).not.toHaveTextContent(/correo válido|correo no válido/i);
    expect(screen.queryByText(/¿No te llegó\?/)).not.toBeInTheDocument();
  });
});

describe('días de entrenamiento en el registro', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('pide elegir al menos un día antes de continuar', () => {
    vi.stubGlobal('fetch', fetchFalso);
    vi.clearAllMocks();
    render(<RegistroForm />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: PERFIL.nombre } });
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: PERFIL.fechaNacimiento } });
    fireEvent.change(screen.getByLabelText('Género'), { target: { value: PERFIL.genero } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Elige al menos un día');
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: '¿Qué días sueles entrenar?' })).toBeInTheDocument();
  });
});
