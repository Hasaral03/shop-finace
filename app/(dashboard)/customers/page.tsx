import { Plus } from "lucide-react";
import { requireRouteAccess } from "@/lib/auth";
import { getCustomers } from "@/lib/actions/customers";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomersTable } from "@/components/customers/customers-table";
import { Button } from "@/components/ui/button";

type Query = Record<string, string | string[] | undefined>; const text = (v: string | string[] | undefined) => typeof v === "string" ? v : undefined;
export default async function CustomersPage({ searchParams }: { searchParams: Promise<Query> }) {
  const [{ profile, shop }, query] = await Promise.all([requireRouteAccess("/customers"), searchParams]); const active = text(query.active); const filters = { search: text(query.search), active };
  const result = await getCustomers({ search: filters.search, active: active === "true" ? true : active === "false" ? false : undefined, page: Number(text(query.page) ?? 1), pageSize: 20 }); if (!result.success) throw new Error(result.error);
  const canManage = profile.role !== "accountant";
  return <div className="space-y-6"><PageHeader title="Customers" description="Manage contacts, credit limits, and outstanding balances." actions={canManage ? <CustomerForm trigger={<Button><Plus /> Add customer</Button>} /> : undefined} /><CustomersTable {...result.data} currency={shop?.currency ?? "LKR"} canManage={canManage} canDelete={profile.role === "owner" || profile.role === "manager"} filters={filters} /></div>;
}
