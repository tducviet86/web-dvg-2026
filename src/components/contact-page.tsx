/** @jsxImportSource @/i18n/jsx */
import Link from "@/components/page-navigation";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Clock,
  Facebook,
  Handshake,
  HandCoins,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
} from "lucide-react";
import type { EditorialContent } from "@/lib/pages";
import type { PortfolioProject } from "@/types";
import {
  companyFacebook,
  companyHotline,
  telephoneHref,
  zaloHref,
} from "@/lib/company-contact";
import { href } from "@/i18n/server";
import { BackButton } from "./layout/back-button";
import { RichText } from "./rich-text";
import { PhotoHero } from "./search-hero";
import { ContactForm, Reveal } from "./interactive";

const NEEDS = [
  {
    href: "/cho-thue",
    title: "Tìm thuê căn hộ",
    text: "Căn hộ có sẵn ảnh thật, giá thuê rõ ràng.",
    icon: KeyRound,
  },
  {
    href: "/cho-thue?nhu-cau=mua",
    title: "Mua căn hộ",
    text: "Căn đang bán tại các dự án Đà Nẵng.",
    icon: HandCoins,
  },
  {
    href: "/hop-tac-chu-so-huu",
    title: "Ký gửi căn hộ",
    text: "Gửi căn để chúng tôi cho thuê hoặc bán giúp.",
    icon: Building2,
  },
  {
    href: "/gioi-thieu/doi-tac",
    title: "Hợp tác",
    text: "Đơn vị kiến trúc, nội thất, vận hành, chủ đầu tư.",
    icon: Handshake,
  },
  {
    href: "/tuyen-dung",
    title: "Tuyển dụng",
    text: "Cơ hội nghề nghiệp tại Đất Vàng Group.",
    icon: Briefcase,
  },
];

/**
 * "Liên hệ": a short photo hero with call / Zalo buttons, the contact
 * channels (Admin › Cài đặt fills address, e-mail and hours) and the map
 * beside the request form, shortcuts by need and the page notes from
 * Admin › Trang nội dung as an accordion.
 */
export function ContactPage({
  page,
  settings,
  portfolio,
}: {
  page: EditorialContent;
  settings: Record<string, string>;
  portfolio: PortfolioProject[];
}) {
  const hotline = settings["company.hotline"]?.trim() || companyHotline;
  const call = telephoneHref(hotline);
  const zalo = settings["social.zalo"]?.trim() || zaloHref();
  const facebook = settings["social.facebook"]?.trim() || companyFacebook;
  const email = settings["company.email"]?.trim();
  const address = settings["company.address"]?.trim();
  const hours = settings["company.workingHours"]?.trim();
  const slides = portfolio
    .filter((p) => p.image)
    .slice(0, 3)
    .map((p) => ({ src: p.image, alt: p.name }));
  const channels = [
    {
      icon: Phone,
      label: "Hotline",
      value: hotline,
      href: call,
      action: "Gọi ngay",
    },
    zalo && {
      icon: MessageCircle,
      label: "Zalo",
      value: "Nhắn tin tư vấn",
      href: zalo,
      action: "Mở Zalo",
      external: true,
    },
    email && {
      icon: Mail,
      label: "Email",
      value: email,
      href: `mailto:${email}`,
      action: "Gửi email",
    },
    address && {
      icon: MapPin,
      label: "Văn phòng",
      value: address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      action: "Chỉ đường",
      external: true,
    },
    hours && { icon: Clock, label: "Giờ làm việc", value: hours },
  ].filter(Boolean) as {
    icon: typeof Phone;
    label: string;
    value: string;
    href?: string | null;
    action?: string;
    external?: boolean;
  }[];

  return (
    <main id="main" className="contact-page">
      <PhotoHero
        className="contact-hero"
        slides={slides}
        crumbs={
          <>
            <BackButton />
            <Link href="/">Trang chủ</Link>
            <span>/</span>
            <span aria-current="page">{page.eyebrow || "Liên hệ"}</span>
          </>
        }
        title={page.title}
        subtitle={page.intro}
      >
        <div className="about-hero-actions">
          {call && (
            <a href={call} className="hero-submit">
              <Phone size={17} aria-hidden="true" />
              Gọi {hotline}
            </a>
          )}
          {zalo && (
            <a
              href={zalo}
              className="about-hero-ghost"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={17} aria-hidden="true" />
              Chat Zalo
            </a>
          )}
          <a href="#gui-yeu-cau" className="about-hero-ghost">
            Gửi yêu cầu tư vấn
          </a>
        </div>
      </PhotoHero>

      <section className="contact-main container">
        <div className="contact-side">
          <span className="home-kicker">KÊNH LIÊN HỆ</span>
          <h2>Chúng tôi luôn sẵn sàng lắng nghe</h2>
          <ul className="contact-channels">
            {channels.map((c) => (
              <li key={c.label}>
                <span className="contact-channel-icon">
                  <c.icon size={20} strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className="contact-channel-text">
                  <small>{c.label}</small>
                  <strong>{c.value}</strong>
                </span>
                {c.href && c.action && (
                  <a
                    href={c.href}
                    className="contact-channel-action"
                    {...(c.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {c.action}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
          {facebook && (
            <a
              className="contact-social"
              href={facebook}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook size={17} aria-hidden="true" />
              Theo dõi Đất Vàng Group trên Facebook
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          )}
          {address && (
            <div className="contact-map">
              <iframe
                title={`Bản đồ văn phòng: ${address}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`}
              />
            </div>
          )}
        </div>
        <div id="gui-yeu-cau" className="contact-form-card">
          <span className="home-kicker">GỬI YÊU CẦU</span>
          <h2>Chia sẻ nhu cầu của bạn</h2>
          <p>
            Điền vài thông tin, chuyên viên phụ trách sẽ gọi lại cho bạn trong
            ngày làm việc.
          </p>
          <ContactForm source="Liên hệ" />
        </div>
      </section>

      <section
        className="contact-needs container"
        aria-labelledby="contact-needs-title"
      >
        <div className="home-head">
          <div>
            <span className="home-kicker">BẠN CẦN HỖ TRỢ ĐIỀU GÌ?</span>
            <h2 id="contact-needs-title">Đi thẳng tới đúng nơi</h2>
          </div>
        </div>
        <ul className="contact-needs-grid">
          {NEEDS.map((n) => (
            <li key={n.href}>
              <Link href={n.href}>
                <n.icon size={24} strokeWidth={1.5} aria-hidden="true" />
                <strong>{n.title}</strong>
                <span>{n.text}</span>
                <ArrowUpRight
                  className="contact-need-arrow"
                  size={17}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {page.sections.length > 0 && (
        <section
          className="contact-notes container"
          aria-labelledby="contact-notes-title"
        >
          <span className="home-kicker">THÔNG TIN THÊM</span>
          <h2 id="contact-notes-title">Trước khi bạn liên hệ</h2>
          <div className="contact-accordion">
            {page.sections.map(([heading, text], i) => (
              <Reveal key={heading} delay={i * 60}>
                <details open={i === 0}>
                  <summary>
                    {heading}
                    <Plus size={18} aria-hidden="true" />
                  </summary>
                  <RichText text={text} />
                </details>
              </Reveal>
            ))}
          </div>
          {call && (
            <p className="contact-notes-call">
              Cần trả lời ngay? Gọi <a href={call}>{hotline}</a> hoặc{" "}
              <a href={href("/cho-thue")}>xem căn hộ đang có</a>.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
