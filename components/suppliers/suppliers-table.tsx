"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/types/application";
import { deleteSupplier } from "@/lib/actions/suppliers";
import { formatCurrency } from "@/lib/formatting";
import { SupplierForm } from "./supplier-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SuppliersTable({ suppliers, count, page, pageSize, currency, canManage, filters }: { suppliers: Supplier[]; count: number; page: number; pageSize: number; currency: string; canManage: boolean; filters: Record<string, string | undefined> }) {
  const router = useRouter(); const current = useSearchParams(); const go = (p: number) => { const q = new URLSearchParams(current); q.set("page", String(p)); router.push(`/suppliers?${q}`); };
  async function remove(id: string) {
    const result = await deleteSupplier(id);
    if (result.success) toast.success("Supplier deleted");
    else toast.error(result.error);
    router.refresh();
  }
  return <div className="overflow-hidden rounded-xl border bg-card"><form className="flex flex-col gap-2 border-b p-3 sm:flex-row"><Input name="search" defaultValue={filters.search} placeholder="Name, contact, phone, or email" className="max-w-md" /><select name="active" defaultValue={filters.active ?? ""} className="h-8 rounded-lg border bg-background px-2 text-sm"><option value="">All suppliers</option><option value="true">Active</option><option value="false">Inactive</option></select><Button type="submit">Filter</Button></form>
    <Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Contact</TableHead><TableHead>Phone / email</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead>{canManage && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader><TableBody>{suppliers.length ? suppliers.map((supplier) => <TableRow key={supplier.id}><TableCell><Link href={`/suppliers/${supplier.id}`} className="font-medium text-primary hover:underline">{supplier.name}</Link></TableCell><TableCell>{supplier.contact_person ?? "—"}</TableCell><TableCell><div>{supplier.phone ?? "—"}</div><div className="text-xs text-muted-foreground">{supplier.email}</div></TableCell><TableCell>{formatCurrency(supplier.current_balance, currency)}</TableCell><TableCell><Badge variant={supplier.is_active ? "secondary" : "outline"}>{supplier.is_active ? "Active" : "Inactive"}</Badge></TableCell>{canManage && <TableCell><div className="flex justify-end gap-1"><SupplierForm supplier={supplier} trigger={<Button variant="ghost" size="icon-sm"><Pencil /></Button>} /><ConfirmDialog trigger={<Button variant="ghost" size="icon-sm"><Trash2 /></Button>} title="Delete supplier?" description="Suppliers with purchase history may need to be deactivated instead." onConfirm={() => remove(supplier.id)} /></div></TableCell>}</TableRow>) : <TableRow><TableCell colSpan={canManage ? 6 : 5} className="h-32 text-center text-muted-foreground">No suppliers found.</TableCell></TableRow>}</TableBody></Table><DataTablePagination page={page} pageSize={pageSize} total={count} onPageChange={go} /></div>;
}
