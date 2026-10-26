"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";

export type UnitFacts =
  { facts: string; listing: "rent" | "sale" | "both" } | { missing: string };

/**
 * "Viết mô tả bằng AI" under a unit's description: Gemini drafts an opening
 * line and a few key points from the facts already typed in the form. The
 * draft replaces the text (with an undo) and is only saved with the form.
 */
export function AiDescribe({
  targetId,
  getFacts,
  onApplied,
}: {
  targetId: string;
  getFacts: () => UnitFacts;
  onApplied: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [hasText, setHasText] = useState(false);

  function field() {
    return document.getElementById(targetId) as HTMLTextAreaElement | null;
  }
  function write(text: string) {
    const target = field();
    if (!target) return;
    target.value = text;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    onApplied();
  }

  async function run() {
    const facts = getFacts();
    if ("missing" in facts) {
      toast.error(facts.missing);
      return;
    }
    const before = field()?.value ?? "";
    setBusy(true);
    try {
      const res = await api<{ data: { description: string } }>(
        "POST",
        "/admin/ai/unit-description",
        facts,
      );
      write(res.data.description);
      setHasText(true);
      toast.success("Đã viết mô tả. Hãy đọc lại và chỉnh trước khi lưu.", {
        action: before.trim()
          ? { label: "Hoàn tác", onClick: () => write(before) }
          : undefined,
      });
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
            ? "Viết lại bằng AI"
            : "Viết mô tả bằng AI"}
      </button>
      <small>
        Dựa trên thông tin đã điền ở trên (dự án, diện tích, phòng, nội thất,
        tiện nghi, giá). AI chỉ dùng thông tin bạn nhập.
      </small>
    </div>
  );
}
