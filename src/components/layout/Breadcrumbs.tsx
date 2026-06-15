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
      className={cn("flex items-center gap-1 text-xs text-sn-text-muted", className)}
    >
      <Link
        href="/dashboard"
        className="flex items-center hover:text-sn-accent transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-sn-border-dark" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-sn-accent transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-sn-text font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
