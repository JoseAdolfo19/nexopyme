<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# NexoPyme — Multi-Tenant SaaS for SMB Management

**NexoPyme** is a modern SaaS platform designed for small and medium-sized businesses (SMBs) to manage sales, inventory, customers, and compliance. Built with Next.js 16, Prisma 7, and MariaDB.

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
- Next.js 16.3.1 (App Router)
- Prisma 7.9.1 with MariaDB adapter
- React 19.2.8 (server components default)
- Tailwind + PostCSS 4
- Zod for validation
- Jose for JWT auth
- Bcryptjs for passwords

---

## Database & Schema

**Provider**: MariaDB/MySQL (UTF8MB4)  
**Output**: `src/generated/prisma/` (auto-generated types)

### Core Multi-Tenant Model
- **User** → owns businesses; has many branches, sales, audit logs
- **Business** → multi-tenant root; has modules, settings (JSON), subscription
- **BusinessUser** → join table with role (admin/seller/accountant/warehouse)
- **Branch** → physical locations; links to sales and cash registers

### Domains
1. **Customers & Suppliers**: doc types (DNI, RUC, CE, PASAPORTE)
2. **Products & Categories**: hierarchical; track stock, pricing, attributes
3. **Sales & SaleItems**: per-branch; payment methods, status tracking
4. **Inventory Movements**: audit trail (entrada/salida/ajuste/venta)
5. **Documents**: SUNAT-compatible (boleta/factura/nota_credito/nota_debito)
6. **Cash Management**: CashRegister, CashMovement per branch
7. **Subscriptions & Plans**: free tier with 30-day trial

**Schema location**: [prisma/schema.prisma](prisma/schema.prisma)

---

## Architecture & Patterns

### Authentication & Authorization
- **Session-based** (custom JWT in cookies via `lib/auth.ts`)
- **requireBusiness()**: Server-only wrapper that enforces businessId + active membership
- Session stored in cookies; cleared on logout
- No Lucia, Clerk, etc. — custom lightweight implementation

**Key files**:
- [src/lib/auth.ts](src/lib/auth.ts) — `getCurrentUser()`, `requireBusiness()`, `getSession()`, `setSession()`
- [src/app/actions/auth.ts](src/app/actions/auth.ts) — register, login, logout actions

### Server Actions & Forms
- All mutations are Server Actions in `src/app/actions/`
- Return `{ error: "..." }` or `{ ok: true }` + redirect
- Use Zod schemas for input validation
- Auto-refresh business context via `setSession({ ...session, businessId: to })`

**Action patterns**:
```typescript
// src/app/actions/business.ts
export async function createBusinessAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "..." };
  const parsed = businessSchema.safeParse({...});
  if (!parsed.success) return { error: ... };
  // Transactional create: business + membership + branch + plan
  await prisma.$transaction(async (tx) => { ... });
  redirect("/dashboard");
}
```

### Components & UI
- **Server Components** by default (no "use client" unless interactivity needed)
- Custom UI kit in [src/components/ui/](src/components/ui/) — `Button`, `Card`, `Field` (Input/Select)
- **Form state**: `useActionState()` for error/loading in client components
- **Styling**: Tailwind classes; brand color = `brand-600` (defined in config)

