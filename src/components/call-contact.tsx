/** @jsxImportSource @/i18n/jsx */
import { Phone, ArrowUpRight } from "lucide-react";
import {
  companyHotline,
  telephoneHref,
  whatsappDisplay,
  whatsappHref,
} from "@/lib/company-contact";
import { WhatsAppIcon } from "./whatsapp-icon";
import Link from "@/components/page-navigation";
export function CallContact({
  label = "Gọi tư vấn",
  phone = companyHotline,
  className = "",
}: {
  label?: string;
  phone?: string;
  className?: string;
}) {
  const href = telephoneHref(phone);
  return href ? (
    <a className={`button button-primary call-button ${className}`} href={href}>
      <Phone size={18} />
      <span>
        {label}
        <small>{phone}</small>
      </span>
      <ArrowUpRight size={18} />
    </a>
  ) : (
    <div className={`call-unconfigured ${className}`}>
      <span>Hotline đang được cập nhật</span>
      <Link href="/lien-he" className="text-link">
        Thông tin liên hệ <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}

/**
 * WhatsApp chat with a ready-made first message naming the unit. Foreign
 * visitors use it instead of an international call or Zalo.
 */
export function WhatsAppContact({
  label = "Chat WhatsApp",
  message,
  className = "",
}: {
  label?: string;
  message?: string;
  className?: string;
}) {
  const chat = whatsappHref();
  if (!chat) return null;
  return (
    <a
      className={`button call-button whatsapp-button ${className}`}
      href={message ? `${chat}?text=${encodeURIComponent(message)}` : chat}
      target="_blank"
      rel="noopener noreferrer"
    >
      <WhatsAppIcon size={20} />
      <span>
        {label}
        <small>{whatsappDisplay()}</small>
      </span>
      <ArrowUpRight size={18} />
    </a>
  );
}
