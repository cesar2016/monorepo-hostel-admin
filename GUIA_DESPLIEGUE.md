# Guía de Despliegue en Producción

Este documento detalla el procedimiento paso a paso para desplegar el **Sistema de Gestión de Inventarios para Hotel** en un entorno de producción de alta disponibilidad y costo cero (o mínimo) utilizando:
- **Base de Datos y Autenticación:** [Supabase Cloud](https://supabase.com) (PostgreSQL administrado + Supabase Auth).
- **Backend API:** [Render](https://render.com) (Node.js + Express REST API).
- **Frontend SPA:** [Vercel](https://vercel.com) (React 19 + Vite + Tailwind CSS).

---

## 1. Configuración de Base de Datos y Auth en Supabase Cloud

### A. Crear Proyecto
1. Ingresá a [supabase.com](https://supabase.com) e iniciá sesión con tu cuenta.
2. Hacé clic en **New Project**, seleccioná tu organización y completá:
   - **Name:** `hotel-inventarios`
   - **Database Password:** Generá una contraseña segura y guardala en un lugar seguro.
   - **Region:** Seleccioná la región más cercana a tus usuarios (ej: `South America (São Paulo) - sa-east-1` o `East US`).
3. Aguardá unos minutos mientras Supabase aprovisiona el clúster de PostgreSQL.

### B. Aplicar Migraciones Versionadas
Podés aplicar las migraciones de dos formas:

#### Opción 1: Vía Supabase CLI (Recomendado)
```bash
# Iniciar sesión en Supabase CLI
npx supabase login

# Vincular con el proyecto remoto (obtené el Project Ref desde Settings > General)
npx supabase link --project-ref <TU_PROJECT_REF>

# Empujar todas las migraciones SQL a producción
npx supabase db push
```

#### Opción 2: Vía SQL Editor en Supabase Dashboard
Si preferís hacerlo desde el panel web, abrí el **SQL Editor** y ejecutá en orden el contenido de los archivos de `supabase/migrations/`:
1. `20261015000100_base_usuarios_areas.sql`
2. `20261015000200_helpers_autorizacion.sql`
3. `20261015000300_proveedores_productos.sql`
4. `20261015000400_movimientos.sql`
5. `20261015000500_vistas.sql`
6. `20261015000600_rpc_ingresos.sql`
7. `20261015000700_auditoria.sql`
8. `20261015000800_rls.sql`

### C. Configurar Autenticación en Supabase
1. En el menú lateral izquierdo, andá a **Authentication > Providers > Email**:
   - Asegurate de que **Enable Email provider** esté activo (`true`).
   - Desactivá **Confirm email** si querés que los usuarios creados por el Super Admin puedan ingresar de inmediato sin esperar confirmación por correo, o configuralo según la política del hotel.
2. En **Authentication > URL Configuration**:
   - **Site URL:** URL de tu frontend en Vercel (ej: `https://hotel-inventarios.vercel.app`).
   - **Redirect URLs:** Agregá:
     - `https://hotel-inventarios.vercel.app/restablecer-contrasena`
     - `http://localhost:5173/restablecer-contrasena` (para pruebas locales).

### D. Obtener Claves de API
Andá a **Project Settings > API** y copiá los siguientes valores:
- **Project URL:** `https://<tu-proyecto>.supabase.co`
- **anon public:** `eyJhbGciOi...` (clave pública para el cliente y el servidor).
- **service_role secret:** `eyJhbGciOi...` (clave privada con permisos elevados, **NUNCA** exponer en el frontend).

---

## 2. Despliegue del Backend API en Render

1. Ingresá a [render.com](https://render.com) e iniciá sesión con tu cuenta de GitHub/GitLab.
2. Hacé clic en **New + > Web Service** y seleccioná el repositorio de este proyecto.
3. Completá la configuración:
   - **Name:** `hotel-api`
   - **Region:** Misma región o cercana a Supabase (ej: `Ohio (US East)` o `Frankfurt`).
   - **Branch:** `main` (o tu rama de producción).
   - **Root Directory:** Dejar vacío (usamos monorepo en la raíz).
   - **Runtime:** `Node`.
   - **Build Command:**
     ```bash
     npm install && npm run build --workspace=shared && npm run build --workspace=server
     ```
   - **Start Command:**
     ```bash
     npm run start --workspace=server
     ```

4. En la sección **Environment Variables**, agregá las siguientes variables:

| Variable | Valor de Ejemplo | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Modo producción |
| `PORT` | `4000` | Puerto interno |
| `CORS_ORIGIN` | `https://hotel-inventarios.vercel.app` | URL exacta de tu frontend en Vercel |
| `SUPABASE_URL` | `https://<tu-proyecto>.supabase.co` | URL de tu proyecto en Supabase |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | Clave anon pública |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Clave service_role secreta |
| `JWT_SECRET` | `cadena_aleatoria_muy_segura_de_32_chars_minimo` | Secreto para firmas |

5. Hacé clic en **Create Web Service**.
6. Una vez desplegado, Render te proporcionará una URL pública (ej: `https://hotel-api.onrender.com`). Podés probarla accediendo a `https://hotel-api.onrender.com/health` (debe responder `{"status":"ok"}`).

### E. Inicializar el Super Administrador en Producción
Desde el panel de Render, abrí la pestaña **Shell** del servicio e ingresá:
```bash
npm run seed:admin --workspace=server
```
Esto creará el usuario `admin@hotel.com` con su contraseña inicial en la base de datos de producción.

---

## 3. Despliegue del Frontend en Vercel

1. Ingresá a [vercel.com](https://vercel.com) e importá el repositorio de GitHub.
2. En la pantalla de configuración del proyecto:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Hacé clic en *Edit* y seleccioná la carpeta `client`.
   - **Build Command:**
     ```bash
     npm run build
     ```
   - **Output Directory:** `dist`
3. En la sección **Environment Variables**, cargá:

| Variable | Valor |
| :--- | :--- |
| `VITE_API_URL` | `https://hotel-api.onrender.com/api/v1` |
| `VITE_SUPABASE_URL` | `https://<tu-proyecto>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (clave pública anon) |

4. Hacé clic en **Deploy**.
5. Vercel compilará la aplicación y generará la URL pública (ej: `https://hotel-inventarios.vercel.app`).
6. El archivo `client/vercel.json` incluido en el repositorio asegura que todas las rutas del router (`/dashboard`, `/productos`, `/ingresos`, etc.) se reescriban correctamente a `index.html` sin errores 404 al recargar la página.

---

## 4. Checklist de Seguridad en Producción

- [x] **Doble Capa de Permisos Activa:**
  - Row Level Security (RLS) habilitado en el 100% de las tablas (`areas`, `productos`, `proveedores`, `ingresos`, `ingreso_items`, `egresos`, `profiles`, `audit_log`).
  - Middlewares de autorización en Express validando roles y pertenencia de área antes de ejecutar cualquier consulta.
- [x] **Claves Seguras:**
  - La clave `SUPABASE_SERVICE_ROLE_KEY` reside exclusivamente en el backend (Render).
  - El frontend solo conoce la `VITE_SUPABASE_ANON_KEY`.
- [x] **Políticas de CORS:**
  - `CORS_ORIGIN` en el backend está configurado exactamente con el dominio HTTPS de Vercel.
- [x] **Cabeceras de Protección:**
  - `helmet` configurado en Express protegiendo contra ataques de inyección, clickjacking y sniffing.
- [x] **Protección contra Fuerza Bruta:**
  - `express-rate-limit` habilitado en las rutas de login y endpoints de la API.
- [x] **Trazabilidad y Auditoría:**
  - Trigger automático en PostgreSQL registrando usuario, operación, fecha y datos previos/posteriores en `audit_log`.
- [x] **Reglas de Integridad:**
  - Verificación atómica con `SELECT FOR UPDATE` para impedir egresos con stock negativo.
  - Restricción única que impide duplicar facturas por proveedor.
  - Regla de negocio que garantiza un único encargado activo por área.

---

## 5. Despliegue Self-Hosted con Docker & Docker Compose

Si preferís desplegar todo el sistema en tu propio VPS o servidor local (on-premise):

1. **Variables de Entorno:**
   Copiá el archivo `.env.example` en la raíz o definí las variables requeridas:
   ```bash
   SUPABASE_URL=https://<tu-proyecto>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

2. **Levantar los Contenedores:**
   ```bash
   docker compose up -d --build
   ```

3. **Verificar el Estado:**
   - **Cliente Web:** accesible en `http://localhost:3000` (servido por Nginx con compresión gzip y soporte SPA).
   - **Backend API:** accesible en `http://localhost:4000/api/v1` con healthcheck activo.

