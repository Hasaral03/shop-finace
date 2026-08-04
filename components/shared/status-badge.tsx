import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentStatus, SaleStatus } from "@/types/application";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type ProfitStatus = "profit" | "loss";
export type StatusBadgeStatus =
  | SaleStatus
  | PaymentStatus
  | StockStatus
  | ProfitStatus;

const statusStyles: Record<StatusBadgeStatus, string> = {
  completed: "bg-success/15 text-success dark:bg-success/20",
  pending: "bg-warning/15 text-warning dark:bg-warning/20",
  cancelled: "bg-danger/15 text-danger dark:bg-danger/20",
  refunded: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  paid: "bg-success/15 text-success dark:bg-success/20",
  partially_paid: "bg-warning/15 text-warning dark:bg-warning/20",
  unpaid: "bg-danger/15 text-danger dark:bg-danger/20",
  in_stock: "bg-success/15 text-success dark:bg-success/20",
  low_stock: "bg-warning/15 text-warning dark:bg-warning/20",
  out_of_stock: "bg-danger/15 text-danger dark:bg-danger/20",
  profit: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  loss: "bg-danger/15 text-danger dark:bg-danger/20",
};

const statusLabels: Record<StatusBadgeStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  cancelled: "Cancelled",
  refunded: "Refunded",
  paid: "Paid",
  partially_paid: "Partially paid",
  unpaid: "Unpaid",
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  profit: "Profit",
  loss: "Loss",
};

interface StatusBadgeProps {
  status: StatusBadgeStatus;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent", statusStyles[status], className)}
    >
      {label ?? statusLabels[status]}
    </Badge>
  );
}
