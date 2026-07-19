# One Life Lanzarote — Club Manager

Sistema de gestión multi-dispositivo para el club: dispensario, socios con
pre-registro por invitación, inventario e informes de administración.

Todos los datos viven en **un servidor central** con base de datos SQLite.
Todos los mostradores (tablets, portátiles, móviles) usan la misma web y ven
los mismos datos en tiempo real (sondeo cada 15 s).

```
club-manager/
├── server/   API + base de datos (Node.js, Express, SQLite integrado)
└── client/   Interfaz web (React + Vite) — el port del prototipo original
```

## Requisitos

- Node.js 22 o superior (usa el SQLite integrado de Node — sin dependencias nativas)

## Desarrollo

```bash
# Terminal 1 — API en :4000
cd server && npm install && npm run dev

# Terminal 2 — interfaz en :5173 (proxy /api → :4000)
cd client && npm install && npm run dev
```

Credenciales de demo (primera ejecución siembra datos de prueba):

- **Código del club** (autoriza cada dispositivo una vez): `onelife`
- **PIN de administrador**: `1234`

## Producción

```bash
cd client && npm install && npm run build   # genera client/dist
cd ../server && npm install && npm start    # sirve la API y la web en :4000
```

El servidor sirve la interfaz compilada, así que solo hay que exponer el
puerto 4000 (o poner delante un proxy con HTTPS, ver abajo).

### Cambiar las credenciales (¡hazlo antes de usarlo de verdad!)

```bash
cd server
npm run set-secrets -- --club-code MI-CODIGO-SECRETO --admin-pin 9876
```

Las credenciales se guardan **hasheadas** (scrypt) en la base de datos; nunca
aparecen en el código ni en la página.

### Dónde alojarlo

