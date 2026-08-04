"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setStaffActive, updateStaffRole } from "@/lib/actions/staff";
import type { Profile, UserRole } from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const roles: UserRole[] = ["owner", "manager", "cashier", "accountant"];

export function StaffTable({
  staff,
  currentUserId,
}: {
  staff: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(staffId: string, action: () => Promise<{ success: boolean; error?: string }>, success: string) {
    setPendingId(staffId);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => {
              const rowPending = isPending && pendingId === member.id;
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <p className="font-medium">
                      {member.full_name}
                      {member.id === currentUserId ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email ?? "No email"}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      disabled={rowPending}
                      onValueChange={(role) => {
                        if (!role || role === member.role) return;
                        run(member.id, () => updateStaffRole(member.id, role as UserRole), "Staff role updated");
                      }}
                    >
                      <SelectTrigger className="w-36" aria-label={`Role for ${member.full_name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role[0].toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? "default" : "secondary"}>
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={member.is_active ? "destructive" : "outline"}
                      disabled={rowPending}
                      onClick={() =>
                        run(
                          member.id,
                          () => setStaffActive(member.id, !member.is_active),
                          member.is_active ? "Staff member deactivated" : "Staff member activated"
                        )
                      }
                    >
                      {rowPending ? <Loader2 className="animate-spin" /> : null}
                      {member.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
