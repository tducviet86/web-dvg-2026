"use client";
import Link from "@/components/page-navigation";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { Progress } from "../interactive";
import { LanguageSwitcher } from "../translator";
import { BackTrail } from "./back-button";
import { useT } from "@/i18n/client";
import { splitLocale } from "@/i18n/config";
type NavLink = { label: string; href: string; note: string };
type NavItem = {
  label: string;
  href: string;
  /** Heading of the dropdown panel. */
  eyebrow?: string;
  sub?: NavLink[];
};
const nav: NavItem[] = [
  { label: "Trang chủ", href: "/" },
  {
    label: "Giới thiệu",
    href: "/gioi-thieu",
    eyebrow: "VỀ ĐẤT VÀNG GROUP",
    sub: [
      {
        label: "Tổng quan công ty",
        href: "/gioi-thieu",
        note: "Hành trình, giá trị và cách chúng tôi làm việc",
      },
      {
        label: "Tầm nhìn & sứ mệnh",
        href: "/gioi-thieu/tam-nhin-su-menh",
        note: "Định hướng phát triển bền vững",
      },
      {
        label: "Đội ngũ",
        href: "/gioi-thieu/doi-ngu",
        note: "Những người trực tiếp đồng hành cùng khách hàng",
      },
      {
        label: "Đối tác",
        href: "/gioi-thieu/doi-tac",
        note: "Chủ đầu tư và đơn vị hợp tác",
      },
    ],
  },
  {
    label: "Dự án",
    href: "/du-an",
    eyebrow: "DANH MỤC DỰ ÁN",
    sub: [
      {
        label: "Tất cả dự án",
        href: "/du-an",
        note: "Toàn bộ dự án Đất Vàng tham gia",
      },
      {
        label: "Dự án đang triển khai",
        href: "/du-an/trien-khai",
        note: "Đang phát triển và phân phối",
      },
      {
        label: "Dự án đang vận hành",
        href: "/du-an/van-hanh",
        note: "Đất Vàng quản lý và khai thác cho thuê",
      },
    ],
  },
  {
    label: "Lĩnh vực hoạt động",
    href: "/dich-vu",
    eyebrow: "LĨNH VỰC HOẠT ĐỘNG",
    sub: [
      {
        label: "Quản lý vận hành bất động sản",
        href: "/dich-vu/quan-ly-bat-dong-san",
        note: "Tiếp nhận, vận hành và báo cáo định kỳ",
      },
      {
        label: "Khai thác căn hộ cho thuê",
        href: "/dich-vu/khai-thac-cho-thue",
        note: "Tìm khách thuê phù hợp, chăm sóc người thuê",
      },
      {
        label: "Hợp tác chủ sở hữu",
        href: "/hop-tac-chu-so-huu",
        note: "Ký gửi căn hộ để Đất Vàng khai thác",
      },
      {
        label: "Tư vấn đầu tư",
        href: "/dich-vu/tu-van-dau-tu",
        note: "Mục tiêu, ngân sách và thị trường",
      },
      {
        label: "Tất cả lĩnh vực",
        href: "/dich-vu",
        note: "Xem đầy đủ các giải pháp",
      },
    ],
  },
  { label: "Tin tức", href: "/blog" },
  { label: "Liên hệ", href: "/lien-he" },
];
export function Logo() {
  const t = useT();
  return (
    <Link
      className="logo"
      href="/"
      aria-label={t("Đất Vàng Group — Trang chủ")}
    >
      <Image
        className="company-logo"
        src="/images/dat-vang-group-logo-transparent.png"
        alt="Đất Vàng Group"
        width={2048}
        height={1933}
        sizes="100px"
        loading="eager"
      />
    </Link>
  );
}
function DesktopNavigation({ path }: { path: string }) {
  const t = useT();
  const [expanded, setExpanded] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setExpanded(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  return (
    <nav
      ref={navRef}
      className="desktop-nav"
      aria-label={t("Điều hướng chính")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setExpanded(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.preventDefault();
          document.getElementById(`nav-${expanded.slice(1)}-trigger`)?.focus();
          setExpanded(null);
        }
      }}
    >
      {nav.map((item) => {
        const active =
          path === item.href ||
          (item.href !== "/" && path.startsWith(item.href + "/"));
        const isOpen = expanded === item.href;
        const id = `nav-${item.href.slice(1)}`;
        return (
          <div
            key={item.href}
            className="nav-item"
            data-open={isOpen}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse")
                setExpanded(item.sub ? item.href : null);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse")
                setExpanded((current) =>
                  current === item.href ? null : current,
                );
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setExpanded((current) =>
                  current === item.href ? null : current,
                );
            }}
          >
            {item.sub ? (
              <>
                <Link
                  href={item.href}
                  id={`${id}-trigger`}
                  className={`nav-disclosure ${active ? "active" : ""}`}
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() => setExpanded(null)}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible"))
                      setExpanded(item.href);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setExpanded(item.href);
                      requestAnimationFrame(() =>
                        document
                          .getElementById(id)
                          ?.querySelector("a")
                          ?.focus(),
                      );
                    }
                  }}
                >
                  {t(item.label)}
                  <ChevronDown size={11} />
                </Link>
                <div className="mega-menu" id={id} hidden={!isOpen}>
                  <span className="eyebrow">{t(item.eyebrow ?? "")}</span>
                  {item.sub.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setExpanded(null)}
                    >
                      <span className="mega-link-text">
                        {t(link.label)}
                        <small aria-hidden="true">{t(link.note)}</small>
                      </span>
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <Link
                className={active ? "active" : ""}
                href={item.href}
                onClick={() => setExpanded(null)}
              >
                {t(item.label)}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}
export function SiteHeader() {
  const t = useT();
  // Paths without the /en, /ko, /zh prefix (nav entries are Vietnamese URLs).
  const path = splitLocale(usePathname()).path;
  const [open, setOpen] = useState(false);
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 48,
    () => false,
  );
  return (
    <>
      <Progress />
      <header
        className={`site-header corporate-site-header ${path === "/" && !scrolled ? "header-overlay" : "header-solid"}`}
      >
        <div className="header-inner">
          <div className="header-brand">
            <BackTrail />
            <Logo />
          </div>
          <DesktopNavigation key={path} path={path} />
          <div className="header-actions">
            <LanguageSwitcher />
            <Link className="header-cta" href="/cho-thue">
              {t("Tìm căn hộ thuê")}
              <ArrowUpRight size={15} />
            </Link>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger
                className="mobile-toggle"
                aria-label={t("Mở menu")}
              >
                <Menu />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="mobile-drawer">
                  <Dialog.Title>ĐẤT VÀNG GROUP</Dialog.Title>
                  <Dialog.Description>
                    {t(
                      "Tìm hiểu doanh nghiệp, lĩnh vực hoạt động và cơ hội hợp tác.",
                    )}
                  </Dialog.Description>
                  <Dialog.Close
                    className="dialog-close"
                    aria-label={t("Đóng menu")}
                  >
                    <X />
                  </Dialog.Close>
                  <nav aria-label={t("Điều hướng di động")}>
                    {nav.map((item) =>
                      item.sub ? (
                        <details key={item.href}>
                          <summary>
                            {t(item.label)}
                            <ChevronDown size={16} />
                          </summary>
                          <Link href={item.href} onClick={() => setOpen(false)}>
                            {t("Xem tất cả")}
                          </Link>
                          {item.sub
                            .filter((link) => link.href !== item.href)
                            .map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setOpen(false)}
                              >
                                {t(link.label)}
                              </Link>
                            ))}
                        </details>
                      ) : (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                        >
                          {t(item.label)}
                        </Link>
                      ),
                    )}
                  </nav>
                  <LanguageSwitcher variant="row" />
                  <Link
                    className="button button-primary"
                    href="/lien-he"
                    onClick={() => setOpen(false)}
                  >
                    {t("Kết nối hợp tác")}
                    <ArrowUpRight size={18} />
                  </Link>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
    </>
  );
}
