"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";

export type UnitFacts =
  { facts: string; listing: "rent" | "sale" | "both" } | { missing: string };

/**
 * "Viết tiêu đề & mô tả bằng AI" under a unit's description: Gemini drafts a
 * catchy title, an opening line and a few key points from the facts already
 * typed in the form. The draft replaces both texts (with an undo) and is
 * only saved with the form.
 */
export function AiDescribe({
  targetId,
  titleName,
  getFacts,
  onApplied,
}: {
  targetId: string;
  /** `name` of the title input in the same form. */
  titleName: string;
  getFacts: () => UnitFacts;
  onApplied: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [hasText, setHasText] = useState(false);

  function field() {
    return document.getElementById(targetId) as HTMLTextAreaElement | null;
  }
  function titleField() {
    return field()?.form?.elements.namedItem(
      titleName,
    ) as HTMLInputElement | null;
  }
  function set(
    target: HTMLInputElement | HTMLTextAreaElement | null,
    text: string,
  ) {
    if (!target) return;
    target.value = text;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
  /** `title` null: keep the title as it is. */
  function write(title: string | null, text: string) {
    if (title !== null) set(titleField(), title);
    set(field(), text);
    onApplied();
  }

  async function run() {
    const facts = getFacts();
    if ("missing" in facts) {
      toast.error(facts.missing);
      return;
    }
    const before = {
      title: titleField()?.value ?? "",
      text: field()?.value ?? "",
    };
    setBusy(true);
    try {
      const res = await api<{ data: { title?: string; description: string } }>(
        "POST",
        "/admin/ai/unit-description",
        facts,
      );
      const title = res.data.title?.trim() || null;
      write(title, res.data.description);
      setHasText(true);
      toast.success(
        title
          ? "Đã viết tiêu đề và mô tả. Hãy đọc lại và chỉnh trước khi lưu."
          : // An API that has not been updated yet only sends the description.
            "Đã viết mô tả; máy chủ chưa trả về tiêu đề nên tên căn giữ nguyên.",
        {
          action:
            before.title.trim() || before.text.trim()
              ? {
                  label: "Hoàn tác",
                  onClick: () => write(before.title, before.text),
                }
              : undefined,
        },
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ai-describe">
      <button
        type="button"
        className="ai-describe-button"
        disabled={busy}
        onClick={run}
        onFocus={() => setHasText(!!field()?.value.trim())}
        onPointerEnter={() => setHasText(!!field()?.value.trim())}
      >
        <Sparkles size={15} aria-hidden="true" />
        {busy
          ? "AI đang viết…"
          : hasText
            ? "Viết lại tiêu đề & mô tả bằng AI"
            : "Viết tiêu đề & mô tả bằng AI"}
      </button>
      <small>
        Dựa trên dự án và thông tin đã điền (diện tích, phòng, nội thất, tiện
        nghi, giá). AI chỉ dùng thông tin bạn nhập và thay cả tên căn lẫn mô tả;
        có nút hoàn tác.
      </small>
    </div>
  );
}
