"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Phone, X } from "lucide-react";
import { useT } from "@/i18n/client";
import {
  companyHotline,
  telephoneHref,
  whatsappHref,
  zaloHref,
} from "@/lib/company-contact";

const BUBBLE_KEY = "dvg:support-bubble-closed";

/** WhatsApp glyph (brand icons are not in lucide). */
function WhatsAppIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.66 15l-1.3 4.74 4.86-1.27A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.88.75.77-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.22-.09-.39-.13-.55.12-.17.24-.64.8-.78.96-.14.17-.29.19-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.32.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.7 2.7 0 0 0-.85 2.02 4.7 4.7 0 0 0 .99 2.5 10.8 10.8 0 0 0 4.14 3.66c1.54.66 2.14.72 2.91.6.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.15-1.17-.06-.11-.22-.17-.47-.3Z"
      />
    </svg>
  );
}

/**
 * Floating contact buttons on every public page: the AI assistant (coming
 * soon), hotline, Zalo and WhatsApp. A greeting bubble shows once per visit.
 */
export function ContactDock() {
  const t = useT();
  const [bubble, setBubble] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef(0);
  const call = telephoneHref();
  const zalo = zaloHref();
  const whatsapp = whatsappHref();

  useEffect(() => {
    let closed = false;
    try {
      closed = sessionStorage.getItem(BUBBLE_KEY) === "1";
    } catch {
      /* storage blocked: still greet */
    }
    if (closed) return;
    const timer = window.setTimeout(() => setBubble(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!botOpen && !contactOpen) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setBotOpen(false);
        setContactOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBotOpen(false);
        setContactOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [botOpen, contactOpen]);

  const hideBubble = () => {
    setBubble(false);
    try {
      sessionStorage.setItem(BUBBLE_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  const openBot = () => {
    setBotOpen((v) => !v);
    setContactOpen(false);
    hideBubble();
  };
  // Desktop: hovering the contact button fans out the channels; a short delay
  // on leave lets the pointer travel from the button to an option.
  const hover = (open: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(leaveTimer.current);
    if (open) {
      setContactOpen(true);
      setBotOpen(false);
    } else
      leaveTimer.current = window.setTimeout(() => setContactOpen(false), 250);
  };

  return (
    <div ref={root} className="contact-dock">
      {botOpen && (
        <div
          className="dock-panel"
          role="dialog"
          aria-label={t("Trợ lý AI Đất Vàng")}
        >
          <div className="dock-panel-head">
            <span className="dock-bot-avatar">
              <Bot size={22} aria-hidden="true" />
            </span>
            <div>
              <strong>{t("Trợ lý AI Đất Vàng")}</strong>
              <span className="dock-soon">{t("Sắp ra mắt")}</span>
            </div>
          </div>
          <p>
            {t(
              "Trợ lý AI sẽ sớm giúp bạn tìm căn hộ, so sánh giá và đặt lịch xem 24/7. Trong lúc chờ, hãy liên hệ trực tiếp với tư vấn viên:",
            )}
          </p>
          <div className="dock-panel-links">
            {call && <a href={call}>{t("Gọi hotline")}</a>}
            {zalo && (
              <a href={zalo} target="_blank" rel="noopener noreferrer">
                Zalo
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
      <div className="dock-row">
        {bubble && !botOpen && (
          <div className="dock-bubble">
            <button type="button" onClick={openBot}>
              {t("Bạn cần hỗ trợ gì?")}
            </button>
            <button
              type="button"
              className="dock-bubble-close"
              aria-label={t("Ẩn lời chào")}
              onClick={hideBubble}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <button
          type="button"
          className="dock-btn dock-bot"
          aria-expanded={botOpen}
          aria-label={t("Trợ lý AI (sắp ra mắt)")}
          data-tip={t("Trợ lý AI")}
          onClick={openBot}
        >
          {botOpen ? <X size={24} /> : <Bot size={28} />}
        </button>
      </div>
      <div
        className="dock-contact"
        data-open={contactOpen}
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
      >
        <div
          id="dock-channels"
          className="dock-options"
          inert={!contactOpen}
          role="group"
          aria-label={t("Kênh liên hệ")}
        >
          {whatsapp && (
            <a
              className="dock-btn dock-whatsapp"
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("Chat WhatsApp với Đất Vàng Group")}
              data-tip={`WhatsApp ${companyHotline}`}
            >
              <WhatsAppIcon />
            </a>
          )}
          {zalo && (
            <a
              className="dock-btn dock-zalo"
              href={zalo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("Chat Zalo với Đất Vàng Group")}
              data-tip={`Zalo ${companyHotline}`}
            >
              <span className="dock-zalo-mark" aria-hidden="true">
                Zalo
              </span>
            </a>
          )}
          {call && (
            <a
              className="dock-btn dock-call"
              href={call}
              aria-label={`${t("Gọi hotline")} ${companyHotline}`}
              data-tip={`${t("Hotline")} ${companyHotline}`}
            >
              <Phone size={24} aria-hidden="true" />
            </a>
          )}
        </div>
        <button
          type="button"
          className="dock-btn dock-contact-toggle"
          aria-expanded={contactOpen}
          aria-controls="dock-channels"
          aria-label={t(
            contactOpen
              ? "Đóng kênh liên hệ"
              : "Liên hệ: Hotline, Zalo, WhatsApp",
          )}
          data-tip={contactOpen ? undefined : t("Hotline · Zalo · WhatsApp")}
          onClick={() => {
            setContactOpen((v) => !v);
            setBotOpen(false);
          }}
        >
          {contactOpen ? (
            <X size={24} />
          ) : (
            <Phone size={24} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
