"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FormIssue = { field?: string; label?: string; message: string };

/**
 * "Chưa thể lưu" popup: lists every problem in plain language; each item
 * with a field jumps to (and focuses) that field.
 */
export function ErrorDialog({
  issues,
  title = "Chưa thể lưu",
  onClose,
  onGoTo,
}: {
  issues: FormIssue[];
  title?: string;
  onClose: () => void;
  onGoTo: (field: string) => void;
}) {
  return (
    <Dialog.Root
      open={issues.length > 0}
      onOpenChange={(open) => !open && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="admin-dialog-overlay" />
        <Dialog.Content
          className="admin-dialog"
          aria-describedby="admin-dialog-desc"
        >
          <div className="admin-dialog-icon" aria-hidden="true">
            <AlertTriangle size={22} />
          </div>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description id="admin-dialog-desc">
            {issues.length === 1
              ? "Vui lòng kiểm tra mục sau rồi lưu lại."
              : `Có ${issues.length} mục cần kiểm tra trước khi lưu.`}
          </Dialog.Description>
          <ul className="admin-dialog-list">
            {issues.map((issue, i) => (
              <li key={`${issue.field ?? "form"}-${i}`}>
                <span>
                  {issue.label && <strong>{issue.label}: </strong>}
                  {issue.message}
                </span>
                {issue.field && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onGoTo(issue.field!);
                    }}
                  >
                    Sửa <ArrowRight size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="dialog-actions">
            <Dialog.Close asChild>
              <Button type="button">Đã hiểu</Button>
            </Dialog.Close>
          </div>
          <Dialog.Close className="admin-dialog-close" aria-label="Đóng">
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Yes/no popup, e.g. "leave without saving?". The safe choice (stay) has the
 * focus, so pressing Enter or Escape never throws work away.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Tiếp tục chỉnh sửa",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="admin-dialog-overlay" />
        <Dialog.Content
          className="admin-dialog admin-confirm"
          aria-describedby="admin-confirm-desc"
        >
          <div className="admin-dialog-icon" aria-hidden="true">
            <AlertTriangle size={22} />
          </div>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description id="admin-confirm-desc">
            {message}
          </Dialog.Description>
          <div className="dialog-actions">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" autoFocus>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button type="button" className="button-danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
          <Dialog.Close className="admin-dialog-close" aria-label="Đóng">
            <X size={18} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
