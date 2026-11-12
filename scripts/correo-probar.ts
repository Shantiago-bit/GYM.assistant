// npm run correo:probar -- <correo>
// 1) Verifica las credenciales de Gmail (GMAIL_USER y GMAIL_APP_PASSWORD de .env.local) con el servidor SMTP.
// 2) Envía un correo de prueba (tipo 'prueba', queda en registro_correos) y muestra el resultado.
// Sirve para probar con las credenciales de producción sin abrir /api/correo/prueba, que en producción
// responde 404.
import { enviarCorreo, obtenerCredencialesGmail, obtenerTransporteGmail } from '@/lib/correo';
import { cerrarConexiones } from '@/lib/dataService';
import { mascaraCorreo } from '@/lib/reglas/correo';

const correo = process.argv[2];
if (!correo || !correo.includes('@')) {
  console.error('Uso: npm run correo:probar -- <correo>');
  process.exit(1);
}

function explicar(error: unknown): string {
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

try {
  const credenciales = obtenerCredencialesGmail();
  if (!credenciales) {
    console.error(
      'FALLA  Faltan GMAIL_USER o GMAIL_APP_PASSWORD en .env.local. Sin ellas la app usa Resend, que solo entrega al dueño de su cuenta.',
    );
    process.exitCode = 1;
  } else {
    console.log(`Verificando Gmail con la cuenta ${mascaraCorreo(credenciales.usuario)}…`);
    try {
      await obtenerTransporteGmail(credenciales).verify();
      console.log('OK     Credenciales de Gmail aceptadas por smtp.gmail.com.');
    } catch (error) {
      console.error(`FALLA  ${explicar(error)}`);
      process.exitCode = 1;
    }

    if (!process.exitCode) {
      const resultado = await enviarCorreo({
        para: correo,
        asunto: 'Prueba de correo de Gym Assistant',
        html: `<div style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.6;">
          <h2>Prueba de correo</h2>
          <p>Este correo lo envió <strong>npm run correo:probar</strong> para comprobar la entrega.</p>
          <p>Si lo recibes, el envío por Gmail funciona.</p>
        </div>`,
        tipo: 'prueba',
      });
      if (resultado.ok) {
        console.log(`OK     Gmail aceptó el correo para ${mascaraCorreo(correo)}. Id del mensaje: ${resultado.id}`);
        console.log('       Si no aparece en la bandeja, revisa Spam y Promociones, y la carpeta Enviados de la cuenta de Gmail.');
      } else {
        console.error(`FALLA  No se envió: ${resultado.error}`);
        process.exitCode = 1;
      }
    }
  }
} finally {
  await cerrarConexiones();
}
