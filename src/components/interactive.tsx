"use client";
import { useSyncExternalStore, useState, useId, useEffect } from "react";
import { motion, useReducedMotion, useScroll } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  X,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { testimonials, leads } from "@/data";
import { readStore, writeStore } from "@/lib/storage";
import { Button } from "./ui/button";
export function Providers() {
  return (
    <Toaster
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{ style: { fontFamily: "var(--font-body)" } }}
    />
  );
}
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduced ? {} : { opacity: [0.65, 1], y: [18, 0] }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  );
}
export function Progress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="scroll-progress"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
function subscribeFavorites(callback: () => void) {
  window.addEventListener("dvg-storage", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("dvg-storage", callback);
    window.removeEventListener("storage", callback);
  };
}
export function Favorite({ id }: { id: string }) {
  const saved = useSyncExternalStore(
    subscribeFavorites,
    () => readStore<string[]>("favorites", []).includes(id),
    () => false,
  );
  return (
    <button
      type="button"
      className={`favorite ${saved ? "selected" : ""}`}
      aria-label={saved ? "Bỏ yêu thích" : "Lưu căn hộ yêu thích"}
      aria-pressed={saved}
      onClick={() => {
        const current = readStore<string[]>("favorites", []);
        const next = saved ? current.filter((x) => x !== id) : [...current, id];
        if (writeStore("favorites", next)) {
          toast.success(
            saved ? "Đã bỏ khỏi yêu thích" : "Đã lưu căn hộ yêu thích",
          );
        }
      }}
    >
      <Heart size={18} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
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
  consent: z.boolean().refine((v) => v, "Bạn cần đồng ý lưu thông tin demo."),
});
type FormValues = z.infer<typeof schema>;
export function ContactForm({
  source = "Liên hệ",
  compact = false,
}: {
  source?: string;
  compact?: boolean;
}) {
  const formId = useId();
  const [done, setDone] = useState(false);
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
    const { consent: _consent, intent, ...data } = values;
    void _consent;
    const lead = {
      ...data,
      message: intent ? `[${intent}] ${data.message}` : data.message,
      id: crypto.randomUUID(),
      source,
      status: "Mới",
      assignment: "Chưa phân công",
      notes: "",
      createdAt: new Date().toISOString(),
    };
    if (writeStore("leads", [lead, ...readStore("leads", leads)])) {
      toast.success("Đã lưu yêu cầu demo trên trình duyệt.");
      setDone(true);
      reset();
    }
  }
  return (
    <form
      className={`contact-form ${compact ? "compact" : ""}`}
      onSubmit={handleSubmit(submit, () =>
        toast.error("Vui lòng kiểm tra các trường được đánh dấu."),
      )}
      noValidate
    >
      <span className="eyebrow">KẾT NỐI CÙNG ĐẤT VÀNG</span>
      <h3>
        {source.startsWith("Ứng tuyển")
          ? "Chia sẻ về bạn"
          : "Bắt đầu một cuộc trò chuyện"}
      </h3>
      <p className="muted">
        Thông tin chỉ lưu trên trình duyệt này, chưa gửi đến doanh nghiệp.
      </p>
      {done && (
        <div className="confirmation" role="status">
          <Check size={18} /> Yêu cầu demo đã lưu. Bạn có thể xem tại trang quản
          trị.
        </div>
      )}
      <div className="form-grid">
        {(["name", "phone", "email"] as const).map((field) => (
          <label key={field} className={field === "email" ? "full" : ""}>
            {
              { name: "Họ và tên", phone: "Số điện thoại", email: "Email" }[
                field
              ]
            }{" "}
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
                    ? "Số di động của bạn"
                    : "ban@example.com"
              }
            />
            {errors[field] && (
              <span id={`${formId}-${field}-error`} className="field-error">
                {errors[field]?.message}
              </span>
            )}
          </label>
        ))}
        {!source.startsWith("Ứng tuyển") && (
          <label className="full">
            Nhu cầu tư vấn <span aria-hidden="true">*</span>
            <select
              {...register("intent")}
              defaultValue=""
              aria-invalid={!!errors.intent}
              aria-describedby={
                errors.intent ? `${formId}-intent-error` : undefined
              }
            >
              <option value="" disabled>
                Chọn nhu cầu của bạn
              </option>
              <option>Tư vấn mua bán bất động sản</option>
              <option>Tìm thuê bất động sản</option>
              <option>Cho thuê bất động sản</option>
              <option>Ký gửi bán hoặc cho thuê</option>
              <option>Hợp tác và nhu cầu khác</option>
            </select>
            {errors.intent && (
              <span id={`${formId}-intent-error`} className="field-error">
                {errors.intent.message}
              </span>
            )}
          </label>
        )}
        <label className="full">
          {source.startsWith("Ứng tuyển")
            ? "Kinh nghiệm và vị trí mong muốn"
            : "Thông tin chi tiết"}{" "}
          <span aria-hidden="true">*</span>
          <textarea
            {...register("message")}
            rows={4}
            maxLength={1500}
            aria-invalid={!!errors.message}
            aria-describedby={
              errors.message ? `${formId}-message-error` : undefined
            }
            placeholder={
              source.startsWith("Ứng tuyển")
                ? "Chia sẻ kinh nghiệm và vị trí bạn muốn ứng tuyển…"
                : "Tên dự án, ngân sách, loại căn hộ hoặc thông tin tài sản cần ký gửi…"
            }
          />
          {errors.message && (
            <span id={`${formId}-message-error`} className="field-error">
              {errors.message.message}
            </span>
          )}
        </label>
      </div>
      <label className="checkbox">
        <input type="checkbox" {...register("consent")} /> Tôi đồng ý lưu thông
        tin để trải nghiệm bản demo.
      </label>
      {errors.consent && (
        <p className="field-error">{errors.consent.message}</p>
      )}
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Đang lưu…" : "Đăng ký tư vấn"}
        <ArrowUpRight size={18} />
      </Button>
    </form>
  );
}
const newsletterSchema = z.object({
  email: z.email("Vui lòng nhập email hợp lệ.").max(120),
});
export function Newsletter() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ email: string }>({ resolver: zodResolver(newsletterSchema) });
  return (
    <form
      onSubmit={handleSubmit(({ email }) => {
        const current = readStore<string[]>("newsletter", []);
        if (current.includes(email)) {
          toast.info("Email này đã đăng ký trong bản demo.");
          return;
        }
        if (writeStore("newsletter", [...current, email])) {
          toast.success("Đã lưu đăng ký demo. Chưa gửi email thực tế.");
          reset();
        }
      })}
      noValidate
    >
      <label htmlFor="newsletter">
        Nhận những góc nhìn mới về không gian sống
      </label>
      <div className="newsletter">
        <input
          id="newsletter"
          type="email"
          placeholder="Email của bạn"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        <button aria-label="Đăng ký bản tin">
          <ArrowRight size={20} />
        </button>
      </div>
      {errors.email && (
        <span className="field-error">{errors.email.message}</span>
      )}
    </form>
  );
}
export function Gallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  return (
    <Dialog.Root>
      <div className="gallery">
        {images.map((src, i) => (
          <Dialog.Trigger key={i} asChild>
            <button
              className={`gallery-image image-wrap gallery-${i}`}
              onClick={() => setIndex(i)}
              aria-label={`Xem ảnh ${i + 1} của ${title}`}
            >
              <Image
                src={src}
                alt={`${title} — ảnh không gian minh họa ${i + 1}`}
                fill
                sizes={i === 0 ? "(max-width: 768px) 100vw, 66vw" : "33vw"}
                loading={i === 0 ? "eager" : "lazy"}
              />
              {i === 2 && <span>Xem bộ sưu tập ↗</span>}
            </button>
          </Dialog.Trigger>
        ))}
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content lightbox">
          <Dialog.Title>{title} · Ảnh minh họa</Dialog.Title>
          <Dialog.Description className="sr-only">
            Bộ ảnh không gian. Dùng các nút để chuyển ảnh.
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
              aria-label="Ảnh trước"
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
              aria-label="Ảnh sau"
              onClick={() => setIndex((index + 1) % images.length)}
            >
              <ArrowRight />
            </button>
          </div>
          <Dialog.Close className="dialog-close" aria-label="Đóng bộ ảnh">
            <X />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Testimonials() {
  const [ref, api] = useEmblaCarousel({ loop: true });
  return (
    <section className="testimonials section">
      <div className="container testimonial-layout">
        <div>
          <span className="eyebrow">NHỮNG CÂU CHUYỆN ĐỒNG HÀNH</span>
          <h2>
            Niềm tin, từ những
            <br />
            <em>điều giản dị.</em>
          </h2>
          <p className="muted">
            Lời chia sẻ và nhân vật hư cấu, dùng minh họa trải nghiệm.
          </p>
          <div className="carousel-actions">
            <button
              onClick={() => api?.scrollPrev()}
              aria-label="Lời chia sẻ trước"
            >
              <ArrowLeft size={20} />
            </button>
            <button
              onClick={() => api?.scrollNext()}
              aria-label="Lời chia sẻ tiếp theo"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
        <div className="embla" ref={ref}>
          <div className="embla-container">
            {testimonials.map((t) => (
              <figure className="embla-slide" key={t.id}>
                <span className="quote-mark">“</span>
                <blockquote>{t.quote}</blockquote>
                <figcaption>
                  <span className="avatar">{t.name.slice(0, 1)}</span>
                  <div>
                    <strong>{t.name}</strong>
                    <small>{t.role}</small>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
export function Process() {
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
        aria-label="Quy trình hợp tác"
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
            {step}
          </button>
        ))}
      </div>
      <p role="tabpanel" id="step-panel" aria-labelledby={`step-${active}`}>
        {
          [
            "Chúng tôi bắt đầu bằng việc lắng nghe mong muốn, ngân sách và kế hoạch của bạn để xác định những ưu tiên quan trọng.",
            "Cùng tìm hiểu hiện trạng không gian, nhu cầu sử dụng và những điều kiện cần thiết cho phương án hợp tác.",
            "Trình bày phạm vi công việc, cách phối hợp và các chi phí dự kiến để hai bên cùng xem xét rõ ràng.",
            "Thống nhất kế hoạch, ghi nhận các đầu việc và duy trì trao đổi định kỳ trong quá trình thực hiện.",
          ][active]
        }
      </p>
    </div>
  );
}
export function DemoAction({ children }: { children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast.info(
          "Kênh liên hệ đang ở chế độ demo. Vui lòng dùng biểu mẫu tư vấn.",
        )
      }
    >
      {children}
    </Button>
  );
}
