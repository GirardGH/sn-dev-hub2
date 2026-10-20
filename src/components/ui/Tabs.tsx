"use client";
import { useT } from "@/i18n/LanguageProvider";

import { cn } from "@/lib/utils";

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const t = useT();
  return (
    <div className={cn("flex border-b border-sn-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === tab.key
              ? "border-sn-accent text-sn-accent"
              : "border-transparent text-sn-text-muted hover:text-sn-text hover:border-sn-border-dark"
          )}
        >
          {t(tab.label)}
          {tab.count !== undefined && (
            <span
              className={cn(
                "ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-2xs font-semibold",
                activeTab === tab.key
                  ? "bg-sn-accent text-white"
                  : "bg-gray-200 text-gray-600"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
