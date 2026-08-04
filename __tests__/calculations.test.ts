import { describe, expect, it } from "vitest";
import {
  calcAverageOrderValue,
  calcChange,
  calcGrossProfit,
  calcLineTotal,
  calcNetProfit,
  calcProfitMargin,
  calcSaleTotals,
  calcUnitMargin,
  calcUnitProfit,
  calcInventoryValue,
  roundMoney,
  sumPayments,
  validateSplitPayments,
} from "@/lib/calculations";
import { percentChange } from "@/lib/formatting";
import {
  canAccessRoute,
  getDefaultRoute,
  hasPermission,
} from "@/lib/permissions";

describe("money rounding", () => {
  it("rounds to 2 decimal places safely", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(1.999)).toBe(2);
  });
});

describe("sale calculations", () => {
  it("calculates line totals with discounts", () => {
    expect(calcLineTotal(2, 100, 20)).toBe(180);
  });

  it("calculates sale totals with tax", () => {
    const totals = calcSaleTotals({
      items: [
        { quantity: 2, unitPrice: 500 },
        { quantity: 1, unitPrice: 250, discountAmount: 50 },
      ],
      overallDiscount: 100,
      taxRate: 0,
    });
    expect(totals.subtotal).toBe(1200);
    expect(totals.discountAmount).toBe(100);
    expect(totals.total).toBe(1100);
  });

  it("rejects discount exceeding subtotal", () => {
    expect(() =>
      calcSaleTotals({
        items: [{ quantity: 1, unitPrice: 100 }],
        overallDiscount: 150,
      })
    ).toThrow();
  });
});

describe("profit calculations", () => {
  it("computes gross and net profit", () => {
    const revenue = 10000;
    const cogs = 6000;
    const expenses = 1500;
    const gross = calcGrossProfit(revenue, cogs);
    expect(gross).toBe(4000);
    expect(calcNetProfit(gross, expenses)).toBe(2500);
    expect(calcProfitMargin(gross, revenue)).toBe(40);
  });

  it("handles zero revenue for margin and AOV", () => {
    expect(calcProfitMargin(0, 0)).toBe(0);
    expect(calcAverageOrderValue(0, 0)).toBe(0);
    expect(calcAverageOrderValue(1000, 4)).toBe(250);
  });

  it("computes unit profit and margin", () => {
    expect(calcUnitProfit(500, 300)).toBe(200);
    expect(calcUnitMargin(500, 300)).toBe(40);
  });
});

describe("payments", () => {
  it("sums and validates split payments", () => {
    const payments = [
      { amount: 5000, paymentMethod: "cash" },
      { amount: 3000, paymentMethod: "card" },
    ];
    expect(sumPayments(payments)).toBe(8000);
    const result = validateSplitPayments(payments, 8000);
    expect(result.valid).toBe(true);
    expect(result.change).toBe(0);
  });

  it("calculates cash change", () => {
    expect(calcChange(10000, 8750)).toBe(1250);
  });

  it("rejects invalid split payments", () => {
    const result = validateSplitPayments(
      [{ amount: 9000, paymentMethod: "card" }],
      8000
    );
    expect(result.valid).toBe(false);
  });
});

describe("inventory value", () => {
  it("sums stock * cost", () => {
    expect(
      calcInventoryValue([
        { stockQuantity: 10, costPrice: 100 },
        { stockQuantity: 2.5, costPrice: 40 },
      ])
    ).toBe(1100);
  });
});

describe("percent change", () => {
  it("handles zero previous safely", () => {
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(100, 0)).toBe(100);
    expect(percentChange(150, 100)).toBe(50);
  });
});

describe("role permissions", () => {
  it("routes cashiers to POS by default", () => {
    expect(getDefaultRoute("cashier")).toBe("/pos");
    expect(getDefaultRoute("owner")).toBe("/dashboard");
  });

  it("prevents cashiers from profit routes", () => {
    expect(canAccessRoute("cashier", "/dashboard")).toBe(false);
    expect(canAccessRoute("cashier", "/pos")).toBe(true);
    expect(canAccessRoute("cashier", "/reports/profit")).toBe(false);
    expect(hasPermission("cashier", "canViewCost")).toBe(false);
    expect(hasPermission("owner", "canViewCost")).toBe(true);
  });

  it("restricts staff management to owners", () => {
    expect(hasPermission("owner", "canManageStaff")).toBe(true);
    expect(hasPermission("manager", "canManageStaff")).toBe(false);
    expect(canAccessRoute("accountant", "/staff")).toBe(false);
    expect(canAccessRoute("accountant", "/expenses")).toBe(true);
  });

  it("prevents accountants from creating sales via route access", () => {
    expect(canAccessRoute("accountant", "/pos")).toBe(false);
    expect(hasPermission("accountant", "canCreateSales")).toBe(false);
  });
});
