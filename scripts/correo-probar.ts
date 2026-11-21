// npm run correo:probar -- <correo> [--proveedor gmail|resend]
// Sin --proveedor, envía como la app (CORREO_PROVEEDOR, con segundo intento si el primero falla antes de
// aceptar). Con --proveedor, prueba solo ese proveedor:
//   gmail:  verifica GMAIL_USER y GMAIL_APP_PASSWORD con el servidor SMTP y envía.
//   resend: revisa que RESEND_FROM tenga un dominio propio y envía con RESEND_API_KEY.
// Cada envío queda en registro_correos (tipo 'prueba'). Sirve para probar con las credenciales de producción
// sin abrir /api/correo/prueba, que en producción responde 404.
import { enviarCorreo, obtenerCredencialesGmail, obtenerTransporteGmail, proveedoresDeEnvio } from '@/lib/correo';
import { cerrarConexiones } from '@/lib/dataService';
import { dominioDelRemitente, esDominioPropio, mascaraCorreo, type ProveedorCorreo } from '@/lib/reglas/correo';

const argumentos = process.argv.slice(2);
const indice = argumentos.indexOf('--proveedor');
const proveedorPedido = indice >= 0 ? argumentos[indice + 1] : undefined;
const correo = argumentos.find((argumento, i) => argumento.includes('@') && i !== indice + 1);

if (!correo || (indice >= 0 && proveedorPedido !== 'gmail' && proveedorPedido !== 'resend')) {
  console.error('Uso: npm run correo:probar -- <correo> [--proveedor gmail|resend]');
  process.exit(1);
}
const proveedor = proveedorPedido as ProveedorCorreo | undefined;

function explicarGmail(error: unknown): string {
  const codigo = (error as { code?: string })?.code;
  const respuesta = (error as { responseCode?: number })?.responseCode;
  if (codigo === 'EAUTH' || respuesta === 535) {
    return 'Gmail rechazó el usuario o la contraseña de aplicación. Revisa GMAIL_USER y genera una contraseña de aplicación nueva en myaccount.google.com/apppasswords (la verificación en dos pasos debe estar activa).';
  }
  if (codigo === 'ETIMEDOUT' || codigo === 'ECONNECTION' || codigo === 'ESOCKET') {
    return 'No se pudo conectar con smtp.gmail.com:465 (red o firewall). Prueba desde otra red.';
  }
  return error instanceof Error ? error.message : String(error);
}

// Comprobaciones previas de cada proveedor: true si se puede intentar el envío.
async function revisarGmail(): Promise<boolean> {
  const credenciales = obtenerCredencialesGmail();
  if (!credenciales) {
    console.error('FALLA  Faltan GMAIL_USER o GMAIL_APP_PASSWORD en .env.local.');
    return false;
  }
  console.log(`Verificando Gmail con la cuenta ${mascaraCorreo(credenciales.usuario)}…`);
  try {
    await obtenerTransporteGmail(credenciales).verify();
    console.log('OK     Credenciales de Gmail aceptadas por smtp.gmail.com.');
    return true;
  } catch (error) {
    console.error(`FALLA  ${explicarGmail(error)}`);
    return false;
  }
}

function revisarResend(): boolean {
  const remitente = process.env.RESEND_FROM;
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.error('FALLA  Falta RESEND_API_KEY en .env.local (Resend → API Keys).');
    return false;
  }
  if (!esDominioPropio(remitente)) {
    const actual = remitente ? `usa el dominio ${dominioDelRemitente(remitente) ?? '(sin dominio)'}` : 'no está definido';
    console.error(
      `FALLA  RESEND_FROM ${actual}. Debe ser de tu dominio verificado, por ejemplo "Gym Assistant <no-responder@midominio.com>" (ver Doc/CORREO_DOMINIO.md).`,
    );
    return false;
  }
  console.log(`OK     Resend con el remitente de ${dominioDelRemitente(remitente)}.`);
  return true;
}

try {
  const orden = proveedor ? [proveedor] : proveedoresDeEnvio();
  console.log(proveedor ? `Probando solo ${proveedor}.` : `Orden de envío según CORREO_PROVEEDOR: ${orden.join(' → ')}.`);

  const listo = proveedor === 'gmail' ? await revisarGmail() : proveedor === 'resend' ? revisarResend() : true;
  if (!listo) {
    process.exitCode = 1;
  } else {
    const resultado = await enviarCorreo(
      {
        para: correo,
        asunto: 'Prueba de correo de Gym Assistant',
        html: `<div style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.6;">
          <h2>Prueba de correo</h2>
          <p>Este correo lo envió <strong>npm run correo:probar</strong> para comprobar la entrega.</p>
          <p>Si lo recibes en la bandeja principal, el envío funciona.</p>
        </div>`,
        tipo: 'prueba',
      },
      proveedor ? { proveedor } : {},
    );
    if (resultado.ok) {
      console.log(`OK     Correo aceptado para ${mascaraCorreo(correo)}. Id del mensaje: ${resultado.id}`);
      console.log('       Revisa que llegue a la bandeja principal (no a Spam ni a Promociones).');
    } else {
      console.error(`FALLA  No se envió: ${resultado.error}`);
      console.error('       npm run correo:historial -- <correo> muestra cada intento y su proveedor.');
      process.exitCode = 1;
    }
  }
} finally {
  await cerrarConexiones();
}
