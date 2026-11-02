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
import { WhatsAppIcon } from "./whatsapp-icon";

const BUBBLE_KEY = "dvg:support-bubble-closed";

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
