"use client";
import Script from "next/script";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "@/components/page-navigation";
import { useT } from "@/i18n/client";
import { track, type TrackingIds } from "@/lib/analytics";

const CONSENT_KEY = "dvg:consent";
type Choice = "granted" | "denied";

function readChoice(): Choice | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}
/** Only the real site is measured: not local copies, tests or previews. */
const onLiveSite = () => /(^|\.)datvanggroup\.vn$/.test(location.hostname);
const noSubscribe = () => () => {};
/** First sign of a person on the page (not a speed test robot). */
const WAKE_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
/** Visitors who only read still get counted after this long. */
const IDLE_LOAD_MS = 5000;
const subscribe = (onChange: () => void) => {
  addEventListener("dvg-consent", onChange);
  return () => removeEventListener("dvg-consent", onChange);
};

/**
 * GA4 / Google Ads with Consent Mode v2 (nothing personal is stored until
 * the visitor agrees), Meta Pixel only after consent, the lead events for
 * phone, Zalo and WhatsApp links, and the consent notice.
 */
export function Analytics({ ids }: { ids: TrackingIds }) {
  const t = useT();
  const choice = useSyncExternalStore(subscribe, readChoice, () => "denied");
  const live = useSyncExternalStore(noSubscribe, onLiveSite, () => false);
  const google = live && (ids.ga4 || ids.googleAds);
  const pixel = live && ids.metaPixel;
  // gtag.js (~190 KB) is the heaviest script on the page: it loads at the
  // visitor's first scroll, tap or key, or 5 s after the page has loaded.
  // Events sent before then wait in dataLayer and are kept.
  const [wake, setWake] = useState(false);
  useEffect(() => {
    if (!google || wake) return;
    let timer = 0;
    const go = () => setWake(true);
    const startTimer = () => (timer = window.setTimeout(go, IDLE_LOAD_MS));
    for (const type of WAKE_EVENTS)
      addEventListener(type, go, { once: true, passive: true });
    if (document.readyState === "complete") startTimer();
    else addEventListener("load", startTimer, { once: true });
    return () => {
      window.clearTimeout(timer);
      removeEventListener("load", startTimer);
      for (const type of WAKE_EVENTS) removeEventListener(type, go);
    };
  }, [google, wake]);

  // Calls, Zalo and WhatsApp anywhere on the site count as leads.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href") ?? "";
      if (href.startsWith("tel:")) track("click_call", { link_url: href });
      else if (/zalo\.me/.test(href)) track("click_zalo", { link_url: href });
      else if (/wa\.me|whatsapp/.test(href))
        track("click_whatsapp", { link_url: href });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);
  useEffect(() => {
    if (ids.googleAdsLead) window.__dvgLeadConversion = ids.googleAdsLead;
  }, [ids.googleAdsLead]);
  // While the notice shows, its height is published (--consent-h) so the
  // floating call buttons on phones sit above it instead of covering it.
  const bar = useRef<HTMLDivElement>(null);
  const showNotice = !choice && !!(google || pixel);
  useEffect(() => {
    const el = bar.current;
    const root = document.documentElement;
    if (!showNotice || !el) return;
    const sizer = new ResizeObserver(() =>
      root.style.setProperty("--consent-h", `${el.offsetHeight}px`),
    );
    sizer.observe(el);
    return () => {
      sizer.disconnect();
      root.style.removeProperty("--consent-h");
    };
  }, [showNotice]);

  function decide(next: Choice) {
    try {
      localStorage.setItem(CONSENT_KEY, next);
    } catch {
      /* storage blocked: the notice comes back next visit */
    }
    const state = next === "granted" ? "granted" : "denied";
    window.gtag?.("consent", "update", {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
    });
    dispatchEvent(new Event("dvg-consent"));
  }

  return (
    <>
      {google && (
        <>
          <Script id="gtag-consent" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
var c=null;try{c=localStorage.getItem(${JSON.stringify(CONSENT_KEY)})}catch(e){}
var s=c==="granted"?"granted":"denied";
gtag("consent","default",{ad_storage:s,ad_user_data:s,ad_personalization:s,analytics_storage:s,wait_for_update:500});
gtag("js",new Date());
${ids.ga4 ? `gtag("config",${JSON.stringify(ids.ga4)});` : ""}
${ids.googleAds ? `gtag("config",${JSON.stringify(ids.googleAds)});` : ""}`}
          </Script>
          {wake && (
            <Script
              id="gtag-lib"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${google}`}
            />
          )}
        </>
      )}
      {pixel && choice === "granted" && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',${JSON.stringify(ids.metaPixel)});fbq('track','PageView');`}
        </Script>
      )}
      {/* The server renders "denied" (no notice); the browser its own choice. */}
      {showNotice && (
        <div
          ref={bar}
          className="consent-bar"
          role="region"
          aria-label={t("Thông báo cookie")}
        >
          <p>
            {t(
              "Chúng tôi dùng cookie để đo lường lượt truy cập và cải thiện quảng cáo. Bạn đồng ý chứ?",
            )}{" "}
            <Link href="/chinh-sach-bao-mat">{t("Chính sách bảo mật")}</Link>
          </p>
          <div>
            <button type="button" onClick={() => decide("denied")}>
              {t("Từ chối")}
            </button>
            <button
              type="button"
              className="consent-accept"
              onClick={() => decide("granted")}
            >
              {t("Đồng ý")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
