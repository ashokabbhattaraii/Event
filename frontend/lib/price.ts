export interface EventPrice {
  amount: number;
  currency: string;
}

export function isFreeEvent(price?: EventPrice | null): boolean {
  return !price || !price.amount || price.amount <= 0;
}

export function formatPrice(price?: EventPrice | null): string {
  if (isFreeEvent(price)) return "Free";
  const amount = price!.amount;
  const currency = (price!.currency || "NPR").toUpperCase();

  // Nepali Rupee: "Rs. 1,500" reads far more naturally here than the
  // "NPR 1,500.00" Intl.NumberFormat produces (browsers don't render a
  // narrow ₨ symbol consistently), so format it by hand.
  if (currency === "NPR") {
    return `Rs. ${amount.toLocaleString("en-US")}`;
  }

  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
