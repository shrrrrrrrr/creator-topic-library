"use client";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  title = "删除确认",
  description = "你确认要删除吗？删除后无法恢复哦",
  confirmLabel = "确认",
  cancelLabel = "再想想",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel} type="button" variant="secondary">
            {cancelLabel}
          </Button>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
