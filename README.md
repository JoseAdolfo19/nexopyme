# NexoPyme — Sistema de gestión para pequeñas y medianas empresas

> **Nombre interno (código):** BizCaja · **Marca de cara al usuario:** NexoPyme

Sistema SaaS multi-tenant hecho para pequeños negocios del Perú. Registra
ventas, controla inventario, gestiona clientes y proveedores, emite
comprobantes, imprime tickets y genera reportes. Se adapta a tu tipo de
negocio y funciona desde el celular.

**Stack:** Next.js 16 (App Router) · Prisma 7 + PostgreSQL · React 19 · Tailwind 4 · Zod · JWT · `xlsx` · `qrcode`.

---

## 🧪 Tests

Suite con **Vitest** (unidad). Se ejecutan en Node sin base de datos:

```bash
npm test          # ejecuta la suite una vez
npm run test:watch # modo watch
npm run test:user  # crea/renueva usuario demo con negocio de prueba
```

Cobertura actual: validaciones Zod (`validations`), cálculo de totales con IGV
incluido, QR de comprobantes, token de verificación de email y mailer (modo dev
y producción vía mock de `fetch`). Los módulos de servidor se testean
mockeando `server-only` (ver `test/setup.ts`).

### Usuario de pruebas

Para crear o renovar una cuenta demo verificada, con negocio, sucursal y plan
Free asociados:

```bash
npm run test:user
```

El comando genera una contraseña aleatoria y muestra las credenciales en la
terminal. Usa `TEST_USER_EMAIL` y `TEST_USER_PASSWORD` si necesitas fijarlas.

---

## 💾 Backup de base de datos

`scripts/backup-db.mjs` intenta volcar la BD con `mysqldump` y **sube el backup a
Aiven Object Storage** (S3-compatible), conservando solo las últimas `N` copias
en el bucket.

```bash
npm run backup:db              # usa DATABASE_URL y las credenciales AIVEN_S3_*
npm run backup:db -- --keep 14 # conservar las últimas 14 copias
npm run backup:db -- --keep-local  # además deja una copia en ./backups
```

- **Destino:** bucket de Aiven Object Storage (variables `AIVEN_S3_*`).
- **Retención:** por defecto 30 backups (ajustable con `--keep` o
  `AIVEN_S3_BACKUP_KEEP`); elimina automáticamente las copias más antiguas.
- **Requiere** `mysqldump` en el PATH (incluido en XAMPP/MariaDB) y las 4
  credenciales de Aiven Object Storage en el entorno. La conexión actual de
  la aplicación es PostgreSQL; este script de backup debe adaptarse a
  `pg_dump` antes de usarse para esa base de datos.

> Nota: Aiven ya hace backups automáticos del servicio de BD gestionado; este
> script sirve para copias portables bajo tu control en Object Storage.

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
- **Consulta automática de DNI y RUC** contra API Perú (`APIPERU_TOKEN`).
- Gestión de proveedores y compras.

### 🧾 Comprobantes / SUNAT (beta)
- Emisión simulada de boletas y facturas, además de proformas y notas de pedido.
- Series: `B001` (boleta), `F001` (factura), `P001` (proforma) y `NP001` (nota de pedido).
- El tipo elegido en la venta se conserva en el documento y en el historial.
- Boletas y facturas usan un ticket común de 80 mm; las notas de pedido usan una plantilla amplia con tabla y firmas.
- Cada boleta y factura incluye un QR generado en servidor con los datos del comprobante.
- La impresión oculta la interfaz de BizCaja y permite imprimir o guardar como PDF.
- La comunicación con SUNAT continúa simulada; el QR no es verificable oficialmente hasta firmar, enviar y aceptar el CPE.

### 👤 Clientes en el momento de vender
- Busca clientes por DNI o RUC desde el formulario de venta.
- Consulta los datos mediante API Perú usando peticiones `POST` desde el backend.
- Si no existe, permite registrarlo y agregarlo inmediatamente a la venta y al comprobante.
- El alta es idempotente por documento dentro del negocio: no crea duplicados.
- DNI y RUC se validan con 8 y 11 dígitos respectivamente.

### 📊 Reportes y exportación
- El reporte de ventas se exporta como archivo Excel `.xlsx`, no CSV.
- La descarga está protegida por sesión y aislada por `businessId`.
- La ruta de descarga es `/api/reportes/ventas`.

### 💰 Precios e IGV
- Los precios de venta ingresados en productos se consideran precios finales con IGV incluido.
- Una venta de S/ 60.00 queda con subtotal S/ 50.85, IGV S/ 9.15 y total S/ 60.00 en boleta o factura.
- Proformas y notas de pedido son documentos internos sin IGV.

