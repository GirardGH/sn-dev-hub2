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
  ChevronRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/stories", label: "Stories", icon: BookOpen },
  { href: "/developments", label: "Developments", icon: Code2 },
  { href: "/xml-imports", label: "XML Imports", icon: FileCode2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-sn-sidebar flex flex-col z-30">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
        <div className="w-7 h-7 bg-sn-accent rounded flex items-center justify-center flex-shrink-0">
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">SN Dev Hub</p>
          <p className="text-sn-sidebar-text text-2xs leading-none mt-0.5">ServiceNow Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 mx-2 rounded text-sm transition-colors group",
                isActive
                  ? "bg-sn-accent text-white"
                  : "text-sn-sidebar-text hover:bg-sn-sidebar-hover hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-sn-sidebar-text text-2xs">v1.0.0</p>
      </div>
    </aside>
  );
}
