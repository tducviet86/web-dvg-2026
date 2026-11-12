import type { PaymentStep } from "@/lib/api/types";

/** Money due at each step; the last one takes the rounding, so they add up. */
export function paymentAmounts(price: number, steps: PaymentStep[]) {
  let left = price;
  return steps.map((step, i) => {
    const amount =
      i === steps.length - 1
        ? left
        : Math.round((price * step.percent) / 100 / 1000) * 1000;
    left -= amount;
    return amount;
  });
}
