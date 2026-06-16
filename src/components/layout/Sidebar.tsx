"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Code2,
  FileCode2,
  Settings,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Application",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/clients", label: "Clients", icon: Building2 },
      { href: "/stories", label: "Stories", icon: BookOpen },
      { href: "/developments", label: "Developments", icon: Code2 },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/xml-imports", label: "XML Imports", icon: FileCode2 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-sn-sidebar flex flex-col z-30 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-12 border-b border-white/10 flex-shrink-0">
        <div className="w-6 h-6 bg-sn-accent rounded-sm flex items-center justify-center flex-shrink-0">
          <Layers className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-none tracking-tight">SN Dev Hub</p>
          <p className="text-sn-sidebar-text text-[10px] leading-none mt-0.5 truncate">ServiceNow Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sn-sidebar-text/50">
              {section.label}
            </p>
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors group",
                    active
                      ? "text-white bg-white/10"
                      : "text-sn-sidebar-text hover:text-white hover:bg-sn-sidebar-hover"
                  )}
                >
                  {/* Left active indicator */}
                  {active && (
                    <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-sn-accent rounded-r-sm" />
                  )}
                  <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-sn-accent" : "text-sn-sidebar-text group-hover:text-white")} />
                  <span className="flex-1 font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
        <p className="text-sn-sidebar-text/50 text-[10px]">SN Dev Hub v1.0.0</p>
      </div>
    </aside>
  );
}