### 💳 Métodos de pago
Efectivo, **Yape**, **Plin**, tarjeta, transferencia, crédito y otro.

### 📊 Inventario
- Control de stock por producto con unidades decimales (ej. 0.5 kg).
- Movimientos de inventario con auditoría completa (stock antes/después).

---

## 🧰 Requisitos

- **Node.js** 20+ y npm
- **PostgreSQL** compatible con Prisma 7 (Supabase configurado actualmente)

---

## 🚀 Puesta en marcha

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Crea o completa el archivo único `.env` en la raíz (ver [Variables de entorno](#variables-de-entorno)).
No uses un `.env.local` separado en este proyecto.

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
| `DATABASE_URL` | ✅ | Cadena de conexión PostgreSQL usada por Prisma y el adaptador `pg` |
| `AUTH_SECRET` | ✅ | Clave secreta para firmar sesiones JWT. Generar con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_APP_NAME` | ❌ | Nombre de la marca mostrado al usuario (por defecto `NexoPyme`) |
| `NEXT_PUBLIC_APP_URL` | ❌ | URL pública de la app (por defecto `http://localhost:3000`) |
| `APIPERU_TOKEN` | ❌* | Token privado de API Perú para consultar DNI/RUC |
| `APIPERU_BASE_URL` | ❌ | URL base de API Perú (por defecto `https://api.apiperu.pe`) |
| `RESEND_API_KEY` | ❌** | API key de **Resend** para enviar correos transaccionales (verificación de email) |
| `EMAIL_FROM` | ❌ | Remitente verificado en Resend, p. ej. `BizCaja <no-reply@tudominio.com>`. Por defecto `no-reply@resend.dev` |
| `AIVEN_S3_ENDPOINT` | ❌*** | Endpoint de **Aiven Object Storage** (S3-compatible) para subir backups |
| `AIVEN_S3_ACCESS_KEY` | ❌*** | Access key de Aiven Object Storage |
| `AIVEN_S3_SECRET_KEY` | ❌*** | Secret key de Aiven Object Storage |
| `AIVEN_S3_BUCKET` | ❌*** | Bucket de Aiven Object Storage |
| `AIVEN_S3_REGION` | ❌ | Región del bucket (por defecto `us-east-1`; Aiven lo ignora) |
| `AIVEN_S3_BACKUP_KEEP` | ❌ | Nº de backups a conservar en el bucket (por defecto 30) |

\* Sin `APIPERU_TOKEN`, la consulta automática de DNI/RUC devuelve error;
el resto del sistema funciona normalmente.

\*\* Sin `RESEND_API_KEY`, el correo de verificación NO se envía: el sistema
registra el enlace en consola/log (`[mailer:dev]`) y en desarrollo lo muestra
en la pantalla de pendiente. Necesitas una API key real y un dominio verificado
en Resend para el envío en producción.

\*\*\* Necesarias solo para el **backup automático de la BD** (ver sección
[Backup](#-backup-de-base-de-datos)).

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
│   │   └── api/reportes/ventas/ # Descarga Excel XLSX
│   ├── configuracion/  # Ajustes y equipo
│   ├── switch-business/# Cambiar de negocio
│   └── actions/        # Server Actions (mutaciones)
├── components/         # AppShell, formularios, selector de clientes y tickets
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

- **Email**: tras registrarse el usuario NO queda verificado automáticamente.
  Se genera un token JWT firmado (24 h) y se envía un correo de confirmación
  vía **Resend** (`src/lib/mailer.ts` + `src/lib/verification.ts`). Sin
  `RESEND_API_KEY` el enlace se registra en consola/log y se muestra en la
  pantalla de pendiente en desarrollo. La cuenta se activa al confirmar
  (`src/app/verify-email`).
- **SUNAT**: la emisión/envío a SUNAT está en **beta**. Series hardcodeadas
  (B001 / F001 / P001 / NP001) y entorno `beta`. El envío real, firma XML y
  CDR todavía no están activos.
- **API Perú**: las consultas de DNI/RUC usan `POST /dni` y `POST /ruc` en
  `https://api.apiperu.pe`, sin enviar comprobantes a SUNAT.
- **Impresión**: boletas y facturas se imprimen como ticket de 80 mm; las notas
  de pedido usan una plantilla amplia. Los comprobantes quedan disponibles en
  `/comprobantes` para reimpresión.
- **QR**: el QR contiene la representación del comprobante, pero no confirma
  aceptación ante SUNAT mientras el CPE no haya sido firmado y enviado.
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