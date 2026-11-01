"use client";
import { useState, useId, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ArrowLeft, ArrowRight, X, Check, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { postPublic } from "@/lib/api/client";
import { Button } from "./ui/button";
import { useT } from "@/i18n/client";
import { track } from "@/lib/analytics";
const schema = z.object({
  intent: z.string(),
  name: z
    .string()
    .min(2, "Vui lòng nhập họ tên (ít nhất 2 ký tự).")
    .max(80, "Tối đa 80 ký tự."),
  email: z.email("Email chưa đúng định dạng.").max(120),
  phone: z
    .string()
    .regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, "Nhập số di động Việt Nam hợp lệ."),
  message: z
    .string()
    .min(10, "Vui lòng mô tả nhu cầu ít nhất 10 ký tự.")
    .max(1500, "Tối đa 1.500 ký tự."),
  consent: z
    .boolean()
    .refine((v) => v, "Bạn cần đồng ý để Đất Vàng Group liên hệ lại."),
  website: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;
const now = () => Date.now();
export function ContactForm({
  source = "Liên hệ",
  compact = false,
}: {
  source?: string;
  compact?: boolean;
}) {
  const formId = useId();
  const t = useT();
  const [done, setDone] = useState(false);
  // Anti-spam signal: humans take a few seconds to fill the form.
  const [renderedAt] = useState(now);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(
      schema.extend({
        intent: source.startsWith("Ứng tuyển")
          ? z.string()
          : z.string().min(1, "Vui lòng chọn nhu cầu tư vấn."),
      }),
    ),
    defaultValues: { consent: false, intent: "" },
  });
  useEffect(() => {
    if (source !== "Liên hệ") return;
    const query = new URLSearchParams(window.location.search);
    const intent = query.get("intent");
    const options: Record<string, string> = {
      "mua-ban": "Tư vấn mua bán bất động sản",
      thue: "Tìm thuê bất động sản",
      "ky-gui": "Ký gửi bán hoặc cho thuê",
    };
    if (intent && options[intent]) setValue("intent", options[intent]);
    const project = query.get("project");
    if (project)
      setValue(
        "message",
        `Tôi muốn được tư vấn về dự án ${project.slice(0, 120)}.`,
      );
  }, [source, setValue]);
  async function submit(values: FormValues) {
    const { intent, ...data } = values;
    // Contact/partnership/career forms vs. requests about a project or unit.
    const contact = /^(Liên hệ|Hợp tác|Ứng tuyển)/.test(source);
    const result = await postPublic(contact ? "/contact" : "/inquiries", {
      ...data,
      intent: intent || undefined,
      source: source.slice(0, 80),
      elapsedMs: now() - renderedAt,
    });
    if (!result.ok) {
      toast.error(t(result.message));
      return;
    }
    track("generate_lead", { form: contact ? "contact" : "inquiry", source });
    toast.success(t("Đã gửi yêu cầu. Đất Vàng Group sẽ liên hệ lại với bạn."));
    setDone(true);
    reset();
  }
  return (
    <form
      className={`contact-form ${compact ? "compact" : ""}`}
      onSubmit={handleSubmit(submit, () =>
        toast.error(t("Vui lòng kiểm tra các trường được đánh dấu.")),
      )}
      noValidate
    >
      <span className="eyebrow">{t("KẾT NỐI CÙNG ĐẤT VÀNG")}</span>
      <h3>
        {t(
          source.startsWith("Ứng tuyển")
            ? "Chia sẻ về bạn"
            : "Bắt đầu một cuộc trò chuyện",
        )}
      </h3>
      <p className="muted">
        {t(
          "Thông tin được gửi trực tiếp đến đội ngũ Đất Vàng Group và chỉ dùng để liên hệ tư vấn.",
        )}
      </p>
      {done && (
        <div className="confirmation" role="status">
          <Check size={18} />{" "}
          {t(
            "Yêu cầu đã được ghi nhận. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.",
          )}
        </div>
      )}
      {/* Honeypot: hidden from people and assistive tech, filled by bots. */}
      <input
        {...register("website")}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />
      <div className="form-grid">
        {(["name", "phone", "email"] as const).map((field) => (
          <label key={field} className={field === "email" ? "full" : ""}>
            {t(
              { name: "Họ và tên", phone: "Số điện thoại", email: "Email" }[
                field
              ],
            )}{" "}
            <span aria-hidden="true">*</span>
            <input
              {...register(field)}
              type={
                field === "email" ? "email" : field === "phone" ? "tel" : "text"
              }
              autoComplete={
                field === "name" ? "name" : field === "phone" ? "tel" : "email"
              }
              maxLength={field === "email" ? 120 : 80}
              aria-invalid={!!errors[field]}
              aria-describedby={
                errors[field] ? `${formId}-${field}-error` : undefined
              }
              placeholder={
                field === "name"
                  ? "Nguyễn Minh Anh"
                  : field === "phone"
                    ? t("Số di động của bạn")
                    : "ban@example.com"
              }
            />
            {errors[field] && (
              <span id={`${formId}-${field}-error`} className="field-error">
                {t(errors[field]?.message ?? "")}
              </span>
            )}
          </label>
        ))}
        {!source.startsWith("Ứng tuyển") && (
          <label className="full">
            {t("Nhu cầu tư vấn")} <span aria-hidden="true">*</span>
            <select
              {...register("intent")}
              defaultValue=""
              aria-invalid={!!errors.intent}
              aria-describedby={
                errors.intent ? `${formId}-intent-error` : undefined
              }
            >
              <option value="" disabled>
                {t("Chọn nhu cầu của bạn")}
              </option>
              {/* Values stay Vietnamese: they are stored on the lead. */}
              {[
                "Tư vấn mua bán bất động sản",
                "Tìm thuê bất động sản",
                "Cho thuê bất động sản",
                "Ký gửi bán hoặc cho thuê",
                "Hợp tác và nhu cầu khác",
              ].map((option) => (
                <option key={option} value={option}>
                  {t(option)}
                </option>
              ))}
            </select>
            {errors.intent && (
              <span id={`${formId}-intent-error`} className="field-error">
                {t(errors.intent.message ?? "")}
              </span>
            )}
          </label>
        )}
        <label className="full">
          {t(
            source.startsWith("Ứng tuyển")
              ? "Kinh nghiệm và vị trí mong muốn"
              : "Thông tin chi tiết",
          )}{" "}
          <span aria-hidden="true">*</span>
          <textarea
            {...register("message")}
            rows={4}
            maxLength={1500}
            aria-invalid={!!errors.message}
            aria-describedby={
              errors.message ? `${formId}-message-error` : undefined
            }
            placeholder={t(
              source.startsWith("Ứng tuyển")
                ? "Chia sẻ kinh nghiệm và vị trí bạn muốn ứng tuyển…"
                : "Tên dự án, ngân sách, loại căn hộ hoặc thông tin tài sản cần ký gửi…",
            )}
          />
          {errors.message && (
            <span id={`${formId}-message-error`} className="field-error">
              {t(errors.message.message ?? "")}
            </span>
          )}
        </label>
      </div>
      <label className="checkbox">
        <input type="checkbox" {...register("consent")} />{" "}
        {t("Tôi đồng ý để Đất Vàng Group lưu thông tin và liên hệ tư vấn.")}
      </label>
      {errors.consent && (
        <p className="field-error">{t(errors.consent.message ?? "")}</p>
      )}
      <Button disabled={isSubmitting} type="submit">
        {t(isSubmitting ? "Đang gửi…" : "Đăng ký tư vấn")}
        <ArrowUpRight size={18} />
      </Button>
    </form>
  );
}
/**
 * The consultation form behind a button: pages keep their own layout and the
 * form opens only when a visitor asks for it.
 */
