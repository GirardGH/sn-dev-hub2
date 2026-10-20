"use client";
import { useT } from "@/i18n/LanguageProvider";

import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmer la suppression",
  message = "Cette action est irréversible. Voulez-vous continuer ?",
  confirmLabel = "Supprimer",
  loading,
}: ConfirmDialogProps) {
  const t = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("Annuler")}</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {t(confirmLabel)}
          </Button>
        </>
      }
    >
      <p className="text-sm text-sn-text">{t(message)}</p>
    </Modal>
  );
}
