"use client";
import { useId, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  Check,
  Link2,
  Phone,
  RotateCcw,
  X,
} from "lucide-react";
import { postPublic } from "@/lib/api/client";
import { companyHotline, telephoneHref } from "@/lib/company-contact";
import { useT } from "@/i18n/client";
import { track } from "@/lib/analytics";

/**
 * What the visitor asks for. Each mode sends a lead to `POST /inquiries`
 * (BE links it to the unit/project from the slug) with its own intent.
 */
export type InquiryMode = "advice" | "consign";

export type InquiryTarget = {
  propertySlug?: string;
  projectSlug?: string;
  /** Shown in the dialog and written into the message for the sales team. */
  label?: string;
  code?: string;
  phone?: string;
};

const copy: Record<
  InquiryMode,
  {
    title: string;
    lead: string;
    intent: string;
    source: string;
    submit: string;
  }
> = {
  advice: {
    title: "Tư vấn chọn căn",
    lead: "Cho chúng tôi biết ngân sách và nhu cầu, tư vấn viên sẽ gửi các căn phù hợp.",
    intent: "Tìm thuê bất động sản",
    source: "Cho thuê căn hộ",
    submit: "Gửi nhu cầu",
  },
  consign: {
    title: "Ký gửi căn hộ cho thuê",
    lead: "Giới thiệu căn hộ của bạn. Đất Vàng sẽ liên hệ khảo sát và đề xuất phương án cho thuê.",
    intent: "Ký gửi bán hoặc cho thuê",
    source: "Ký gửi căn hộ",
    submit: "Gửi thông tin ký gửi",
  },
};

/** "0911 29 69 79" → "0911296979" (the API accepts digits only). */
const digits = (phone: string) => phone.replace(/[\s.()-]/g, "");

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Vui lòng nhập họ tên (ít nhất 2 ký tự).")
    .max(80, "Tối đa 80 ký tự."),
  phone: z
    .string()
    .refine(
      (v) => /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(digits(v)),
      "Nhập số di động Việt Nam hợp lệ.",
    ),
  email: z.email("Email chưa đúng định dạng.").max(120),
  budget: z.string().optional(),
  note: z.string().max(1000, "Tối đa 1.000 ký tự.").optional(),
  consent: z
    .boolean()
    .refine((v) => v, "Bạn cần đồng ý để Đất Vàng Group liên hệ lại."),
  website: z.string().optional(),
});
type Values = z.infer<typeof schema>;

/** Field names in API validation errors → form labels. */
const apiFields: Record<string, string> = {
  name: "Họ và tên",
  phone: "Số điện thoại",
  email: "Email",
  message: "Nội dung",
  consent: "Đồng ý liên hệ",
};

type Outcome =
  | { kind: "success"; summary: [label: string, value: string][] }
  | { kind: "error"; title: string; message: string; fields: string[] };

const now = () => Date.now();

function compose(mode: InquiryMode, target: InquiryTarget, v: Values) {
  const lines: string[] = [];
  const unit = [target.label, target.code && `mã ${target.code}`]
    .filter(Boolean)
    .join(" · ");
  if (mode === "advice") {
    lines.push(`Tư vấn chọn căn hộ thuê${unit ? ` tại ${unit}` : ""}.`);
    if (v.budget) lines.push(`Ngân sách: ${v.budget}.`);
  } else {
    lines.push(
      `Chủ sở hữu muốn ký gửi căn hộ cho thuê${unit ? ` tại ${unit}` : ""}.`,
    );
  }
  if (v.note?.trim()) lines.push(`Ghi chú: ${v.note.trim()}`);
  return lines.join("\n").slice(0, 1500);
}