export function ContactDialog({
  source,
  label = "Gửi yêu cầu tư vấn",
  className = "button button-gold",
}: {
  source: string;
  label?: string;
  className?: string;
}) {
  const t = useT();
  return (
    <Dialog.Root>
      <Dialog.Trigger className={className}>
        {t(label)}
        <ArrowUpRight size={18} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content contact-dialog">
          <Dialog.Title className="sr-only">{t(label)}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t("Để lại thông tin, Đất Vàng Group sẽ liên hệ lại với bạn.")}
          </Dialog.Description>
          <ContactForm source={source} />
          <Dialog.Close className="dialog-close" aria-label={t("Đóng")}>
            <X />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  return (
    <Dialog.Root>
      <div className="gallery">
        {images.map((src, i) => (
          <Dialog.Trigger key={i} asChild>
            <button
              className={`gallery-image image-wrap gallery-${i}`}
              onClick={() => setIndex(i)}
              aria-label={t("Xem ảnh {n} của {title}", { n: i + 1, title })}
            >
              <Image
                src={src}
                alt={`${title} — ${t("ảnh không gian minh họa {n}", { n: i + 1 })}`}
                fill
                sizes={i === 0 ? "(max-width: 768px) 100vw, 66vw" : "33vw"}
                loading={i === 0 ? "eager" : "lazy"}
              />
              {i === 2 && <span>{t("Xem bộ sưu tập ↗")}</span>}
            </button>
          </Dialog.Trigger>
        ))}
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content lightbox">
          <Dialog.Title>
            {title} · {t("Ảnh minh họa")}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {t("Bộ ảnh không gian. Dùng các nút để chuyển ảnh.")}
          </Dialog.Description>
          <div className="lightbox-image">
            <Image
              src={images[index]}
              alt={`${title} ${index + 1}`}
              fill
              sizes="90vw"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="carousel-actions">
            <button
              aria-label={t("Ảnh trước")}
              onClick={() =>
                setIndex((index + images.length - 1) % images.length)
              }
            >
              <ArrowLeft />
            </button>
            <span>
              {index + 1} / {images.length}
            </span>
            <button
              aria-label={t("Ảnh sau")}
              onClick={() => setIndex((index + 1) % images.length)}
            >
              <ArrowRight />
            </button>
          </div>
          <Dialog.Close className="dialog-close" aria-label={t("Đóng bộ ảnh")}>
            <X />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Process() {
  const t = useT();
  const [active, setActive] = useState(0);
  const steps = [
    "Tiếp nhận nhu cầu",
    "Khảo sát & tư vấn",
    "Đề xuất giải pháp",
    "Triển khai hợp tác",
  ];
  return (
    <div className="process">
      <div
        className="process-tabs"
        role="tablist"
        aria-label={t("Quy trình hợp tác")}
      >
        {steps.map((step, i) => (
          <button
            key={step}
            id={`step-${i}`}
            role="tab"
            aria-selected={i === active}
            aria-controls="step-panel"
            tabIndex={i === active ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const n = (i + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                setActive(n);
                document.getElementById(`step-${n}`)?.focus();
              }
            }}
            onClick={() => setActive(i)}
          >
            <span>0{i + 1}</span>
            {t(step)}
          </button>
        ))}
      </div>
      <p role="tabpanel" id="step-panel" aria-labelledby={`step-${active}`}>
        {t(
          [
            "Chúng tôi bắt đầu bằng việc lắng nghe mong muốn, ngân sách và kế hoạch của bạn để xác định những ưu tiên quan trọng.",
            "Cùng tìm hiểu hiện trạng không gian, nhu cầu sử dụng và những điều kiện cần thiết cho phương án hợp tác.",
            "Trình bày phạm vi công việc, cách phối hợp và các chi phí dự kiến để hai bên cùng xem xét rõ ràng.",
            "Thống nhất kế hoạch, ghi nhận các đầu việc và duy trì trao đổi định kỳ trong quá trình thực hiện.",
          ][active],
        )}
      </p>
    </div>
  );
}
export function DemoAction({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast.info(
          t("Kênh liên hệ đang ở chế độ demo. Vui lòng dùng biểu mẫu tư vấn."),
        )
      }
    >
      {children}
    </Button>
  );
}
