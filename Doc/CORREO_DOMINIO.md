# Correo con dominio propio (Resend)

Hoy los correos de Gym Assistant (confirmación de cuenta, recuperación de contraseña, autorización del tutor) salen por Gmail. Funciona, pero tiene dos límites:

- Gmail permite unos **500 correos al día** desde una cuenta personal.
- Los correos llegan "de" una dirección `@gmail.com`, y los filtros de spam confían más en un dominio propio bien configurado.

Con un **dominio propio** (por ejemplo `gymassistant.com.co`) y **Resend**, los correos salen de `no-responder@tudominio`, con las firmas que piden Gmail y Outlook, y con un límite más alto. El código ya está listo: solo hay que comprar el dominio, verificarlo y configurar tres variables. Gmail queda de respaldo: si Resend no puede aceptar un correo (sin conexión o clave inválida), la app lo intenta una vez por Gmail.

> Los precios y límites de abajo son aproximados y cambian. Revisa la página de cada servicio antes de pagar.

## 1. Comprar un dominio

Un dominio se paga por año. Opciones habituales:

| Dónde | Ejemplo | Costo aproximado al año |
|---|---|---|
| [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) | `.com` | 10 a 12 USD (precio de costo, sin recargo; el DNS es gratis y muy rápido) |
| [Porkbun](https://porkbun.com) o [Namecheap](https://www.namecheap.com) | `.com`, `.app`, `.dev` | 10 a 20 USD (el primer año suele tener descuento) |
| Registradores de Colombia (por ejemplo, el de [dominio.co](https://www.dominio.co)) | `.co` o `.com.co` | 25 a 45 USD (`.co`), menos para `.com.co` |

Recomendación: **Cloudflare Registrar con un `.com`**, porque el DNS queda en el mismo lugar y los cambios se aplican en minutos. Necesitas una tarjeta, y el dominio queda a tu nombre: usa tu correo y activa la verificación en dos pasos en la cuenta del registrador.

Elige un nombre corto y fácil de dictar. Activa la **renovación automática**: si el dominio vence, los correos dejan de salir y otra persona podría comprarlo.

## 2. Añadir el dominio en Resend

1. Entra a <https://resend.com> con la cuenta que ya usa la app (o crea una; el plan gratuito permite unos 3.000 correos al mes y 100 al día).
2. **Domains → Add Domain**.
3. Escribe un **subdominio para el correo**, por ejemplo `correo.tudominio.com`, en lugar del dominio pelado. Así la reputación de los correos de la app queda separada de cualquier otro uso del dominio. (Si prefieres, también sirve `tudominio.com`.)
4. Región: la más cercana a tus usuarios que ofrezca (por ejemplo, **us-east-1**).
5. **Add**. Resend muestra una tabla de **registros DNS** para crear. Déjala abierta.

## 3. Crear los registros DNS

En el panel del registrador (Cloudflare: el dominio → **DNS → Records → Add record**), crea **exactamente** los registros que muestra Resend. Suelen ser:

| Tipo | Nombre | Valor | Para qué |
|---|---|---|---|
| `MX` | `send.correo` | `feedback-smtp.us-east-1.amazonses.com` (prioridad 10) | Recibir los avisos de rebote |
| `TXT` | `send.correo` | `v=spf1 include:amazonses.com ~all` | **SPF**: autoriza a Resend a enviar por tu dominio |
| `TXT` | `resend._domainkey.correo` | `p=MIGfMA0GCSqGSIb3…` (una clave larga) | **DKIM**: firma cada correo para probar que no se alteró |

Los valores de arriba son de ejemplo: **copia los tuyos de Resend** con el botón de copiar, sin espacios extra. En Cloudflare, si aparece la nube naranja (*Proxy*), déjala en gris (*DNS only*): los registros de correo no pasan por el proxy.

### Registro DMARC (lo añades tú)

DMARC le dice a Gmail y Outlook qué hacer si un correo dice venir de tu dominio pero no pasa SPF ni DKIM. Empieza en modo observación (`p=none`): no bloquea nada y te deja ver informes.

| Tipo | Nombre | Valor |
|---|---|---|
| `TXT` | `_dmarc` (en el dominio principal: `_dmarc.tudominio.com`) | `v=DMARC1; p=none; rua=mailto:dmarc@tudominio.com` |

- `rua` es a dónde llegan los informes diarios. Puede ser cualquier buzón tuyo; si no quieres informes, quita `; rua=…`.
- Después de unas semanas sin problemas, puedes subir a `p=quarantine` (los correos falsos van a spam) y más adelante a `p=reject`.

## 4. Esperar la verificación

- En Resend, pulsa **Verify DNS Records**. Con Cloudflare suele tardar unos minutos; con otros registradores, hasta 24 a 48 horas.
- Cada registro pasa a **Verified** y el dominio queda en verde. Si uno queda en **Failed**, revisa que el nombre no tenga el dominio repetido (algunos paneles lo agregan solos: `send.correo.tudominio.com.tudominio.com`) y que el valor no tenga comillas ni espacios de más.
- Puedes comprobarlo desde tu computadora: `nslookup -type=TXT resend._domainkey.correo.tudominio.com`.

## 5. Configurar Vercel

1. En Resend: **API Keys → Create API Key** → nombre `gym-assistant-produccion` → permiso **Sending access** → dominio: el tuyo → **Add**. Copia la clave (`re_…`); solo se muestra una vez.
2. En Vercel → el proyecto → **Settings → Environment Variables**, para **Production** (y Preview, si quieres que las vistas previas envíen de verdad):

   | Variable | Valor |
   |---|---|
   | `RESEND_API_KEY` | la clave del paso anterior (márcala como *Sensitive*) |
   | `RESEND_FROM` | `Gym Assistant <no-responder@correo.tudominio.com>` |
   | `CORREO_PROVEEDOR` | `auto` (usa Resend y deja Gmail de respaldo) o `resend` |

   No borres `GMAIL_USER` ni `GMAIL_APP_PASSWORD`: son el respaldo.
3. **Redeploy** (Deployments → el último → los tres puntos → Redeploy).

## 6. Probar la entrega

1. Pon las mismas tres variables en tu `.env.local`.
2. Prueba solo Resend:
   ```bash
   npm run correo:probar -- tu.correo@gmail.com --proveedor resend
   ```
   Debe decir `OK  Correo aceptado…`.
3. Repite con una cuenta de **Outlook/Hotmail**:
   ```bash
   npm run correo:probar -- tu.correo@outlook.com --proveedor resend
   ```
4. Revisa en cada buzón que llegó a la **bandeja principal** (no a Spam, Correo no deseado ni Promociones). En Gmail, abre el correo → los tres puntos → **Mostrar original**: SPF, DKIM y DMARC deben decir **PASS**.
5. Prueba el flujo de la app: regístrate con un correo nuevo en el sitio y comprueba que la confirmación llega desde `no-responder@correo.tudominio.com`.
6. Si algo falla, `npm run correo:historial -- tu.correo@gmail.com` muestra cada intento, con su proveedor y el error.

Para volver a Gmail en cualquier momento: `CORREO_PROVEEDOR=gmail` en Vercel y Redeploy.

## Opcional (no implementado): usar el dominio también para la app

Con el dominio puedes publicar la app en `app.tudominio.com` (o en el dominio principal) en lugar de `gymassistant-five.vercel.app`. Si lo haces, hay que cambiar varias cosas a la vez:

1. **Vercel**: Settings → **Domains → Add** → `app.tudominio.com`, y crea en el DNS el registro que indique Vercel (normalmente un `CNAME` a `cname.vercel-dns.com`). Déjalo como dominio principal y que el `.vercel.app` redirija a él.
2. **`APP_URL`** en Vercel: `https://app.tudominio.com`. Es la base de los enlaces de los correos (confirmación, recuperación, autorización del tutor, `src/lib/urlBase.ts`).
3. **Supabase → Authentication → URL Configuration**: la **Site URL** pasa a `https://app.tudominio.com`, y en **Redirect URLs** se añade `https://app.tudominio.com/**`. Deja `http://localhost:3000/**` para trabajar en local.
4. **Enlaces de correos ya enviados**: los que apuntan al dominio viejo siguen funcionando mientras el `.vercel.app` redirija al nuevo. No lo quites hasta que hayan vencido (30 minutos la recuperación, 7 días la autorización del tutor).
5. **Sentry**: nada que cambiar (el entorno y el release no dependen del dominio).
6. Revisa la página de privacidad y el README, que nombran la dirección publicada.
