import Link from "next/link";
import {
  BadgeDollarSign,
  Boxes,
  CreditCard,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRouteAccess } from "@/lib/auth";

const reports = [
  ["sales", "Sales", "Invoices, statuses, and sales totals.", ShoppingCart],
  ["revenue", "Revenue", "Daily revenue and order volume.", TrendingUp],
  ["profit", "Profit", "Revenue, cost of goods, and net profit.", BadgeDollarSign],
  ["expenses", "Expenses", "Operating costs by category.", ReceiptText],
  ["inventory", "Inventory", "Stock value, levels, and movements.", Boxes],
  ["products", "Products", "Product sales and gross profit.", PackageSearch],
  ["payments", "Payments", "Collections grouped by payment method.", CreditCard],
  ["customers", "Customers", "Customer activity and spending.", Users],
  ["suppliers", "Suppliers", "Supplier purchasing activity.", Truck],
] as const;

export default async function ReportsPage() {
  await requireRouteAccess("/reports");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Review performance, finances, stock, and business relationships."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map(([path, title, description, Icon]) => (
          <Link key={path} href={`/reports/${path}`} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
