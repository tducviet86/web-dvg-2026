"use client";
import { useId, useRef, useState } from "react";
import { ArrowUpRight, Check, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { postForm } from "@/lib/api/client";
import { CV_TYPES, MAX_CV_MB, fileSize } from "@/lib/jobs";
import { useT } from "@/i18n/client";
import { track } from "@/lib/analytics";
import { Button } from "./ui/button";

type Field = "name" | "phone" | "email" | "cv" | "consent";
const PHONE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const now = () => Date.now();

/**
 * Application form with a CV upload. `jobSlug` empty = general application.
 * The CV goes to the API only (never to the public media library).
 */
export function JobApplyForm({
  jobSlug = "",
  jobTitle,
}: {
  jobSlug?: string;
  jobTitle?: string;
}) {
  const t = useT();
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [renderedAt] = useState(now);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  function pick(next: File | null | undefined) {
    if (!next) return;
    const ok = /\.(pdf|docx?)$/i.test(next.name);
    const error = !ok
      ? "CV cần là tệp PDF, DOC hoặc DOCX."
      : next.size > MAX_CV_MB * 1024 * 1024
        ? `CV tối đa ${MAX_CV_MB} MB.`
        : "";
    setErrors((e) => ({ ...e, cv: error || undefined }));
    setFile(error ? null : next);
  }

  function validate(data: FormData) {
    const found: Partial<Record<Field, string>> = {};
    const text = (k: string) => String(data.get(k) ?? "").trim();
    if (text("name").length < 2) found.name = "Vui lòng nhập họ tên.";
    if (!PHONE.test(text("phone").replace(/\s/g, "")))
      found.phone = "Nhập số di động Việt Nam hợp lệ.";
    if (!EMAIL.test(text("email"))) found.email = "Email chưa đúng định dạng.";
    if (!file) found.cv = "Vui lòng đính kèm CV.";
    if (!data.get("consent"))
      found.consent = "Bạn cần đồng ý để chúng tôi lưu hồ sơ.";
    return found;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error(t("Vui lòng kiểm tra các trường được đánh dấu."));
      return;
    }
    data.set("phone", String(data.get("phone")).replace(/\s/g, ""));
    data.set("consent", "true");
    data.set("elapsedMs", String(now() - renderedAt));
    if (jobSlug) data.set("jobSlug", jobSlug);
    data.set("cv", file!);
    setSending(true);
    const result = await postForm("/jobs/apply", data);
    setSending(false);
    if (!result.ok) {
      toast.error(
        t(
          result.status === 413 ? `CV tối đa ${MAX_CV_MB} MB.` : result.message,
        ),
      );
      return;
    }
    track("submit_application", { job: jobSlug || "general" });
    toast.success(t("Đã nhận hồ sơ của bạn. Cảm ơn bạn đã ứng tuyển!"));
    setDone(true);
    setFile(null);
    form.current?.reset();
  }

  const err = (field: Field) =>
    errors[field] && (
      <span id={`${id}-${field}-error`} className="field-error">
        {t(errors[field]!)}
      </span>
    );
  const described = (field: Field) =>
    errors[field] ? `${id}-${field}-error` : undefined;

  return (
    <form
      ref={form}
      className="contact-form job-apply-form"
      onSubmit={submit}
      noValidate
    >
      <span className="eyebrow">{t("ỨNG TUYỂN")}</span>
      <h3>{jobTitle ? jobTitle : t("Gửi hồ sơ ứng tuyển chung")}</h3>
      <p className="muted">
        {t(
          "Hồ sơ được gửi trực tiếp tới bộ phận nhân sự Đất Vàng Group và chỉ dùng cho việc tuyển dụng.",
        )}
      </p>
      {done && (
        <div className="confirmation" role="status">
          <Check size={18} />{" "}
          {t(
            "Hồ sơ đã được ghi nhận. Bộ phận nhân sự sẽ liên hệ nếu hồ sơ phù hợp.",
          )}
        </div>
      )}
      {/* Honeypot: hidden from people and assistive tech, filled by bots. */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />
      <div className="form-grid">
        <label>
          {t("Họ và tên")} <span aria-hidden="true">*</span>
          <input
            name="name"
            autoComplete="name"
            maxLength={80}
            placeholder="Nguyễn Minh Anh"
            aria-invalid={!!errors.name}
            aria-describedby={described("name")}
          />
          {err("name")}
        </label>
        <label>
          {t("Số điện thoại")} <span aria-hidden="true">*</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={16}
            placeholder={t("Số di động của bạn")}
            aria-invalid={!!errors.phone}
            aria-describedby={described("phone")}
          />
          {err("phone")}
        </label>
        <label className="full">
          Email <span aria-hidden="true">*</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={120}
            placeholder="ban@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={described("email")}
          />
          {err("email")}
        </label>
        <div className="full cv-field">
          <span className="cv-label">
            CV <span aria-hidden="true">*</span>
            <small>
              {t("PDF, DOC hoặc DOCX, tối đa")} {MAX_CV_MB} MB
            </small>
          </span>
          {file ? (
            <div className="cv-file">
              <FileText size={20} aria-hidden="true" />
              <span>
                <strong>{file.name}</strong>
                <small>{fileSize(file.size)}</small>
              </span>
              <button
                type="button"
                aria-label={t("Bỏ tệp CV")}
                onClick={() => setFile(null)}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label
              className="cv-drop"
              aria-invalid={!!errors.cv}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files[0]);
              }}
            >
              <Upload size={20} aria-hidden="true" />
              <span>{t("Chọn tệp hoặc kéo thả CV vào đây")}</span>
              <input
                type="file"
                accept={CV_TYPES}
                className="sr-only"
                aria-describedby={described("cv")}
                onChange={(e) => {
                  pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {err("cv")}
        </div>
        <label className="full">
          {t("Lời nhắn (không bắt buộc)")}
          <textarea
            name="message"
            rows={3}
            maxLength={2000}
            placeholder={t(
              jobSlug
                ? "Kinh nghiệm nổi bật, thời gian có thể bắt đầu…"
                : "Vị trí bạn quan tâm, kinh nghiệm, thời gian có thể bắt đầu…",
            )}
          />
        </label>
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          name="consent"
          aria-invalid={!!errors.consent}
          aria-describedby={described("consent")}
        />{" "}
        {t(
          "Tôi đồng ý để Đất Vàng Group lưu hồ sơ và liên hệ về cơ hội tuyển dụng.",
        )}
      </label>
      {err("consent")}
      <Button disabled={sending} type="submit">
        {t(sending ? "Đang gửi hồ sơ…" : "Gửi hồ sơ")}
        <ArrowUpRight size={18} />
      </Button>
    </form>
  );
}
