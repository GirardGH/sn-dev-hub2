"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-0.5 text-[12px] text-sn-text-muted", className)}
    >
      <Link
        href="/dashboard"
        className="flex items-center p-1 hover:text-sn-accent transition-colors rounded-sm"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-0.5">
          <ChevronRight className="w-3 h-3 text-sn-border-dark flex-shrink-0" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-sn-accent transition-colors px-1 py-0.5 rounded-sm hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-sn-text font-semibold px-1 py-0.5">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
