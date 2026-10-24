/** @jsxImportSource @/i18n/jsx */
import "@/components/company-pages.css";
import "@/components/refined-public.css";
import "@/components/signature-home.css";
import "@/components/portfolio-pages.css";
import "@/components/rentals.css";
import { notFound } from "next/navigation";
import { PageNavigation, PageSurface } from "@/components/page-navigation";
import { SiteHeader } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/footer";
import { ContactDock } from "@/components/contact-dock";
import { I18nProvider } from "@/i18n/client";
import { isLocale, textKey } from "@/i18n/config";
import { getDictionary, reportMissing } from "@/i18n/dictionary";
import { setRequestLocale } from "@/i18n/server";
import clientStrings from "@/i18n/client-strings.json";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await setRequestLocale(locale);
  // Client Components get the translations of their own UI strings.
  const messages: Record<string, string> = {};
  if (locale !== "vi") {
    const dict = await getDictionary(locale);
    for (const text of clientStrings) {
      const key = textKey(text);
      const found = dict.get(key);
      if (found) messages[key] = found;
      else reportMissing(locale, key);
    }
  }
  return (
    <I18nProvider locale={locale} messages={messages}>
      <PageNavigation>
        <SiteHeader />
        <PageSurface>{children}</PageSurface>
        <SiteFooter />
        <ContactDock />
      </PageNavigation>
    </I18nProvider>
  );
}
