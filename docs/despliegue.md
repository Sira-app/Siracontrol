# Guía de despliegue — SiraControl

Esta guía cubre el camino completo para poner SiraControl en producción con el
stack definitivo: **Supabase** (base de datos), **Vercel** (web) y **Expo/EAS**
(app móvil). Tu dominio de Banahosting se reutiliza apuntando el DNS a Vercel.

---

## Resumen de dónde vive cada cosa

| Componente        | Dónde se hospeda           | Costo            |
|-------------------|----------------------------|------------------|
| Base de datos     | Supabase                   | Gratis (plan Free) |
| Dashboard web     | Vercel                     | Gratis (plan Hobby) |
| App móvil         | Builds con EAS → tiendas   | Gratis para empezar |
| Dominio           | El que ya tienes en Banahosting | Ya pagado    |

Banahosting **no ejecuta** la aplicación. Next.js necesita un proceso Node
corriendo de forma permanente, y un hosting compartido cPanel/FTP no lo permite.
Lo que sí hacemos con Banahosting es usar su panel DNS para que tu dominio
apunte al sitio publicado en Vercel. Así usas el dominio que ya pagaste.

---

## Paso 1 — Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea una cuenta.
2. Crea un proyecto nuevo. Para Chile, la región más cercana es **South America (São Paulo)**.
3. Anota la contraseña de la base de datos que defines al crear el proyecto.
4. En **Project Settings → API** copia estos tres valores:
   - Project URL
   - anon public key
   - service_role key (secreta, solo para el servidor)

### Aplicar el esquema de base de datos

Opción A — desde el panel web (sin instalar nada):
1. Ve a **SQL Editor** en el panel de Supabase.
2. Abre el archivo `packages/database/migrations/0001_initial_schema.sql`,
   copia todo su contenido, pégalo y ejecuta.
3. Repite con `0002_row_level_security.sql` y `0003_functions_and_views.sql`,
   en ese orden.
4. Opcional: ejecuta `packages/database/seed/demo_data.sql` para tener datos de prueba.

Opción B — desde la terminal con Supabase CLI:
```bash
npm install -g supabase
supabase link --project-ref TU_REFERENCIA_DE_PROYECTO
npm run db:push
```

### Crear los buckets de Storage

En **Storage** del panel de Supabase, crea tres buckets **privados**:
- `attendance-selfies`
- `employee-documents`
- `payslips`

---

## Paso 2 — Publicar la web en Vercel

1. Sube el proyecto a un repositorio de GitHub (privado está bien).
2. Entra a https://vercel.com e inicia sesión con tu cuenta de GitHub.
3. **Add New → Project** y selecciona el repositorio.
4. En la configuración de importación:
   - **Root Directory:** `apps/web`
   - **Framework Preset:** Next.js (se detecta solo)
5. En **Environment Variables** agrega:

   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   SUPABASE_SERVICE_ROLE_KEY     = eyJ...
   NEXT_PUBLIC_MAPBOX_TOKEN      = pk.eyJ...
   ```

6. Haz clic en **Deploy**. En un par de minutos tendrás una URL tipo
   `siracontrol.vercel.app` funcionando.

---

## Paso 3 — Conectar tu dominio de Banahosting

Tienes dos formas. La opción A es la más simple.

### Opción A — Cambiar los nameservers (recomendado)

1. En Vercel, entra a tu proyecto → **Settings → Domains** y agrega tu dominio
   (por ejemplo `siracontrol.cl` o `app.tudominio.cl`).
2. Vercel te mostrará registros DNS para configurar.
3. Entra al cPanel de Banahosting → **Zone Editor** (o "Editor de Zona DNS").
4. Agrega los registros que Vercel indica:
   - Para el dominio raíz: un registro **A** apuntando a la IP de Vercel
     (Vercel te la muestra, normalmente `76.76.21.21`).
   - Para `www` o un subdominio: un registro **CNAME** apuntando a
     `cname.vercel-dns.com`.
5. Guarda. La propagación DNS puede tardar de unos minutos hasta 24 horas.
6. Vercel emite automáticamente el certificado SSL (HTTPS) cuando detecta el dominio.

### Opción B — Usar solo un subdominio

Si quieres mantener el sitio principal en Banahosting y usar SiraControl solo en
un subdominio (`app.tudominio.cl`):

1. En cPanel → **Zone Editor**, crea un registro **CNAME**:
   - Nombre: `app`
   - Destino: `cname.vercel-dns.com`
2. En Vercel → **Settings → Domains**, agrega `app.tudominio.cl`.

---

## Paso 4 — Compilar la app móvil

La app móvil se conecta directamente a Supabase, así que solo necesita las
variables de entorno correctas.

1. Instala las herramientas:
   ```bash
   npm install -g expo eas-cli
   ```
2. En `apps/mobile`, crea un archivo `.env` con:
   ```
   EXPO_PUBLIC_SUPABASE_URL      = https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
3. Para probar en tu teléfono durante el desarrollo:
   ```bash
   npm run dev:mobile
   ```
   Escanea el código QR con la app **Expo Go**.
4. Para generar los instaladores definitivos:
   ```bash
   cd apps/mobile
   eas login
   eas build --platform android
   eas build --platform ios
   ```
   El build de Android genera un `.aab` para subir a Google Play.
   El de iOS requiere una cuenta de Apple Developer (99 USD/año).

---

## Paso 5 — Verificación final

Antes de dar el sistema por listo, comprueba:

- [ ] Las tres migraciones SQL se aplicaron sin errores.
- [ ] Los tres buckets de Storage existen y son privados.
- [ ] La web en Vercel carga y permite iniciar sesión.
- [ ] El dominio personalizado resuelve con HTTPS.
- [ ] La app móvil inicia sesión y registra un fichaje de prueba.
- [ ] El fichaje aparece en el dashboard web.

### Credenciales de prueba (si cargaste el seed)

- **Correo:** admin@empresa.com
- **Contraseña:** la que definiste en el seed `demo_data.sql`

Cambia estas credenciales antes de usar el sistema en producción real.

---

## Notas sobre costos a futuro

El plan gratuito de Supabase cubre con holgura una empresa de varios cientos de
empleados. Si el proyecto crece mucho, los puntos donde eventualmente pagarías son:

- **Supabase Pro** (~25 USD/mes): más almacenamiento y sin pausa por inactividad.
- **Mapbox**: gratis hasta 50.000 cargas de mapa al mes; después se cobra por uso.
- **Apple Developer** (99 USD/año): obligatorio solo para publicar en App Store.

Mientras tanto, el sistema completo puede operar sin costo mensual.
