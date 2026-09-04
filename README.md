# NexoPyme — Sistema de gestión para pequeñas y medianas empresas

> **Nombre interno (código):** BizCaja · **Marca de cara al usuario:** NexoPyme

Sistema SaaS multi-tenant hecho para pequeños negocios del Perú. Registra
ventas, controla inventario, gestiona clientes y proveedores, emite
comprobantes (boleta/factura) y genera reportes. Se adapta a tu tipo de
negocio y funciona desde el celular.

**Stack:** Next.js 16 (App Router) · Prisma 7 + MariaDB · React 19 · Tailwind 4 · Zod · JWT.

---

## ¿Qué hace NexoPyme?

### 🔐 Usuarios y cuentas
- Registro e inicio de sesión con correo y contraseña (JWT en cookies).
- Roles por negocio: **Administrador, Vendedor, Contador, Almacén**.
- Cada usuario puede pertenecer a varios negocios (multiempresa).

### 🏪 Multi-negocio (SaaS multi-tenant)
- Base de datos compartida con aislamiento por `businessId`.
- Alta de negocio con un asistente de **onboarding de 9 pasos** que
  configura los módulos automáticamente según el rubro.
- Soporte de **múltiples sucursales** (sedes) por negocio.

### 🧰 Módulos por tipo de negocio
El sistema activa módulos según el rubro. Núcleo común:

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | KPIs: ventas de hoy/mes, ganancia, stock bajo |
| **Ventas** | Registro de ventas, métodos de pago, historial |
| **Productos** | Catálogo con precio, stock, código, categorías |
| **Clientes** | Ficha de clientes con historial de ventas |
| **Comprobantes** | Boleta, factura, nota de crédito/débito, proforma |
| **Reportes** | Analítica y exportación de datos |
| **Inventario** | Control de stock y movimientos (entrada/salida/ajuste) |
| **Caja** | Apertura/cierre de caja y movimientos de dinero |
| **Configuración** | Ajustes del negocio y gestión de equipo |

Extras según rubro: restaurante (mesas, comandas, cocina), salón de belleza
(agenda, citas, profesionales), bodega/minimarket/ferretería (compras y
proveedores), ropa (tallas, colores, variantes), etc.

### 👥 Clientes y proveedores
- Tipos de documento: **DNI, RUC, CE, Pasaporte, Otro**.
- **Consulta automática de DNI y RUC** contra Chequea Perú (`CHEQUEA_TOKEN`).
- Gestión de proveedores y compras.

### 🧾 Comprobantes / SUNAT (beta)
- Emisión de boletas, facturas, notas de crédito/débito y proformas.
- Series: `B001` (boleta) y `F001` (factura).
- Envío a SUNAT en fase **beta** (entorno hardcodeado a beta).

### 💳 Métodos de pago
Efectivo, **Yape**, **Plin**, tarjeta, transferencia, crédito y otro.

### 📊 Inventario
- Control de stock por producto con unidades decimales (ej. 0.5 kg).
- Movimientos de inventario con auditoría completa (stock antes/después).

### 💰 Planes de suscripción
| Plan | Precio (S/ /mes) | Destacado |
|------|------------------|-----------|
| Free | 0 | 1 usuario, funciones básicas |
| Emprendedor | 19.90 | Más comprobantes, inventario, reportes |
| Negocio | 39.90 | Caja, compras, proveedores |
| Pro | 69.90 | Multiempresa, multisucursal, API, IA |

---

## 🧰 Requisitos

- **Node.js** 20+ y npm
- **MariaDB / MySQL** 10.4+ (XAMPP recomendado en Windows)

---