Cualquier VPS pequeño (Hetzner, DigitalOcean, ~5 €/mes) o un mini-PC en el
propio club. Para acceso desde fuera del local, pon HTTPS delante con
[Caddy](https://caddyserver.com) (2 líneas de configuración) o nginx +
certbot. Las cookies de sesión son `httpOnly` y el token está firmado con un
secreto generado en la primera ejecución.

### Copias de seguridad

Toda la información está en un único archivo: `server/data/club.db`
(más `club.db-wal`). Copia esa carpeta con regularidad:

```bash
sqlite3 server/data/club.db ".backup backup-$(date +%F).db"
```

## Acceso desde cualquier dispositivo

La app es 100 % web: una vez alojado el servidor (VPS o mini-PC del club, ver
"Dónde alojarlo"), cualquier móvil, tablet o portátil entra por la misma URL
con el código del club. En el móvil, Chrome/Safari ofrecen **"Añadir a
pantalla de inicio"** — la app se instala con su propio icono y se abre a
pantalla completa como una app nativa (manifest PWA incluido).

El personal es: **Mattia, Daimond y Max** (en bases de datos creadas con la
versión anterior se migran automáticamente al arrancar).

## Registro de socios desde onelifelanzarote.com

El servidor publica una página de pre-registro en **`/registro`**
(p. ej. `https://club.onelifelanzarote.com/registro`): nombre, nacionalidad,
teléfono/email (al menos uno), código de invitación opcional y confirmación
de mayoría de edad. Cada solicitud entra al momento en la pestaña **Socios**
como *pendiente* (con aviso en el menú); al aprobarla se le asigna su número
de socio **OL-XXXX** automáticamente.

Para conectarla a la web del club, cualquiera de estas opciones:

1. **Enlace** desde onelifelanzarote.com: `<a href="https://TU-SERVIDOR/registro">Hazte socio</a>`
2. **Iframe** incrustado: `<iframe src="https://TU-SERVIDOR/registro" style="width:100%;height:760px;border:0"></iframe>`
3. **API directa** si la web tiene su propio formulario: `POST https://TU-SERVIDOR/api/public/register` con JSON `{ name, nationality, phone, email, code }`

El endpoint público está protegido con límite de 5 solicitudes/hora por IP y
un campo honeypot antibots; no expone ningún dato del club.

## Gestión de productos y socios

- **Inventario** (cualquier empleado): **+ Producto** para dar de alta
  (nombre, categoría, gramos o unidad, precio local/turista, stock inicial);
  **✎** para editar nombre y precios; **🗑** para quitarlo (baja lógica — el
  historial de ventas no se toca); **+ Stock** como siempre.
- **Socios** (cualquier empleado): además de aprobar solicitudes, el botón
  **Dar de baja** en la ficha retira al socio conservando su historial.

## Báscula (OHAUS Navigator NV622)

La app se conecta directamente a la báscula desde el navegador — sin programas
adicionales — usando el **kit de interfaz USB de OHAUS** (aparece en el PC como
puerto serie virtual, 9600 baudios).

**Cómo usarla:** en la pestaña **Dispensar**, pulsa **⚖ Conectar báscula** y
elige el puerto de la báscula en el diálogo de Chrome (solo la primera vez).
A partir de ahí:

- El peso se ve **en vivo** junto al título (punto verde = estable, ámbar = oscilando)
- Botón **Tara** para poner a cero con el recipiente encima
- Al añadir un producto en gramos aparece un botón **⚖ 3.52g** con el peso
  actual — un toque y entra en el ticket con el peso exacto (solo se activa
  cuando la lectura es estable)

**Requisitos:**

- Chrome o Edge **de escritorio** (la Web Serial API no existe en móviles) —
  la báscula se usa desde el PC del mostrador; los móviles siguen sirviendo
  para todo lo demás
- La página debe abrirse en `http://localhost:4000` (si el servidor corre en
  el mismo PC) **o por HTTPS** si el servidor está en otra máquina — Chrome
  no permite Web Serial en HTTP plano. Con Caddy delante tienes HTTPS con dos
  líneas de configuración.
- La báscula debe estar en **gramos** (el botón de usar peso se desactiva en
  otras unidades)
- Cierra el programa de OHAUS si lo tienes abierto — solo un programa puede
  usar el puerto serie a la vez

Protocolo: se sondea con el comando `IP` (impresión inmediata) cada 500 ms y
se interpreta cualquier línea `<peso> g` (con `?` = lectura inestable). El
botón **Tara** envía `T`. Compatible con cualquier báscula OHAUS con el mismo
protocolo serie (Navigator, Scout, etc.).

## Móvil

La interfaz es adaptable: en pantallas estrechas la navegación pasa a una
barra superior deslizable, los paneles se apilan a una columna, el ticket
ocupa todo el ancho y la tabla de inventario se desplaza en horizontal.
Cualquier móvil o tablet del club puede usarse como mostrador (excepto la
báscula, ver arriba).

## Modelo de seguridad

| Capa | Mecanismo |
|------|-----------|
| Dispositivo | Código del club → cookie de sesión firmada (180 días) |
| Personal | Selección de empleado en el mostrador (modelo de confianza del local) |
| Administración | PIN verificado en el servidor; informes y ventas como "Administrador" requieren sesión admin |
| Precios y stock | Calculados y validados **en el servidor** — el cliente nunca decide precios ni puede dejar stock negativo |

## API (resumen)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/device` | — | Autorizar dispositivo con el código del club |
| POST | `/api/auth/admin` | dispositivo | Iniciar sesión admin con PIN |
| POST | `/api/auth/admin/logout` | dispositivo | Cerrar sesión admin |
| GET | `/api/state` | dispositivo | Productos, socios, empleados, invitaciones |
| POST | `/api/sales` | dispositivo | Registrar dispensación (transaccional) |
| GET | `/api/members/:id/sales` | dispositivo | Historial de un socio |
| POST | `/api/invites` | dispositivo | Crear invitación con avalista |
| POST | `/api/applications` | dispositivo | Nueva solicitud de socio |
| POST | `/api/members/:id/approve` | dispositivo | Aprobar solicitud (asigna nº de socio) |
| POST | `/api/products/:id/stock` | dispositivo | Añadir stock |
| GET | `/api/reports?from&to` | **admin** | Ventas de un rango de fechas |

## Pendiente / siguientes pasos

- Formulario público de pre-registro en la web del club (endpoint separado con límite de peticiones)
- Alta/edición de productos y empleados desde la interfaz de admin
- Exportación de informes (CSV)
- Baja de socios y caducidad de membresías
