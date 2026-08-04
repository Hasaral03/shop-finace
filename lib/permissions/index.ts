import type { UserRole } from "@/types/application";

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    routes: string[];
    canViewCost: boolean;
    canViewProfit: boolean;
    canManageStaff: boolean;
    canManageSettings: boolean;
    canCreateSales: boolean;
    canCancelSales: boolean;
    canManageProducts: boolean;
    canManageInventory: boolean;
    canManagePurchases: boolean;
    canManageExpenses: boolean;
    canViewReports: boolean;
    canViewFullDashboard: boolean;
  }
> = {
  owner: {
    routes: [
      "/dashboard",
      "/pos",
      "/sales",
      "/products",
      "/categories",
      "/inventory",
      "/stock-movements",
      "/purchases",
      "/customers",
      "/suppliers",
      "/expenses",
      "/expense-categories",
      "/reports",
      "/staff",
      "/settings",
    ],
    canViewCost: true,
    canViewProfit: true,
    canManageStaff: true,
    canManageSettings: true,
    canCreateSales: true,
    canCancelSales: true,
    canManageProducts: true,
    canManageInventory: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canViewReports: true,
    canViewFullDashboard: true,
  },
  manager: {
    routes: [
      "/dashboard",
      "/pos",
      "/sales",
      "/products",
      "/categories",
      "/inventory",
      "/stock-movements",
      "/purchases",
      "/customers",
      "/suppliers",
      "/expenses",
      "/reports",
    ],
    canViewCost: true,
    canViewProfit: true,
    canManageStaff: false,
    canManageSettings: false,
    canCreateSales: true,
    canCancelSales: true,
    canManageProducts: true,
    canManageInventory: true,
    canManagePurchases: true,
    canManageExpenses: false,
    canViewReports: true,
    canViewFullDashboard: true,
  },
  cashier: {
    routes: ["/pos", "/sales", "/customers"],
    canViewCost: false,
    canViewProfit: false,
    canManageStaff: false,
    canManageSettings: false,
    canCreateSales: true,
    canCancelSales: false,
    canManageProducts: false,
    canManageInventory: false,
    canManagePurchases: false,
    canManageExpenses: false,
    canViewReports: false,
    canViewFullDashboard: false,
  },
  accountant: {
    routes: [
      "/dashboard",
      "/sales",
      "/expenses",
      "/expense-categories",
      "/reports",
      "/customers",
      "/suppliers",
    ],
    canViewCost: true,
    canViewProfit: true,
    canManageStaff: false,
    canManageSettings: false,
    canCreateSales: false,
    canCancelSales: false,
    canManageProducts: false,
    canManageInventory: false,
    canManagePurchases: false,
    canManageExpenses: true,
    canViewReports: true,
    canViewFullDashboard: true,
  },
};

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (pathname.startsWith("/receipts")) return true;
  return perms.routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export function getDefaultRoute(role: UserRole): string {
  if (role === "cashier") return "/pos";
  return "/dashboard";
}

export function hasPermission(
  role: UserRole,
  permission: keyof (typeof ROLE_PERMISSIONS)["owner"]
): boolean {
  const value = ROLE_PERMISSIONS[role][permission];
  return typeof value === "boolean" ? value : false;
}
