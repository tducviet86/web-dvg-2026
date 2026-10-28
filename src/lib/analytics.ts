/**
 * Visitor analytics (GA4, Google Ads, Meta Pixel), loaded by
 * components/analytics.tsx. IDs come from Admin › Cài đặt; GA4 falls back to
 * the company property.
 */
export const DEFAULT_GA4 = "G-DNXPDKR1NX";

export type TrackingIds = {
  ga4?: string;
  googleAds?: string;
  /** Lead conversion "AW-123/AbC", sent with every lead (call, Zalo, form). */
  googleAdsLead?: string;
  metaPixel?: string;
};

/** Keeps only well-formed IDs: they end up inside a script tag. */
export function trackingIds(settings: Record<string, string>): TrackingIds {
  const pick = (value: string | undefined, pattern: RegExp) =>
    value && pattern.test(value.trim()) ? value.trim() : undefined;
  return {
    ga4: pick(settings["tracking.ga4"] || DEFAULT_GA4, /^G-[A-Z0-9]{4,20}$/),
    googleAds: pick(settings["tracking.googleAds"], /^AW-\d{5,15}$/),
    googleAdsLead: pick(
      settings["tracking.googleAdsLead"],
      /^AW-\d{5,15}\/[\w-]{4,40}$/,
    ),
    metaPixel: pick(settings["tracking.metaPixel"], /^\d{8,20}$/),
  };
}

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: Gtag;
    fbq?: Fbq;
    dataLayer?: unknown[];
    __dvgLeadConversion?: string;
  }
}

/** The visitor actions that count as a lead. */
export type LeadEvent =
  | "click_call"
  | "click_zalo"
  | "click_whatsapp"
  | "generate_lead"
  | "submit_application"
  | "sign_up";

const META_EVENT: Record<LeadEvent, string> = {
  click_call: "Contact",
  click_zalo: "Contact",
  click_whatsapp: "Contact",
  generate_lead: "Lead",
  submit_application: "SubmitApplication",
  sign_up: "CompleteRegistration",
};

/** Sends one visitor action to every configured tool (no-op without them). */
export function track(event: LeadEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const page = { page_path: window.location.pathname, ...params };
  window.gtag?.("event", event, page);
  if (window.__dvgLeadConversion && event !== "sign_up")
    window.gtag?.("event", "conversion", {
      send_to: window.__dvgLeadConversion,
    });
  window.fbq?.("track", META_EVENT[event], page);
}
