import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, '.env.local');
const envVercelPath = path.join(rootDir, '.env.vercel.local');

function mostrarAdvertencia() {
  console.warn('Aviso: no se pudo renovar la conexión con Vercel. El envío de correos no funcionará en local.');
}

function leerArchivoSiExiste(ruta) {
  try {
    if (!fs.existsSync(ruta)) {
      return '';
    }

    return fs.readFileSync(ruta, 'utf8');
  } catch {
    return '';
  }
}

try {
  execSync('npx vercel env pull .env.vercel.local --yes', {
    cwd: rootDir,
    stdio: 'inherit',
  });

  const contenidoVercel = leerArchivoSiExiste(envVercelPath);
  const lineaToken = contenidoVercel
    .split(/\r?\n/)
    .find((linea) => linea.startsWith('VERCEL_OIDC_TOKEN='));

  if (!lineaToken) {
    throw new Error('No se encontró VERCEL_OIDC_TOKEN en la salida de Vercel.');
  }

  const token = lineaToken.split('=').slice(1).join('=').trim();
  const valorToken = token.replace(/^"|"$/g, '');

  const contenidoLocalActual = leerArchivoSiExiste(envLocalPath);
  const lineasLocales = contenidoLocalActual.split(/\r?\n/);
  const lineasLimpias = lineasLocales.filter(
    (linea) => !linea.startsWith('VERCEL_OIDC_TOKEN='),
  );

  const nuevaLinea = `VERCEL_OIDC_TOKEN="${valorToken}"`;
  const contenidoFinal = [...lineasLimpias, nuevaLinea].join('\n');

  fs.writeFileSync(envLocalPath, `${contenidoFinal.trim()}\n`, 'utf8');
} catch {
  mostrarAdvertencia();
} finally {
  try {
    if (fs.existsSync(envVercelPath)) {
      fs.unlinkSync(envVercelPath);
    }
  } catch {
    // Ignoramos el error de limpieza para que el proyecto pueda arrancar.
  }
}
