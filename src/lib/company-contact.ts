// Set the company's verified hotline here or through the deployment environment.
export const companyHotline =
  process.env.NEXT_PUBLIC_COMPANY_PHONE || "0911 29 69 79";
export function telephoneHref(phone = companyHotline) {
  const normalized = phone.replace(/[\s().-]/g, "");
  return /^\+?\d{9,15}$/.test(normalized) ? `tel:${normalized}` : null;
}
