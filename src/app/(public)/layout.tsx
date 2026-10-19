import "@/components/company-pages.css";
import "@/components/refined-public.css";
import "@/components/signature-home.css";
import { PageNavigation, PageSurface } from "@/components/page-navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageNavigation>
      <SiteHeader />
      <PageSurface>{children}</PageSurface>
      <SiteFooter />
    </PageNavigation>
  );
}
