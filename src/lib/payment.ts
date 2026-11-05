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

/** Reducing-balance loan: the first month is the highest. */
export function loanFigures(loan: number, ratePerYear: number, years: number) {
  const months = years * 12;
  const monthlyRate = ratePerYear / 100 / 12;
  return {
    principalPerMonth: loan / months,
    firstMonth: loan / months + loan * monthlyRate,
    totalInterest: (loan * monthlyRate * (months + 1)) / 2,
  };
}
