"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { inviteStaff } from "@/lib/actions/staff";
import { staffInviteSchema, type StaffInviteInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InviteValues = z.input<typeof staffInviteSchema>;

export function InviteStaffForm() {
  const router = useRouter();
  const form = useForm<InviteValues, unknown, StaffInviteInput>({
    resolver: zodResolver(staffInviteSchema),
    defaultValues: { full_name: "", email: "", password: "", role: "cashier" },
  });
  const selectedRole = useWatch({ control: form.control, name: "role" }) ?? "cashier";

  async function submit(values: StaffInviteInput) {
    const result = await inviteStaff(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Staff account created");
    form.reset();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite staff</CardTitle>
        <CardDescription>Create an account with a temporary password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-2">
            <Label htmlFor="staff-name">Full name</Label>
            <Input id="staff-name" {...form.register("full_name")} aria-invalid={Boolean(form.formState.errors.full_name)} />
            {form.formState.errors.full_name ? <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input id="staff-email" type="email" {...form.register("email")} aria-invalid={Boolean(form.formState.errors.email)} />
            {form.formState.errors.email ? <p className="text-xs text-destructive">{form.formState.errors.email.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-password">Temporary password</Label>
            <Input id="staff-password" type="password" autoComplete="new-password" {...form.register("password")} aria-invalid={Boolean(form.formState.errors.password)} />
            {form.formState.errors.password ? <p className="text-xs text-destructive">{form.formState.errors.password.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={(value) => value && form.setValue("role", value as StaffInviteInput["role"])}>
              <SelectTrigger aria-label="Staff role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Create staff account
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
