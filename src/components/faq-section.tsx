/** @jsxImportSource @/i18n/jsx */
import { t } from "@/i18n/server";
import type { Faq } from "@/lib/faq";
import { jsonLd } from "@/lib/structured-data";
import { CallContact } from "./call-contact";

/**
 * "Giải đáp cùng Đất Vàng": questions that open in place, plus the same
 * questions as FAQPage structured data for search engines and AI assistants
 * (in the page's language). One per page.
 */
export function FaqSection({ faqs, id }: { faqs: Faq[]; id?: string }) {
  if (!faqs.length) return null;
  return (
    <section className="rental-faq" id={id} aria-labelledby="hoi-dap-title">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(([q, a]) => ({
              "@type": "Question",
              name: t(q),
              acceptedAnswer: { "@type": "Answer", text: t(a) },
            })),
          }),
        }}
      />
      <div>
        <span className="signature-kicker">GIẢI ĐÁP CÙNG ĐẤT VÀNG</span>
        <h2 id="hoi-dap-title">
          Những điều bạn
          <br />
          <em>muốn biết thêm.</em>
        </h2>
        <CallContact label="Trao đổi trực tiếp" />
      </div>
      <div>
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
