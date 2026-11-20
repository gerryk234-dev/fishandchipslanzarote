# Poner One Life Club Manager en internet (webapp accesible desde cualquier dispositivo)

La opción más sencilla sin tocar una terminal: **Railway** (railway.app,
~5 $/mes, se paga con tarjeta). Se conecta directamente a GitHub y despliega
esta carpeta sola. Pasos exactos:

## 1. Crear el proyecto

1. Entra en **railway.app** → *Login with GitHub* (usa la cuenta dueña de este repositorio)
2. **New Project → Deploy from GitHub repo** → elige este repositorio
3. En *Settings* del servicio:
   - **Root Directory**: `club-manager`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

## 2. Disco para la base de datos (imprescindible)

Sin esto, los datos se borrarían en cada despliegue.

1. En el servicio → **Volumes → New Volume**
2. **Mount path**: `/data`

## 3. Variables de entorno (pestaña *Variables*)

```
CLUB_DATA_DIR=/data
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=1
SMTP_USER=onelifesocialclub@gmail.com
SMTP_PASS=<la contraseña de aplicación de Gmail>
SMTP_FROM=One Life Lanzarote <onelifesocialclub@gmail.com>
```

## 4. Dominio

- Railway te da gratis una URL tipo `https://xxxx.up.railway.app` — ya con
  HTTPS, funciona en cualquier móvil del mundo (y la báscula funciona porque
  es HTTPS).
- Para usar `club.onelifelanzarote.com`: en Railway → *Settings → Domains →
  Custom Domain*, y en el DNS de onelifelanzarote.com crea el registro CNAME
  que Railway te indique.

## 5. Primer arranque

En el primer arranque con las variables puestas:

- El **importador de Gmail** lee todo el buzón y carga todos los registrados
  de la web en Socios (pendientes de aprobar, con su selfie)
- Credenciales iniciales: código del club `onelife`, PIN admin `1234` —
  **cámbialas enseguida**: en Railway → *Shell* del servicio:
  `cd server && npm run set-secrets -- --club-code NUEVO --admin-pin 9876`

## Alternativa: VPS propio (Hetzner ~4,5 €/mes)

Más barato y con control total, pero requiere terminal. Si eliges esta vía,
pide el script de instalación — un solo comando deja todo funcionando
(Node, la app, HTTPS con Caddy y arranque automático).

## Nota sobre GitHub Pages

GitHub solo sirve archivos estáticos: puede alojar la *demo* pero no el
sistema real (base de datos compartida, emails, importador). Por eso hace
falta uno de los dos caminos de arriba.
