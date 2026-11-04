/**
 * Costs on top of the rent. By default the tenant pays them all (BE property
 * `includedFees` empty); a unit lists only those its rent already covers.
 */
export const RENT_FEES: [string, string][] = [
  ["water", "Nước"],
  ["electricity", "Điện"],
  ["internet", "Internet"],
  ["management", "Phí quản lý"],
  ["motorbike", "Phí gửi xe máy"],
  ["car", "Phí gửi ô tô"],
];
export const ALL_RENT_FEES = RENT_FEES.map(([key]) => key);
