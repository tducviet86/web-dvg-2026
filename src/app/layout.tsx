/** @jsxImportSource @/i18n/jsx */
import type { Metadata } from "next";
import { Tinos } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/components/interactive";
import { HTML_LANG, isLocale } from "@/i18n/config";
import { setRequestLocale } from "@/i18n/server";
import { siteUrl } from "@/lib/utils";
import "./globals.css";
/**
 * The site uses Times New Roman. Tinos (same letter widths, full Vietnamese)
 * is loaded for devices that do not have it, such as Android phones.
 */
const times = Tinos({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-tinos",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Đất Vàng Group | Đồng hành cùng giá trị bền vững",
    template: "%s | Đất Vàng Group",
  },
  description:
    "Giới thiệu Đất Vàng Group, lĩnh vực hoạt động, định hướng phát triển và cơ hội hợp tác. Website trải nghiệm doanh nghiệp.",
  openGraph: {
    locale: "vi_VN",
    type: "website",
    siteName: "Đất Vàng Group",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image" },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set by src/proxy.ts for public pages; Admin is Vietnamese.
  const header = (await headers()).get("x-dvg-locale");
  const locale = isLocale(header) ? header : "vi";
  await setRequestLocale(locale);
  return (
    <html lang={HTML_LANG[locale]}>
      <body className={times.variable}>
        <a className="skip-link" href="#main">
          Đến nội dung chính
        </a>
        {children}
        <Providers />
      </body>
    </html>
  );
}
