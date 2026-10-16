import type { Metadata } from "next";
import { Playfair_Display, Be_Vietnam_Pro } from "next/font/google";
import { Providers } from "@/components/interactive";
import { siteUrl } from "@/lib/utils";
import "./globals.css";
const heading = Playfair_Display({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-heading",
  display: "swap",
});
const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${heading.variable} ${body.variable}`}>
        <a className="skip-link" href="#main">
          Đến nội dung chính
        </a>
        {children}
        <Providers />
      </body>
    </html>
  );
}
