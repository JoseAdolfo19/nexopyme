<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# BizCaja — Multi-Tenant SaaS for SMB Management

**BizCaja** is a modern SaaS platform designed for small and medium-sized businesses (SMBs) to manage sales, inventory, customers, and compliance. Built with Next.js 16, Prisma 7, and MariaDB.

## Key Characteristics

- **Multi-tenant architecture**: Shared database with `businessId` isolation
- **Dynamic module system**: Features enable/disable based on business type (restaurant, retail, salon, etc.)
- **Full Spanish UX**: Localized terminology and workflows
- **Role-based access**: administrador, vendedor, contador, almacén
- **SUNAT integration**: Peruvian tax authority document submission (beta)
- **Responsive design**: Mobile-first with Tailwind + custom UI components

---

## Tech Stack & Build

```bash
npm run dev      # Start Next.js dev server (localhost:3000)
npm run build    # Build + Prisma generate (required)
npm start        # Run production build
npm run lint     # ESLint validation
```

**Dependencies**:
# NexoPyme / BizCaja

NexoPyme es un SaaS en español para negocios peruanos. El nombre interno del
código es BizCaja. Consulta el [README](README.md) para la puesta en marcha,
variables de entorno y descripción funcional; no dupliques esa documentación
en este archivo.

## Comandos verificados

```bash
npm run dev       # Next.js en http://localhost:3000
npm run build     # prisma generate + migraciones + seed + next build
npm run lint      # ESLint
npm test          # Vitest una vez
npm run test:watch
```

Requisitos habituales: Node.js 20+, npm y una base de datos compatible con la
configuración actual. Antes de asumir el proveedor de base de datos, verifica
[prisma/schema.prisma](prisma/schema.prisma) y [src/lib/prisma.ts](src/lib/prisma.ts):
el código actual genera el cliente Prisma y usa `@prisma/adapter-pg`.

## Límites de arquitectura

- App Router de Next.js; usa Server Components por defecto. Añade
  `"use client"` solo cuando haya estado o interacción en el navegador.
- Las mutaciones viven en [src/app/actions](src/app/actions), validan `FormData`
  con Zod y devuelven un error de usuario o redirigen.
- La autenticación es JWT propio en cookies. Usa las funciones de
  [src/lib/auth.ts](src/lib/auth.ts), especialmente `requireUser()` y
  `requireBusiness()`; no introduzcas un proveedor externo.
- El contexto activo es multi-tenant. Toda lectura o escritura de modelos con
  `businessId` debe quedar aislada por negocio. Revisa
  [src/lib/tenant.ts](src/lib/tenant.ts) y usa `scope(businessId)` cuando el
  flujo lo requiera; nunca confíes solo en un id recibido del formulario.
- El acceso a funcionalidades depende de `business.modules`; la definición de
  módulos y menús está en [src/lib/constants.ts](src/lib/constants.ts).
- Las operaciones que crean o modifican varias entidades deben usar una
  transacción Prisma. Los campos de stock son `Decimal`; conviértelos a número
  solo en el borde de presentación o cálculo que lo necesite.

## Límites de edición

- No edites [src/generated/prisma](src/generated/prisma); regenera el cliente
  con `npm run build` o `npx prisma generate` después de cambiar el esquema.
- Los cambios de esquema requieren una migración revisada en
  [prisma/migrations](prisma/migrations) y la actualización de tipos generados.
- Conserva la UX en español y los nombres de dominio existentes (`Business`,
  `businessId`, roles, estados y módulos), salvo que el cambio lo requiera.
- Para formularios, mantén los patrones de [src/components](src/components)
  y [src/components/ui](src/components/ui) antes de crear una abstracción nueva.
- SUNAT está en beta y la verificación de email no es automática; revisa
  [src/lib/verification.ts](src/lib/verification.ts) y el README antes de
  cambiar esos flujos.

## Validación y seguridad

- Tras cambios de lógica ejecuta el test más cercano y `npm run lint`; para
  cambios de Prisma o tipos ejecuta también `npm run build` si el entorno tiene
  las variables de base de datos necesarias.
- Comprueba siempre autorización, membresía activa y `businessId` en acciones,
  rutas API y consultas. No expongas secretos ni dependas de datos del cliente
  para decidir el tenant.
- Lee las guías de Next.js en `node_modules/next/dist/docs/` antes de cambiar
  APIs de Next.js, tal como exige el bloque automático de este archivo.
