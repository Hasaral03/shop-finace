"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Customer } from "@/types/application";
import { customerSchema, type CustomerInput } from "@/lib/validations";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CustomerForm({ customer, trigger }: { customer?: Customer; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const form = useForm<CustomerInput>({ resolver: zodResolver(customerSchema) as Resolver<CustomerInput>, defaultValues: { name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "", address: customer?.address ?? "", credit_limit: customer?.credit_limit ?? 0, notes: customer?.notes ?? "", is_active: customer?.is_active ?? true } });
  async function submit(values: CustomerInput) { const result = customer ? await updateCustomer(customer.id, values) : await createCustomer(values); if (!result.success) return toast.error(result.error); toast.success(customer ? "Customer updated" : "Customer added"); setOpen(false); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={trigger} /><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle><DialogDescription>Keep contact and credit details up to date.</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit(submit)} className="space-y-3">
    <div className="space-y-1"><Label>Name</Label><Input {...form.register("name")} />{form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
    <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Phone</Label><Input {...form.register("phone")} /></div><div className="space-y-1"><Label>Email</Label><Input type="email" {...form.register("email")} /></div></div>
    <div className="space-y-1"><Label>Address</Label><Textarea {...form.register("address")} /></div><div className="space-y-1"><Label>Credit limit</Label><Input type="number" min="0" step="0.01" {...form.register("credit_limit")} /></div><div className="space-y-1"><Label>Notes</Label><Textarea {...form.register("notes")} /></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("is_active")} /> Active customer</label><DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save customer"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
