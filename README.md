# Sistema de Gestión de Inventarios para Hotel

Monorepo full-stack para el control de inventarios segmentado por áreas operativas (Cocina, Housekeeping, Administración, Mantenimiento, etc.). Diseñado con control de accesos en doble capa: Row Level Security (RLS) en PostgreSQL/Supabase y middlewares de autorización en Express.

## Estructura del Proyecto

```text
admin-hotel/
├── shared/       # Validaciones Zod, constantes, enums y tipos TypeScript de base de datos
├── server/       # API REST en Node.js + Express + TypeScript
├── client/       # Frontend React + Vite + Tailwind + shadcn/ui (Etapa 4)
└── supabase/     # Migraciones SQL versionadas, funciones RPC, RLS y tests pgTAP
```

---

## 1. Requisitos Previos

- **Node.js** (v18 o superior).
- **Docker Desktop** o **Docker Engine** (en ejecución).
- **Supabase CLI** (o ejecutable mediante `npx supabase`).

---

## 2. Puesta en Marcha Rápida (Paso a Paso)

### A. Iniciar Base de Datos Local
```bash
# Iniciar servicios de Supabase (PostgreSQL, Auth, Studio)
npx supabase start
```
> El panel visual **Supabase Studio** estará disponible en: [http://127.0.0.1:54323](http://127.0.0.1:54323)

### B. Instalar Dependencias
```bash
npm install
```

### C. Compilar Paquete Compartido
```bash
npm run build --workspace=shared
```

### D. Cargar Datos Demostrativos o Super Administrador Inicial

Podés inicializar solo el Super Admin o cargar el hotel completo con áreas, usuarios, insumos, facturas y alertas:

```bash
# Opción A: Cargar entorno completo demostrativo (Recomendado para pruebas)
npm run seed:demo

# Opción B: Crear únicamente el Super Administrador
npm run seed:admin
```

**Credenciales demostrativas precargadas:**
- **Super Administrador:** `admin@hotel.com` / `AdminPassword123!` (Gestión total, áreas, usuarios y auditoría).
- **Auditor General (Admin):** `auditor@hotel.com` / `AuditorPassword123!` (Solo lectura global de todas las áreas).
- **Encargado Cocina:** `chef@hotel.com` / `ChefPassword123!` (Gestión de productos, facturas de compras y egresos de Cocina).
- **Encargada Housekeeping:** `housekeeping@hotel.com` / `HousePassword123!` (Gestión de blanquería y amenities).
- **Encargado Mantenimiento:** `mantenimiento@hotel.com` / `MantePassword123!` (Gestión edilicia con alerta de bajo stock activa).

### E. Iniciar en Modo Desarrollo

Podés iniciar ambos servicios concurrentemente o por separado:

```bash
# Iniciar backend (Express :4000) y frontend (Vite :5173) juntos
npm run dev:all

# O por separado en terminales independientes:
npm run dev:server   # Backend en http://localhost:4000
npm run dev:client   # Frontend en http://localhost:5173
```

- **Frontend (Web App):** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **API Health Check:** [http://localhost:4000/health](http://localhost:4000/health)
- **Supabase Studio:** [http://127.0.0.1:54323](http://127.0.0.1:54323)

---

## 3. Pruebas Automáticas

El proyecto cuenta con dos suites de verificación automatizada:

### A. Pruebas de Base de Datos y RLS (pgTAP)
Valida aislamiento de datos entre áreas, unicidad de encargado por área, control de stock no negativo diferido y reglas de auditoría.
```bash
npm run test:db
```
*(32 tests passing)*

### B. Pruebas de Integración de la API (Vitest + Supertest)
Prueba de punta a punta: login, JWT, áreas, proveedores, productos, ingresos respaldados por factura, egresos, alertas de bajo stock, exportación Excel y permisos por rol.
```bash
npm run test --workspace=server
```
*(13 tests passing)*

---

## 4. Endpoints Principales (API v1)

| Módulo | Método y Ruta | Roles Permitidos | Descripción |
|---|---|---|---|
| **Auth** | `POST /api/v1/auth/login` | Público | Autenticación y obtención de JWT |
| | `GET /api/v1/auth/me` | Autenticado | Perfil y rol del usuario actual |
| | `POST /api/v1/auth/recuperar-clave` | Público | Solicitud de restablecimiento |
| **Áreas** | `GET /api/v1/areas` | Autenticado | Encargado ve su área; Admin ve todas |
| | `POST /api/v1/areas` | Super Admin | Creación de nueva área |
| | `PUT /api/v1/areas/:id` | Super Admin | Edición y activación/desactivación |
| **Unidades** | `GET /api/v1/unidades` | Autenticado | Catálogo de unidades (`kg`, `un`, `l`...) |
| **Proveedores** | `GET /api/v1/proveedores` | Autenticado | Proveedores del área |
| | `POST /api/v1/proveedores` | Encargado | Alta de proveedor en su área |
| | `PUT /api/v1/proveedores/:id` | Encargado | Modificación de proveedor |
| **Productos** | `GET /api/v1/productos` | Autenticado | Listado con unidades (`?q=`, `?activo=`) |
| | `POST /api/v1/productos` | Encargado | Alta de producto con stock mínimo |
| | `PUT /api/v1/productos/:id` | Encargado | Modificación o baja lógica (`activo: false`) |
| **Ingresos** | `GET /api/v1/ingresos` | Autenticado | Listado de ingresos respaldados por factura |
| | `GET /api/v1/ingresos/:id` | Autenticado | Detalle de factura y sus ítems |
| | `POST /api/v1/ingresos` | Encargado | Alta atómica con factura única por proveedor |
| | `PUT /api/v1/ingresos/:id` | Encargado | Edición y resincronización de ítems |
| **Egresos** | `GET /api/v1/egresos` | Autenticado | Listado con motivo y responsable |
| | `POST /api/v1/egresos` | Encargado | Egreso con validación de stock no negativo |
| | `PUT /api/v1/egresos/:id` | Encargado | Edición con validación de stock no negativo |
| **Stock** | `GET /api/v1/stock` | Autenticado | Stock actual (`?soloBajoMinimo=true`, `?q=`) |
| **Movimientos** | `GET /api/v1/movimientos` | Autenticado | Historial paginado con filtros de fecha/tipo |
| | `GET /api/v1/movimientos/export` | Autenticado | Descarga de reporte en Excel (`.xlsx`) o CSV |
| **Dashboard** | `GET /api/v1/dashboard/resumen` | Autenticado | Métricas y alertas del área o global |
| **Usuarios** | `GET /api/v1/usuarios` | Super Admin | Listado general de usuarios |
| | `POST /api/v1/usuarios` | Super Admin | Alta de usuario, asignación de rol y área |
| | `PUT /api/v1/usuarios/:id` | Super Admin | Edición de rol, área o desactivación |
| **Auditoría** | `GET /api/v1/usuarios/auditoria` | Admin, Super Admin | Bitácora de cambios registrada por triggers |

---

## 5. Despliegue en Producción y Self-Hosting

### A. Despliegue en la Nube (Vercel + Render + Supabase Cloud)
La guía completa y detallada paso a paso para el despliegue en la nube se encuentra en:
👉 **[GUIA_DESPLIEGUE.md](./GUIA_DESPLIEGUE.md)**

Cubre:
1. **Supabase Cloud:** Creación de proyecto, ejecución de migraciones SQL y configuración de Auth.
2. **Render:** Despliegue de la API REST Node.js/Express con sus variables de entorno seguras.
3. **Vercel:** Despliegue de la aplicación SPA React + Vite con rewrite rules en `vercel.json`.
4. **Checklist de Seguridad:** CORS, RLS, Rate Limiting y protección de credenciales de servicio.

### B. Despliegue On-Premise con Docker Compose
Podés levantar la solución completa en tu propio servidor o VPS:
```bash
docker compose up -d --build
```
- Frontend SPA Nginx: [http://localhost:3000](http://localhost:3000)
- Backend REST API: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

---

## 6. Funcionalidades Destacadas
- 🖨️ **Comprobantes y Vales Imprimibles:** Generación e impresión directa en formato A4/térmico de Remitos de Recepción de Facturas con desglose de ítems y Vales de Salida de Insumos con doble bloque de firmas.
- 📊 **Exportación Contable:** Descarga de movimientos filtrados a formato Excel `.xlsx` nativo (con estilos y totales) o `.csv`.
- 🛡️ **Seguridad Dual-Layer:** RLS estricto en PostgreSQL respaldado por validación de esquemas Zod y middleware de roles en Express.
- ⚡ **Prevención Concurrente de Stock Negativo:** Bloqueo `SELECT FOR UPDATE` en base de datos para garantizar consistencia incluso ante peticiones simultáneas.


