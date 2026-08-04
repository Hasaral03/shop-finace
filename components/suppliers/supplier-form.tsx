"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Supplier } from "@/types/application";
import { supplierSchema, type SupplierInput } from "@/lib/validations";
import { createSupplier, updateSupplier } from "@/lib/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SupplierForm({ supplier, trigger }: { supplier?: Supplier; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false); const form = useForm<SupplierInput>({ resolver: zodResolver(supplierSchema) as Resolver<SupplierInput>, defaultValues: { name: supplier?.name ?? "", contact_person: supplier?.contact_person ?? "", phone: supplier?.phone ?? "", email: supplier?.email ?? "", address: supplier?.address ?? "", notes: supplier?.notes ?? "", is_active: supplier?.is_active ?? true } });
  async function submit(values: SupplierInput) { const result = supplier ? await updateSupplier(supplier.id, values) : await createSupplier(values); if (!result.success) return toast.error(result.error); toast.success(supplier ? "Supplier updated" : "Supplier added"); setOpen(false); }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={trigger} /><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{supplier ? "Edit supplier" : "Add supplier"}</DialogTitle><DialogDescription>Maintain supplier contact and account information.</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit(submit)} className="space-y-3">
    <div className="space-y-1"><Label>Name</Label><Input {...form.register("name")} /></div><div className="space-y-1"><Label>Contact person</Label><Input {...form.register("contact_person")} /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Phone</Label><Input {...form.register("phone")} /></div><div className="space-y-1"><Label>Email</Label><Input type="email" {...form.register("email")} /></div></div><div className="space-y-1"><Label>Address</Label><Textarea {...form.register("address")} /></div><div className="space-y-1"><Label>Notes</Label><Textarea {...form.register("notes")} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("is_active")} /> Active supplier</label><DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save supplier"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
