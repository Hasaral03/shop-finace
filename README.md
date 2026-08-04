# Shop Finance

Production-ready retail shop management system built with **Next.js App Router**, **TypeScript**, **Supabase** (Auth, PostgreSQL, Storage), **Tailwind CSS**, and **shadcn/ui**.

Manage products, inventory, POS sales, purchases, expenses, customers, suppliers, staff, and financial reports — with a role-aware owner dashboard for revenue, gross profit, net profit, and operational KPIs.

## Features

- **Owner dashboard** — revenue, gross/net profit, expenses, AOV, inventory value, credit outstanding, trends, and operational widgets
- **Point of Sale** — barcode search, cart, discounts, tax, split payments, credit sales, printable receipts
- **Inventory** — stock levels, adjustments, damaged/expired stock, movement history (no silent stock changes)
- **Purchases & suppliers** — transactional stock increases via PostgreSQL functions
- **Expenses** — categorized expenses with receipt uploads
- **Customers** — credit limits, balances, history
- **Staff** — owner-only invites with roles: owner, manager, cashier, accountant
- **Reports** — sales, revenue, profit, expenses, inventory, products, payments, customers, suppliers
- **Security** — Row Level Security, shop isolation, server-side role checks, cashier cost-price masking

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database / Auth / Storage | Supabase |
| UI | Tailwind CSS v4 + shadcn/ui |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Dates | date-fns + date-fns-tz |
| Tests | Vitest |

## Prerequisites

- Node.js 20+
- A Supabase project
- npm

## 1. Clone and install

```bash
cd shop-finace
npm install
```

## 2. Configure environment

Copy `.env.example` to `.env.local` and fill in values from your Supabase project (**Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It is used only in server-side staff invitation / seed scripts.

## 3. Apply database migrations

In the Supabase SQL Editor, run these files **in order**:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_business_functions.sql`
4. `supabase/migrations/004_storage.sql`

Or with the Supabase CLI:

```bash
supabase db push
```

## 4. Seed development data

1. Run `supabase/seed.sql` in the SQL Editor (shop, categories, products, customers, suppliers, expense categories).
2. Create auth users + profiles:

```bash
npm run seed
```

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Owner | owner@lankafresh.lk | Password123! |
| Manager | manager@lankafresh.lk | Password123! |
| Cashier | cashier@lankafresh.lk | Password123! |
| Accountant | accountant@lankafresh.lk | Password123! |

Sample shop: **Lanka Fresh Mart** (LKR, Asia/Colombo).

## 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run Vitest unit tests |
| `npm run seed` | Seed auth users + sample expenses |

## Role permissions (summary)

| Capability | Owner | Manager | Cashier | Accountant |
| --- | --- | --- | --- | --- |
| Full dashboard / profit | ✓ | ✓ | | ✓ |
| POS / create sales | ✓ | ✓ | ✓ | |
| View cost prices | ✓ | ✓ | | ✓ |
| Products / inventory | ✓ | ✓ | | |
| Purchases / suppliers | ✓ | ✓ | | view |
| Expenses | ✓ | view | | ✓ |
| Staff / settings | ✓ | | | |

## Project structure

```text
app/
  (auth)/login/
  (dashboard)/
    dashboard/ pos/ sales/ products/ categories/
    inventory/ stock-movements/ purchases/
    customers/ suppliers/ expenses/ expense-categories/
    reports/ staff/ settings/ receipts/
components/          # UI + feature components
lib/
  actions/           # Server Actions
  supabase/          # browser, server, admin, middleware clients
  validations/ permissions/ calculations/ formatting/
supabase/migrations/ # SQL schema, RLS, RPCs, storage
scripts/seed.mjs
__tests__/
```

## Business formulas

- **Revenue** = sum of `total_amount` for completed sales
- **COGS** = sum of `unit_cost × quantity` from `sale_items` snapshots
- **Gross profit** = Revenue − COGS
- **Net profit** = Gross profit − Expenses
- **AOV** = Revenue ÷ completed sales count (safe if zero)
- **Profit margin** = Gross profit ÷ Revenue × 100
- **Inventory value** = stock × cost_price

Sales use PostgreSQL `create_sale_transaction` so sale rows, items, payments, stock reductions, stock movements, and customer balances commit atomically.

## Testing

```bash
npm test
```

Covers revenue/profit math, discounts, tax, split payments, change calculation, inventory value, and role permission routing.

For integration testing against Supabase, configure a dedicated project and run migrations + seed before exercising POS / purchase RPCs.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add the same environment variables as `.env.local`.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL.
5. Deploy.

In Supabase:

1. Confirm Auth → URL configuration includes your Vercel domain.
2. Ensure migrations and storage buckets are applied on the production project.
3. Optionally disable public signups if staff are invite-only.

## Supabase checklist

- [ ] Migrations 001–004 applied
- [ ] Seed SQL + `npm run seed` (dev) or invite staff (prod)
- [ ] Storage buckets `product-images` and `expense-receipts` exist
- [ ] RLS enabled (included in migrations)
- [ ] Service role key only in server env

## Security notes

- All business tables are scoped by `shop_id` with RLS.
- Cashiers cannot access profit dashboards and see masked cost prices via `products_pos` / server filtering.
- Completed sales are cancelled via `cancel_sale` (history retained), not hard-deleted.
- Stock never changes without a `stock_movements` row.

## License

Private / unlicensed — use as needed for your shop.
