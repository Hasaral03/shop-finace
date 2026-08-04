export function calcLineTotal(
  quantity: number,
  unitPrice: number,
  discountAmount = 0
): number {
  const total = quantity * unitPrice - discountAmount;
  return roundMoney(Math.max(total, 0));
}

export function calcSaleTotals(input: {
  items: Array<{ quantity: number; unitPrice: number; discountAmount?: number }>;
  overallDiscount?: number;
  taxRate?: number;
  taxAmount?: number;
}) {
  const subtotal = roundMoney(
    input.items.reduce(
      (sum, item) =>
        sum + calcLineTotal(item.quantity, item.unitPrice, item.discountAmount ?? 0),
      0
    )
  );

  const overallDiscount = roundMoney(Math.max(input.overallDiscount ?? 0, 0));
  if (overallDiscount > subtotal) {
    throw new Error("Discount cannot exceed subtotal");
  }

  const taxable = subtotal - overallDiscount;
  const taxAmount =
    input.taxAmount != null
      ? roundMoney(input.taxAmount)
      : roundMoney(taxable * ((input.taxRate ?? 0) / 100));

  const total = roundMoney(taxable + taxAmount);

  return { subtotal, discountAmount: overallDiscount, taxAmount, total };
}

export function calcChange(amountReceived: number, totalDue: number): number {
  return roundMoney(Math.max(amountReceived - totalDue, 0));
}

export function calcGrossProfit(revenue: number, cogs: number): number {
  return roundMoney(revenue - cogs);
}

export function calcNetProfit(grossProfit: number, expenses: number): number {
  return roundMoney(grossProfit - expenses);
}

export function calcProfitMargin(grossProfit: number, revenue: number): number {
  if (revenue === 0) return 0;
  return roundMoney((grossProfit / revenue) * 100);
}

export function calcAverageOrderValue(revenue: number, salesCount: number): number {
  if (salesCount === 0) return 0;
  return roundMoney(revenue / salesCount);
}

export function calcInventoryValue(
  items: Array<{ stockQuantity: number; costPrice: number }>
): number {
  return roundMoney(
    items.reduce((sum, item) => sum + item.stockQuantity * item.costPrice, 0)
  );
}

export function calcUnitProfit(sellingPrice: number, costPrice: number): number {
  return roundMoney(sellingPrice - costPrice);
}

export function calcUnitMargin(sellingPrice: number, costPrice: number): number {
  if (sellingPrice === 0) return 0;
  return roundMoney(((sellingPrice - costPrice) / sellingPrice) * 100);
}

export function sumPayments(payments: Array<{ amount: number }>): number {
  return roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function validateSplitPayments(
  payments: Array<{ amount: number; paymentMethod: string }>,
  totalDue: number
): { valid: boolean; error?: string; totalPaid: number; change: number } {
  if (payments.length === 0) {
    return { valid: false, error: "At least one payment is required", totalPaid: 0, change: 0 };
  }

  for (const p of payments) {
    if (p.amount <= 0) {
      return { valid: false, error: "Payment amounts must be positive", totalPaid: 0, change: 0 };
    }
  }

  const totalPaid = sumPayments(payments);
  const nonCash = payments
    .filter((p) => p.paymentMethod !== "cash")
    .reduce((s, p) => s + p.amount, 0);

  if (nonCash > totalDue) {
    return {
      valid: false,
      error: "Non-cash payments cannot exceed the total due",
      totalPaid,
      change: 0,
    };
  }

  return {
    valid: true,
    totalPaid,
    change: calcChange(totalPaid, totalDue),
  };
}
