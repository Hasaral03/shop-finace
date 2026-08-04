"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "@/types/application";
import { deleteCustomer } from "@/lib/actions/customers";
import { formatCurrency } from "@/lib/formatting";
import { CustomerForm } from "./customer-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function CustomersTable({ customers, count, page, pageSize, currency, canManage, canDelete, filters }: { customers: Customer[]; count: number; page: number; pageSize: number; currency: string; canManage: boolean; canDelete: boolean; filters: Record<string, string | undefined> }) {
  const router = useRouter(); const current = useSearchParams(); const go = (p: number) => { const q = new URLSearchParams(current); q.set("page", String(p)); router.push(`/customers?${q}`); };
  async function remove(id: string) {
    const result = await deleteCustomer(id);
    if (result.success) toast.success("Customer deleted");
    else toast.error(result.error);
    router.refresh();
  }
  return <div className="overflow-hidden rounded-xl border bg-card"><form className="flex flex-col gap-2 border-b p-3 sm:flex-row"><Input name="search" defaultValue={filters.search} placeholder="Search name, phone, or email" className="max-w-md" /><select name="active" defaultValue={filters.active ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm"><option value="">All customers</option><option value="true">Active</option><option value="false">Inactive</option></select><Button type="submit">Filter</Button></form>
    <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Credit limit</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead>{canManage && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader><TableBody>{customers.length ? customers.map((customer) => <TableRow key={customer.id}><TableCell><Link href={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">{customer.name}</Link></TableCell><TableCell><div>{customer.phone ?? "—"}</div><div className="text-xs text-muted-foreground">{customer.email}</div></TableCell><TableCell>{formatCurrency(customer.credit_limit, currency)}</TableCell><TableCell>{formatCurrency(customer.current_balance, currency)}</TableCell><TableCell><Badge variant={customer.is_active ? "secondary" : "outline"}>{customer.is_active ? "Active" : "Inactive"}</Badge></TableCell>{canManage && <TableCell><div className="flex justify-end gap-1"><CustomerForm customer={customer} trigger={<Button variant="ghost" size="icon-sm"><Pencil /></Button>} />{canDelete && <ConfirmDialog trigger={<Button variant="ghost" size="icon-sm"><Trash2 /></Button>} title="Delete customer?" description="Customers with sales history may need to be deactivated instead." onConfirm={() => remove(customer.id)} />}</div></TableCell>}</TableRow>) : <TableRow><TableCell colSpan={canManage ? 6 : 5} className="h-32 text-center text-muted-foreground">No customers found.</TableCell></TableRow>}</TableBody></Table><DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={go} /></div>;
}