### Data Fetching
- Use `prisma` queries directly in Server Components
- Parallel fetches with `Promise.all()` for performance
- Lean queries: `select { id, name, ... }` to avoid N+1
- **No caching** by default; cache is invalidated on mutation via revalidatePath/revalidateTag

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API
│   ├── (auth)/            # Login, register, onboarding
│   ├── clientes/          # Customer CRUD + history
│   ├── dashboard/         # Main dashboard with KPIs
│   ├── inventario/        # Stock tracking & adjustments
│   ├── productos/         # Product CRUD
│   ├── ventas/            # New sale + history
│   ├── comprobantes/      # SUNAT documents
│   ├── reportes/          # Analytics & exports
│   ├── configuracion/     # Settings & team management
│   ├── actions/           # Server actions (business, sales, auth, etc.)
│   └── layout.tsx         # Root layout; app shell
├── components/            # Shared React components
│   ├── AppShell.tsx       # Header, nav, menu
│   ├── SaleForm.tsx       # Complex multi-step form
│   ├── ProductForm.tsx    # Product editor
│   └── ui/                # Button, Card, Field, Badge
├── lib/
│   ├── auth.ts            # JWT + session management
│   ├── prisma.ts          # Prisma singleton
│   ├── constants.ts       # Business types, payment methods, plans
│   ├── format.ts          # formatSoles(), formatDate(), etc.
│   ├── validations.ts     # Zod schemas
│   └── cn.ts              # clsx helper
├── generated/prisma/      # Auto-generated Prisma types
└── globals.css            # Tailwind directives + brand colors
```

---

## Common Patterns

### 1. Server Components with Business Context
```typescript
import { requireBusiness } from "@/lib/auth";
export default async function Page() {
  const { business, user } = await requireBusiness();
  // Always check business.modules for feature gates
  const modules = (business.modules as string[]) ?? [];
  if (!modules.includes("inventario")) return <div>Not enabled</div>;
}
```

### 2. Module-Based Feature Flags
Business modules are configured in `createBusinessAction` based on business type + onboarding answers:
- Core: dashboard, ventas, clientes, productos, comprobantes, reportes
- Extras vary by type (restaurante → inventario, mesas, comandas; salon_belleza → servicios, agenda)
- Always filter UI with: `modules.map(m => MODULE_MENU[m]).filter(Boolean)`

### 3. Multi-Tenant Queries
Always include `businessId` filter:
```typescript
const products = await prisma.product.findMany({
  where: { businessId: business.id, isActive: true },
});
```

### 4. Stock Tracking
Products have `trackStock: boolean`. Movements auto-create inventory records:
```typescript
// When sale completes, stock updates via InventoryMovement
await prisma.inventoryMovement.create({
  data: { businessId, productId, type: "venta", quantity, ... }
});
```

### 5. Transactional Operations
For multi-step operations (business creation, document submission), use:
```typescript
await prisma.$transaction(async (tx) => {
  await tx.business.create({...});
  await tx.businessUser.create({...});
  await tx.branch.create({...});
});
```

---

## Key Files & Entry Points

| File | Purpose |
|------|---------|
| [next.config.ts](next.config.ts) | Empty; extend if needed |
| [prisma.config.ts](prisma.config.ts) | Exists but unused in current setup |
| [package.json](package.json) | Build scripts; Prisma v7 + adapters |
| [src/lib/constants.ts](src/lib/constants.ts) | BUSINESS_TYPES, MODULE_MENU, PAYMENT_METHODS, PLANS |
| [src/app/layout.tsx](src/app/layout.tsx) | Tailwind setup; brand colors in CSS |
| [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) | KPIs: sales today/month, profit, low stock |
| [src/app/onboarding/page.tsx](src/app/onboarding/page.tsx) | 9-step wizard; configures modules dynamically |

---

## Common Gotchas

1. **Prisma Build Step**: `npm run build` must run `prisma generate` first. Failing to regenerate types breaks TypeScript.
2. **Multi-Tenant Isolation**: Every query must filter by `businessId`. Forgetting this leaks data across tenants.
3. **Session Context**: `requireBusiness()` reads session & checks membership. Logged-in but no business → redirects to onboarding.
4. **Stock Precision**: Stock fields use `Decimal(12,3)` for fractional units (e.g., 0.5 kg). Convert to `Number()` in JS.
5. **No Real Email**: Auth flow marks emails as verified immediately (MVP). Real email verification token flow is prepared but unused.
6. **SUNAT Beta**: Document submission is beta; environment hardcoded to "beta". Series hardcoded (B001 boleta, F001 factura).
7. **Module Dependencies**: Removing a module may orphan UI. Always check `MODULE_MENU` and page conditions before navigation.
8. **Client Components**: Default to Server Components. Only use `"use client"` for forms, interactive filters, real-time updates.

---

## Workflow Tips for AI Agents

- **Start with `requireBusiness()`**: Every protected page must validate auth + business membership first.
- **Check modules before rendering**: Feature sections should conditionally display based on `modules.includes("feature")`.
- **Use Zod schemas**: Always validate FormData; errors are user-facing.
- **Prisma types are auto-generated**: After schema changes, run `npm run build` or `prisma generate` to refresh types in `src/generated/prisma/`.
- **Brand color in Tailwind**: Use `bg-brand-600`, `text-brand-700`, etc. (defined in `globals.css`).
- **Format currencies/dates**: Import helpers from `lib/format.ts` (formatSoles, formatDate, formatDateTime, formatNumber).
- **Constants are centralized**: Business types, payment methods, document statuses → `lib/constants.ts`.
- **No external auth service**: All JWT/session logic is in `lib/auth.ts`; keep it simple.

---

## Development Checklist

When adding a new feature:
1. ✅ Add schema fields to `prisma/schema.prisma`
2. ✅ Run `npm run build` to generate Prisma types
3. ✅ Add server action in `src/app/actions/`
4. ✅ Create page/component with `requireBusiness()` guard
5. ✅ Add business type to `BUSINESS_TYPES` or new constant if needed
6. ✅ Link from `MODULE_MENU` if it's a top-level feature
7. ✅ Test multi-tenant isolation (try with different businesses)
8. ✅ Lint: `npm run lint`
