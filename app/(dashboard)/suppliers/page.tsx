import { Plus } from "lucide-react";
import { requireRouteAccess } from "@/lib/auth";
import { getSuppliers } from "@/lib/actions/suppliers";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { Button } from "@/components/ui/button";

type Query = Record<string, string | string[] | undefined>; const text = (v: string | string[] | undefined) => typeof v === "string" ? v : undefined;
export default async function SuppliersPage({ searchParams }: { searchParams: Promise<Query> }) {
  const [{ profile, shop }, query] = await Promise.all([requireRouteAccess("/suppliers"), searchParams]); const active = text(query.active); const filters = { search: text(query.search), active }; const canManage = profile.role === "owner" || profile.role === "manager";
  const result = await getSuppliers({ search: filters.search, active: active === "true" ? true : active === "false" ? false : undefined, page: Number(text(query.page) ?? 1), pageSize: 20 }); if (!result.success) throw new Error(result.error);
  return <div className="space-y-6"><PageHeader title="Suppliers" description="Manage vendors and outstanding purchase balances." actions={canManage ? <SupplierForm trigger={<Button><Plus /> Add supplier</Button>} /> : undefined} /><SuppliersTable {...result.data} currency={shop?.currency ?? "LKR"} canManage={canManage} filters={filters} /></div>;
}
