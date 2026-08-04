/**
 * Development seed script.
 * Creates auth users, profiles, and links them to the sample shop.
 *
 * Prerequisites:
 * 1. Apply migrations in Supabase SQL editor (001, 002, 003)
 * 2. Run supabase/seed.sql for shop/products/customers/suppliers
 * 3. Set env vars in .env.local
 *
 * Usage: node --env-file=.env.local scripts/seed.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SHOP_ID = "11111111-1111-1111-1111-111111111111";

const users = [
  {
    email: "owner@lankafresh.lk",
    password: "Password123!",
    full_name: "Anusha Owner",
    role: "owner",
    id: "a0000001-0000-0000-0000-000000000001",
  },
  {
    email: "manager@lankafresh.lk",
    password: "Password123!",
    full_name: "Mahesh Manager",
    role: "manager",
    id: "a0000001-0000-0000-0000-000000000002",
  },
  {
    email: "cashier@lankafresh.lk",
    password: "Password123!",
    full_name: "Chamari Cashier",
    role: "cashier",
    id: "a0000001-0000-0000-0000-000000000003",
  },
  {
    email: "accountant@lankafresh.lk",
    password: "Password123!",
    full_name: "Dilani Accountant",
    role: "accountant",
    id: "a0000001-0000-0000-0000-000000000004",
  },
];

async function ensureUser(u) {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find((x) => x.email === u.email);
  if (existing) {
    console.log(`User exists: ${u.email}`);
    await admin.from("profiles").upsert({
      id: existing.id,
      shop_id: SHOP_ID,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      is_active: true,
    });
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: {
      full_name: u.full_name,
      role: u.role,
      shop_id: SHOP_ID,
    },
  });

  if (error) {
    console.error(`Failed to create ${u.email}:`, error.message);
    return null;
  }

  await admin.from("profiles").upsert({
    id: data.user.id,
    shop_id: SHOP_ID,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    is_active: true,
  });

  console.log(`Created user: ${u.email} (${u.role})`);
  return data.user.id;
}

async function seedSampleTransactions(ownerId) {
  if (!ownerId) return;

  // Sample expenses
  const { data: categories } = await admin
    .from("expense_categories")
    .select("id, name")
    .eq("shop_id", SHOP_ID);

  const rent = categories?.find((c) => c.name === "Rent");
  const electricity = categories?.find((c) => c.name === "Electricity");

  const today = new Date();
  const isoDate = (d) => d.toISOString().slice(0, 10);

  if (rent) {
    await admin.from("expenses").insert({
      shop_id: SHOP_ID,
      category_id: rent.id,
      amount: 85000,
      description: "Monthly shop rent - Colombo 03",
      payment_method: "bank_transfer",
      expense_date: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      created_by: ownerId,
    });
  }

  if (electricity) {
    await admin.from("expenses").insert({
      shop_id: SHOP_ID,
      category_id: electricity.id,
      amount: 18500,
      description: "CEB bill",
      payment_method: "cash",
      expense_date: isoDate(today),
      created_by: ownerId,
    });
  }

  // Opening stock movements
  const { data: products } = await admin
    .from("products")
    .select("id, stock_quantity")
    .eq("shop_id", SHOP_ID)
    .limit(5);

  for (const p of products ?? []) {
    await admin.from("stock_movements").insert({
      shop_id: SHOP_ID,
      product_id: p.id,
      movement_type: "opening_stock",
      quantity_change: p.stock_quantity,
      quantity_before: 0,
      quantity_after: p.stock_quantity,
      note: "Opening stock seed",
      created_by: ownerId,
    });
  }

  console.log("Sample expenses and stock movements created.");
}

async function main() {
  console.log("Seeding Shop Finance auth users…");

  // Ensure shop exists
  await admin.from("shops").upsert({
    id: SHOP_ID,
    name: "Lanka Fresh Mart",
    phone: "+94112345678",
    email: "hello@lankafresh.lk",
    address: "42 Galle Road, Colombo 03, Sri Lanka",
    currency: "LKR",
    timezone: "Asia/Colombo",
    tax_rate: 0,
    receipt_footer: "Thank you for shopping with Lanka Fresh Mart!",
    allow_negative_stock: false,
  });

  let ownerId = null;
  for (const u of users) {
    const id = await ensureUser(u);
    if (u.role === "owner") ownerId = id;
  }

  await seedSampleTransactions(ownerId);

  console.log("\nSeed complete. Login with:");
  for (const u of users) {
    console.log(`  ${u.role.padEnd(12)} ${u.email} / Password123!`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
