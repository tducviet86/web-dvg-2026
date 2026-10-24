/** @jsxImportSource @/i18n/jsx */
import { Phone, ArrowUpRight } from "lucide-react";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
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
