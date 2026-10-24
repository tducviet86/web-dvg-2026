// Company contact channels. Defaults are the verified numbers/pages; each can
// be overridden through the deployment environment.
export const companyHotline =
  process.env.NEXT_PUBLIC_COMPANY_PHONE || "0911 29 69 79";
export const companyZalo = process.env.NEXT_PUBLIC_ZALO_PHONE || "0911296979";
export const companyWhatsApp =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "0911296979";
export const companyFacebook =
  process.env.NEXT_PUBLIC_FACEBOOK_URL ||
  "https://www.facebook.com/datvangmientrung0904643643";

const digits = (phone: string) => phone.replace(/[\s().-]/g, "");

export function telephoneHref(phone = companyHotline) {
  const normalized = digits(phone);
  return /^\+?\d{9,15}$/.test(normalized) ? `tel:${normalized}` : null;
}
/** Zalo chat with a Vietnamese number: https://zalo.me/0911296979. */
export function zaloHref(phone = companyZalo) {
  const normalized = digits(phone).replace(/^\+?84/, "0");
  return /^0\d{9}$/.test(normalized) ? `https://zalo.me/${normalized}` : null;
}
/** WhatsApp chat (international format without "+"): https://wa.me/84911296979. */
export function whatsappHref(phone = companyWhatsApp) {
  const normalized = digits(phone).replace(/^\+/, "").replace(/^0/, "84");
  return /^\d{10,15}$/.test(normalized) ? `https://wa.me/${normalized}` : null;
}
