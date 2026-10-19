"use client";
import Link from "@/components/page-navigation";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, ArrowUpRight, ChevronDown } from "lucide-react";
import { Progress } from "../interactive";
const nav = [
  { label: "Trang chủ", href: "/" },
  {
    label: "Giới thiệu",
    href: "/gioi-thieu",
    sub: [
      ["Tổng quan công ty", "/gioi-thieu"],
      ["Tầm nhìn & sứ mệnh", "/gioi-thieu/tam-nhin-su-menh"],
      ["Đội ngũ", "/gioi-thieu/doi-ngu"],
    ],
  },
  {
    label: "Dự án",
    href: "/du-an",
    sub: [
      ["Tất cả dự án", "/du-an"],
      ["Dự án nổi bật", "/du-an?status=noi-bat"],
      ["Đang khai thác", "/du-an?status=dang-khai-thac"],
    ],
  },
  {
    label: "Lĩnh vực hoạt động",
    href: "/dich-vu",
    sub: [
      ["Quản lý bất động sản", "/dich-vu/quan-ly-bat-dong-san"],
      ["Khai thác cho thuê", "/dich-vu/khai-thac-cho-thue"],
      ["Hợp tác chủ sở hữu", "/hop-tac-chu-so-huu"],
      ["Tư vấn đầu tư", "/dich-vu/tu-van-dau-tu"],
    ],
  },
  { label: "Tin tức", href: "/blog" },
  { label: "Đối tác", href: "/gioi-thieu/doi-tac" },
  { label: "Liên hệ", href: "/lien-he" },
];
export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="Đất Vàng Group — Trang chủ">
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
function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}
export function SiteHeader() {
  const path = usePathname();
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
          <Logo />
          <nav className="desktop-nav" aria-label="Điều hướng chính">
            {nav.map((item) => (
              <div key={item.href} className="nav-item">
                <Link
                  className={
                    path === item.href ||
                    (item.href !== "/" && path.startsWith(item.href + "/"))
                      ? "active"
                      : ""
                  }
                  href={item.href}
                >
                  {item.label}
                  {item.sub && <ChevronDown size={11} />}
                </Link>
                {item.sub && (
                  <div className="mega-menu">
                    <span className="eyebrow">KHÁM PHÁ ĐẤT VÀNG</span>
                    {item.sub.map(([label, href]) => (
                      <Link key={href} href={href}>
                        {label}
                        <ArrowUpRight size={15} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="header-actions">
            <Link className="header-cta" href="/lien-he">
              Kết nối hợp tác
              <ArrowUpRight size={15} />
            </Link>
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger className="mobile-toggle" aria-label="Mở menu">
                <Menu />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="mobile-drawer">
                  <Dialog.Title>ĐẤT VÀNG GROUP</Dialog.Title>
                  <Dialog.Description>
                    Tìm hiểu doanh nghiệp, lĩnh vực hoạt động và cơ hội hợp tác.
                  </Dialog.Description>
                  <Dialog.Close className="dialog-close" aria-label="Đóng menu">
                    <X />
                  </Dialog.Close>
                  <nav aria-label="Điều hướng di động">
                    {nav.map((item) =>
                      item.sub ? (
                        <details key={item.href}>
                          <summary>
                            {item.label}
                            <ChevronDown size={16} />
                          </summary>
                          <Link href={item.href} onClick={() => setOpen(false)}>
                            Xem tất cả
                          </Link>
                          {item.sub.map(([label, href]) => (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setOpen(false)}
                            >
                              {label}
                            </Link>
                          ))}
                        </details>
                      ) : (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ),
                    )}
                  </nav>
                  <Link
                    className="button button-primary"
                    href="/lien-he"
                    onClick={() => setOpen(false)}
                  >
                    Kết nối hợp tác
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
