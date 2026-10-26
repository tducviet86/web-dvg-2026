"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "./api";

export type SeoSuggestion = {
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  imageAlt: string;
};
export type SeoSource = {
  title: string;
  summary?: string;
  content?: string;
  context?: string;
};

let status: Promise<boolean> | null = null;
/** Whether the server has a Gemini key (asked once per page load). */
const aiEnabled = () =>
  (status ??= api<{ data: { seo: boolean } }>("GET", "/admin/ai/status")
    .then((res) => res.data.seo)
    .catch(() => false));

/**
 * "Gợi ý SEO bằng AI": the server reads the current title and content with
 * Gemini and proposes SEO tags. Nothing is saved until the editor applies
 * the suggestion and saves the form.
 */
export function AiSeoAssistant({
  kind,
  path,
  getSource,
  onApply,
}: {
  kind: "post" | "project" | "property" | "page" | "job";
  /** Public URL shown in the search preview, e.g. /blog/slug. */
  path: string;
  getSource: () => SeoSource;
  onApply: (suggestion: SeoSuggestion) => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<SeoSuggestion | null>(null);
  useEffect(() => {
    let alive = true;
    void aiEnabled().then((value) => alive && setEnabled(value));
    return () => {
      alive = false;
    };
  }, []);

  async function suggest() {
    const source = getSource();
    if (source.title.trim().length < 2) {
      setError("Hãy nhập tiêu đề trước khi dùng AI.");
      return;
    }
    if ((source.summary ?? "").length + (source.content ?? "").length < 40) {
      setError(
        "Nội dung còn quá ngắn để AI phân tích. Hãy viết mô tả hoặc nội dung trước.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api<{ data: SeoSuggestion }>(
        "POST",
        "/admin/ai/seo-suggest",
        { kind, ...source },
      );
      setSuggestion(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ai-seo full" aria-live="polite">
      <div className="ai-seo-head">
        <span className="ai-seo-icon" aria-hidden="true">
          <Sparkles size={17} />
        </span>
        <div>
          <strong>Gợi ý SEO bằng AI</strong>
          <small>
            {enabled === false
              ? "Chưa bật: quản trị viên cần cấu hình khóa Gemini trên máy chủ."
              : "AI đọc tiêu đề và nội dung hiện tại, giữ giọng văn của bài và chỉ dùng thông tin có trong bài. Bạn duyệt trước khi áp dụng."}
          </small>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || enabled !== true}
          onClick={suggest}
        >
          {suggestion ? <RotateCcw size={15} /> : <Sparkles size={15} />}
          {busy
            ? "AI đang đọc nội dung…"
            : suggestion
              ? "Gợi ý lại"
              : "Tạo gợi ý"}
        </Button>
      </div>
      {error && (
        <p className="field-error-text" role="alert">
          {error}
        </p>
      )}
      {suggestion && (
        <div className="ai-seo-result">
          <div className="serp-preview" aria-label="Xem trước kết quả tìm kiếm">
            <span className="serp-url">datvanggroup.vn{path}</span>
            <strong className="serp-title">{suggestion.seoTitle}</strong>
            <p className="serp-desc">{suggestion.seoDescription}</p>
          </div>
          <dl className="ai-seo-meta">
            <dt>Độ dài</dt>
            <dd>
              Tiêu đề {suggestion.seoTitle.length}/60 · Mô tả{" "}
              {suggestion.seoDescription.length}/160 ký tự
            </dd>
            {suggestion.keywords.length > 0 && (
              <>
                <dt>Từ khóa gợi ý</dt>
                <dd>
                  {suggestion.keywords.map((k) => (
                    <span key={k} className="ai-chip">
                      {k}
                    </span>
                  ))}
                </dd>
              </>
            )}
            {suggestion.imageAlt && (
              <>
                <dt>Mô tả ảnh</dt>
                <dd>{suggestion.imageAlt}</dd>
              </>
            )}
          </dl>
          <div className="ai-seo-actions">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(suggestion);
                setSuggestion(null);
              }}
            >
              <Check size={15} /> Áp dụng vào form
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSuggestion(null)}
            >
              <X size={15} /> Bỏ qua
            </Button>
          </div>
          <small>
            Áp dụng sẽ điền Tiêu đề SEO, Mô tả SEO
            {kind === "post" ? ", từ khóa (nếu đang trống)" : ""} và mô tả ảnh
            (nếu đang trống). Bấm Lưu để ghi lại.
          </small>
        </div>
      )}
    </div>
  );
}
