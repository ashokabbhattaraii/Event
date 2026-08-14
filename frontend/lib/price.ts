export interface EventPrice {
  amount: number;
  currency: string;
}

export function isFreeEvent(price?: EventPrice | null): boolean {
  return !price || !price.amount || price.amount <= 0;
}

export function formatPrice(price?: EventPrice | null): string {
  if (isFreeEvent(price)) return "Free";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: price!.currency || "USD",
    }).format(price!.amount);
  } catch {
    return `${price!.currency || "USD"} ${price!.amount}`;
  }
}