export function InquiryDialog({
  mode,
  target = {},
  trigger,
}: {
  mode: InquiryMode;
  target?: InquiryTarget;
  /** The button that opens the dialog (rendered as the Radix trigger). */
  trigger: ReactNode;
}) {
  const formId = useId();
  const t = useT();
  const text = copy[mode];
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Anti-spam signal checked by the API: time since the form opened.
  const [openedAt, setOpenedAt] = useState(0);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { consent: false, budget: "" },
  });
  const call = telephoneHref(target.phone || companyHotline);

  async function submit(values: Values) {
    const result = await postPublic("/inquiries", {
      name: values.name.trim(),
      phone: digits(values.phone),
      email: values.email.trim(),
      message: compose(mode, target, values),
      consent: values.consent,
      intent: text.intent,
      source: text.source,
      propertySlug: target.propertySlug,
      projectSlug: target.projectSlug,
      website: values.website,
      elapsedMs: now() - openedAt,
    });
    if (result.ok) {
      setOutcome({
        kind: "success",
        summary: (
          [
            target.label ? ["Căn hộ / dự án", target.label] : null,
            ["Liên hệ", digits(values.phone)],
          ] as ([string, string] | null)[]
        ).filter((x): x is [string, string] => !!x),
      });
      track("generate_lead", { form: mode, source: text.source });
      toast.success(t("Đã gửi yêu cầu tới Đất Vàng Group."));
      reset();
      return;
    }
    const fields = Array.isArray(result.details)
      ? [
          ...new Set(
            (result.details as { field?: string }[])
              .map((d) => apiFields[d.field ?? ""])
              .filter(Boolean),
          ),
        ]
      : [];
    setOutcome({
      kind: "error",
      title:
        result.code === "RATE_LIMITED"
          ? "Bạn gửi hơi nhanh"
          : result.code === "NETWORK"
            ? "Mất kết nối"
            : "Chưa gửi được yêu cầu",
      message:
        result.code === "RATE_LIMITED"
          ? "Bạn đã gửi nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau vài phút hoặc gọi hotline."
          : result.message,
      fields,
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setOpenedAt(now());
          setOutcome(null);
        }
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay inquiry-overlay" />
        <Dialog.Content
          className="inquiry-dialog"
          aria-describedby={`${formId}-lead`}
        >
          <Dialog.Close className="inquiry-close" aria-label={t("Đóng")}>
            <X size={20} />
          </Dialog.Close>
          {outcome?.kind === "success" ? (
            <div className="inquiry-result success" role="status">
              <span className="inquiry-result-icon">
                <Check size={30} />
              </span>
              <Dialog.Title>{t("Đã nhận yêu cầu của bạn")}</Dialog.Title>
              <p id={`${formId}-lead`}>
                {t(
                  "Tư vấn viên Đất Vàng Group sẽ gọi lại trong giờ làm việc để xác nhận. Bạn không cần gửi lại yêu cầu.",
                )}
              </p>
              {outcome.summary.length > 0 && (
                <ul>
                  {outcome.summary.map(([label, value]) => (
                    <li key={label}>
                      {t(label)}: {value}
                    </li>
                  ))}
                </ul>
              )}
              <div className="inquiry-actions">
                <Dialog.Close className="button button-primary">
                  {t("Hoàn tất")}
                </Dialog.Close>
                {call && (
                  <a className="button button-outline" href={call}>
                    <Phone size={17} /> {t("Gọi ngay")}
                  </a>
                )}
              </div>
            </div>
          ) : outcome?.kind === "error" ? (
            <div className="inquiry-result error" role="alert">
              <span className="inquiry-result-icon">
                <AlertTriangle size={28} />
              </span>
              <Dialog.Title>{t(outcome.title)}</Dialog.Title>
              <p id={`${formId}-lead`}>{t(outcome.message)}</p>
              {outcome.fields.length > 0 && (
                <p className="inquiry-fields">
                  {t("Kiểm tra lại")}:{" "}
                  {outcome.fields.map((f) => t(f)).join(", ")}.
                </p>
              )}
              <div className="inquiry-actions">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setOutcome(null)}
                >
                  <RotateCcw size={17} /> {t("Sửa và gửi lại")}
                </button>
                {call && (
                  <a className="button button-outline" href={call}>
                    <Phone size={17} /> {t("Gọi hotline")}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <form
              className="inquiry-form"
              noValidate
              onSubmit={handleSubmit(submit, () =>
                toast.error(t("Vui lòng kiểm tra các trường được đánh dấu.")),
              )}
            >
              <span className="signature-kicker">
                <CalendarCheck size={15} /> ĐẤT VÀNG LIVING
              </span>
              <Dialog.Title>{t(text.title)}</Dialog.Title>
              <p id={`${formId}-lead`} className="inquiry-lead">
                {t(text.lead)}
              </p>
              {target.label && (
                <div className="inquiry-target">
                  <strong>{target.label}</strong>
                  {target.code && (
                    <span>
                      {t("Mã căn")} {target.code}
                    </span>
                  )}
                </div>
              )}
              <input
                {...register("website")}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="sr-only"
              />
              <div className="inquiry-grid">
                <Field
                  id={`${formId}-name`}
                  label="Họ và tên"
                  error={errors.name?.message}
                  required
                >
                  <input
                    id={`${formId}-name`}
                    {...register("name")}
                    autoComplete="name"
                    maxLength={80}
                    placeholder="Nguyễn Minh Anh"
                    aria-invalid={!!errors.name}
                    aria-describedby={
                      errors.name ? `${formId}-name-error` : undefined
                    }
                  />
                </Field>
                <Field
                  id={`${formId}-phone`}
                  label="Số điện thoại"
                  error={errors.phone?.message}
                  required
                >
                  <input
                    id={`${formId}-phone`}
                    {...register("phone")}
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={16}
                    placeholder="09xx xxx xxx"
                    aria-invalid={!!errors.phone}
                    aria-describedby={
                      errors.phone ? `${formId}-phone-error` : undefined
                    }
                  />
                </Field>
                <Field
                  id={`${formId}-email`}
                  label="Email"
                  error={errors.email?.message}
                  required
                  full
                >
                  <input
                    id={`${formId}-email`}
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    maxLength={120}
                    placeholder="ban@example.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? `${formId}-email-error` : undefined
                    }
                  />
                </Field>
                {mode === "advice" && (
                  <Field
                    id={`${formId}-budget`}
                    label="Ngân sách mỗi tháng"
                    full
                  >
                    <select id={`${formId}-budget`} {...register("budget")}>
                      <option value="">{t("Chưa xác định")}</option>
                      {[
                        "Dưới 10 triệu",
                        "10–15 triệu",
                        "15–25 triệu",
                        "Trên 25 triệu",
                      ].map((budget) => (
                        <option key={budget} value={budget}>
                          {t(budget)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field
                  id={`${formId}-note`}
                  label={
                    mode === "consign" ? "Thông tin căn hộ" : "Ghi chú thêm"
                  }
                  error={errors.note?.message}
                  full
                >
                  <textarea
                    id={`${formId}-note`}
                    {...register("note")}
                    rows={3}
                    maxLength={1000}
                    placeholder={t(
                      mode === "consign"
                        ? "Dự án, mã căn, diện tích, nội thất, giá mong muốn…"
                        : "Số người ở, số phòng ngủ, khu vực mong muốn, ngày chuyển vào…",
                    )}
                  />
                </Field>
              </div>
              <label className="checkbox inquiry-consent">
                <input type="checkbox" {...register("consent")} />{" "}
                {t(
                  "Tôi đồng ý để Đất Vàng Group lưu thông tin và liên hệ tư vấn.",
                )}
              </label>
              {errors.consent && (
                <p className="field-error">{t(errors.consent.message ?? "")}</p>
              )}
              <div className="inquiry-actions">
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting}
                >
                  {t(isSubmitting ? "Đang gửi…" : text.submit)}
                  <ArrowUpRight size={17} />
                </button>
                {call && (
                  <a className="inquiry-call" href={call}>
                    <Phone size={16} /> {t("Hoặc gọi")}{" "}
                    {target.phone || companyHotline}
                  </a>
                )}
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  id,
  label,
  error,
  required,
  full,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  full?: boolean;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className={`inquiry-field ${full ? "full" : ""}`}>
      <label htmlFor={id}>
        {t(label)}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {t(error)}
        </span>
      )}
    </div>
  );
}

/** Copies the page URL (or opens the native share sheet on phones). */
export function ShareButton({ title }: { title: string }) {
  const t = useT();
  return (
    <button
      type="button"
      className="room-share"
      onClick={async () => {
        const url = window.location.href.split("#")[0];
        try {
          if (navigator.share && matchMedia("(pointer: coarse)").matches) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          toast.success(t("Đã sao chép liên kết căn hộ."));
        } catch (error) {
          if ((error as Error)?.name !== "AbortError")
            toast.error(
              t("Không sao chép được liên kết. Hãy sao chép từ thanh địa chỉ."),
            );
        }
      }}
    >
      <Link2 size={17} />
      <span>{t("Chia sẻ")}</span>
    </button>
  );
}