## 🚀 Puesta en marcha

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Crea el archivo `.env` en la raíz (ver [Variables de entorno](#variables-de-entorno)).

### 3. Preparar la base de datos
```bash
# Aplicar migraciones
npx prisma migrate deploy

# Cargar datos iniciales (planes de suscripción)
npx prisma db seed
```

### 4. Ejecutar
```bash
npm run dev        # Servidor de desarrollo → http://localhost:3000
npm run build      # Compila (ejecuta prisma generate + next build)
npm start          # Sirve el build de producción
npm run lint       # Validación ESLint
```

> **Importante:** `npm run build` siempre ejecuta `prisma generate` primero.
> Si modificas `prisma/schema.prisma`, vuelve a generar los tipos.

---

## 🌱 Variables de entorno (`.env`)

| Variable | Obligatoria | Descripción |
|----------|:-----------:|-------------|
| `DATABASE_URL` | ✅ | Cadena de conexión a MariaDB. Ej.: `mysql://root:@127.0.0.1:3306/nexopyme` |
| `AUTH_SECRET` | ✅ | Clave secreta para firmar sesiones JWT. Generar con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_NAME` | ❌ | Nombre de la marca mostrado al usuario (por defecto `NexoPyme`) |
| `NEXT_PUBLIC_APP_URL` | ❌ | URL pública de la app (por defecto `http://localhost:3000`) |
| `CHEQUEA_TOKEN` | ❌* | Token de la API **Chequea Perú** para consultar DNI/RUC. Necesario solo si usas esa función |
| `CHEQUEA_BASE_URL` | ❌ | URL base de Chequea Perú (por defecto `https://api.chequea.pe`) |

\* Sin `CHEQUEA_TOKEN`, la consulta automática de DNI/RUC devuelve error;
el resto del sistema funciona normalmente.

---

## 🗂️ Estructura del proyecto

```
src/
├── app/                # Páginas y rutas (App Router)
│   ├── login/          # Inicio de sesión
│   ├── register/       # Registro de cuenta
│   ├── onboarding/     # Alta de negocio (asistente de 9 pasos)
│   ├── dashboard/      # KPIs y resumen
│   ├── clientes/       # CRUD de clientes
│   ├── productos/      # CRUD de productos
│   ├── ventas/         # Nueva venta + historial
│   ├── inventario/     # Stock y ajustes
│   ├── comprobantes/   # Documentos SUNAT
│   ├── reportes/       # Analítica
│   ├── configuracion/  # Ajustes y equipo
│   ├── switch-business/# Cambiar de negocio
│   └── actions/        # Server Actions (mutaciones)
├── components/         # Componentes compartidos (AppShell, formularios, ui/)
├── lib/                # auth, prisma, constantes, validaciones, format
└── generated/prisma/   # Tipos de Prisma (generados, no editar)
prisma/
├── schema.prisma       # Esquema de la base de datos
├── migrations/         # Migraciones SQL
└── seed.ts             # Datos iniciales (planes)
```

---

## 🏗️ Arquitectura

- **Multi-tenant**: base compartida con filtro `businessId` en cada consulta.
- **Autenticación**: sesión JWT propia en cookies (`src/lib/auth.ts`), sin
  servicios externos.
- **Server Components** por defecto; componentes interactivos con `"use client"`.
- **Server Actions** para todas las mutaciones (validación con Zod).
- **Feature flags**: los módulos se habilitan/deshabilitan según el rubro
  del negocio (`business.modules`).

---

## 🗄️ Modelo de datos principal

- `User` → cuentas de usuario
- `Business` → raíz multi-tenant (empresa/negocio)
- `BusinessUser` → relación usuario-negocio con rol
- `Branch` → sucursales
- `Customer` / `Supplier` → clientes y proveedores
- `Category` / `Product` → catálogo
- `Sale` / `SaleItem` → ventas
- `InventoryMovement` → movimientos de inventario
- `Document` / `SunatSubmission` / `SunatResponse` → comprobantes SUNAT
- `CashRegister` / `CashMovement` → caja
- `Plan` / `Subscription` → suscripciones
- `AuditLog` → auditoría

Esquema completo: [`prisma/schema.prisma`](prisma/schema.prisma)

---

## ✅ Notas técnicas y limitaciones (estado actual)

- **Email**: el registro marca el correo como verificado de inmediato (MVP).
  El flujo real de verificación por correo está preparado pero sin usar.
- **SUNAT**: la emisión/envío a SUNAT está en **beta**. Series hardcodeadas
  (B001 / F001) y entorno `beta`.
- **Chequea Perú**: el token de prueba responde "DNI/RUC no disponible en
  este despliegue"; para datos reales se necesita un token de pago/producción.
- **Aislamiento multi-tenant**: toda consulta debe filtrar por `businessId`
  para no filtrar datos entre empresas.

---

## 👤 Cómo usarlo (flujo típico)

1. **Crear cuenta** en `/register`.
2. **Registrar tu negocio** en `/onboarding` (seleccionas rubro y el sistema
   configura los módulos).
3. **Cargar productos** en `/productos`.
4. **Registrar una venta** en `/ventas`.
5. Revisar **ganancias** en el dashboard y los **reportes**.
6. Opcionalmente **emitir comprobantes** en `/comprobantes`.