"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, Bell } from "lucide-react";

interface HeaderProps {
  userEmail?: string;
}

export function Header({ userEmail }: HeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabaseClient");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-56 right-0 h-12 bg-sn-header flex items-center justify-between px-4 z-20 shadow-sm">
      {/* Left: app subtitle */}
      <div className="flex items-center gap-3">
        <span className="text-white/70 text-xs">ServiceNow Development Manager</span>
      </div>

      {/* Right: user actions */}
      <div className="flex items-center gap-1">
        <button className="w-8 h-8 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
          <div className="w-7 h-7 bg-sn-accent rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          {userEmail && (
            <span className="text-white/80 text-xs max-w-[140px] truncate">{userEmail}</span>
          )}
          <button
            onClick={handleSignOut}
            className="w-8 h-8 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors ml-1"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
