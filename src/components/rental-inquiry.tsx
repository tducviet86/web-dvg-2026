"use client";
import {
  cloneElement,
  isValidElement,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n/client";

export type InquiryMode = "advice" | "consign";

export type InquiryTarget = {
  propertySlug?: string;
  projectSlug?: string;
  /** Shown in the dialog and written into the message for the sales team. */
  label?: string;
  code?: string;
  phone?: string;
};

type Form = typeof import("./rental-inquiry-form").InquiryDialogForm;
let loading: Promise<Form> | null = null;
/** The form (and its validation libraries) is fetched once, on first need. */
const loadForm = () =>
  (loading ??= import("./rental-inquiry-form").then(
    (m) => m.InquiryDialogForm,
  ));

/**
 * "Nhận tư vấn" / "Ký gửi" popup. Pages only carry the button: the form is
 * downloaded when the visitor points at, focuses or clicks it, then opens
 * as if it had been there all along.
 */
export function InquiryDialog(props: {
  mode: InquiryMode;
  target?: InquiryTarget;
  /** The button that opens the dialog. */
  trigger: ReactNode;
}) {
  const [Loaded, setLoaded] = useState<{ Form: Form; open: boolean } | null>(
    null,
  );
  if (Loaded) return <Loaded.Form {...props} initialOpen={Loaded.open} />;
  if (!isValidElement(props.trigger)) return props.trigger;
  const trigger = props.trigger as ReactElement<{
    onClick?: (event: MouseEvent) => void;
    onPointerEnter?: () => void;
    onFocus?: () => void;
  }>;
  return cloneElement(trigger, {
    "aria-haspopup": "dialog",
    onPointerEnter: () => void loadForm(),
    onFocus: () => void loadForm(),
    onClick: (event: MouseEvent) => {
      event.preventDefault();
      trigger.props.onClick?.(event);
      void loadForm().then((Form) => setLoaded({ Form, open: true }));
    },
  } as Record<string, unknown>);
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
