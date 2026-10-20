"use client";
import { useT } from "@/i18n/LanguageProvider";

import { useState } from "react";
import { Settings2, GripVertical, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Checkbox";

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

interface ColumnConfiguratorProps {
  columns: ColumnDef[];
  onChange: (columns: ColumnDef[]) => void;
}

export function ColumnConfigurator({ columns, onChange }: ColumnConfiguratorProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<ColumnDef[]>([]);

  function handleOpen() {
    setLocal([...columns].sort((a, b) => a.order - b.order));
    setOpen(true);
  }

  function toggleVisible(key: string) {
    setLocal((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...local];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setLocal(next.map((c, i) => ({ ...c, order: i + 1 })));
  }

  function moveDown(index: number) {
    if (index === local.length - 1) return;
    const next = [...local];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setLocal(next.map((c, i) => ({ ...c, order: i + 1 })));
  }

  function handleSave() {
    onChange(local);
    setOpen(false);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        icon={<Settings2 className="w-3.5 h-3.5" />}
        onClick={handleOpen}
        title={t("Configure columns")}
      >
        {t("Columns")}</Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("Configure Columns")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={handleSave}>{t("Save")}</Button>
          </>
        }
      >
        <p className="text-xs text-sn-text-muted mb-3">
          {t("Check/uncheck to show or hide columns. Drag to reorder.")}</p>
        <div className="flex flex-col gap-1">
          {local.map((col, index) => (
            <div
              key={col.key}
              className="flex items-center gap-2 p-2 rounded border border-sn-border bg-gray-50 hover:bg-white transition-colors"
            >
              <GripVertical className="w-3.5 h-3.5 text-sn-text-muted flex-shrink-0 cursor-grab" />
              <Checkbox
                checked={col.visible}
                onChange={() => toggleVisible(col.key)}
              />
              <span className="flex-1 text-sm text-sn-text">{t(col.label)}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="text-sn-text-muted hover:text-sn-text disabled:opacity-30 text-xs"
                  title={t("Move up")}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === local.length - 1}
                  className="text-sn-text-muted hover:text-sn-text disabled:opacity-30 text-xs"
                  title={t("Move down")}
                >
                  ↓
                </button>
              </div>
              {col.visible ? (
                <Eye className="w-3.5 h-3.5 text-sn-accent" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-sn-text-muted" />
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
