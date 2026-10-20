"use client";
import { useT } from "@/i18n/LanguageProvider";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, size = "md", footer }: ModalProps) {
  const t = useT();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ? t(title) : undefined}
        className={cn(
          "bg-white rounded shadow-xl flex flex-col max-h-[90vh]",
          {
            "w-full max-w-sm": size === "sm",
            "w-full max-w-md": size === "md",
            "w-full max-w-2xl": size === "lg",
            "w-full max-w-4xl": size === "xl",
          }
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-sn-border flex-shrink-0">
          {title && <h2 className="text-sm font-semibold text-sn-text">{title ? t(title) : title}</h2>}
          <button
            aria-label={t("Close")}
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-sn-text-muted hover:text-sn-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-sn-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
