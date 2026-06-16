"use client";

import { useRouter } from "next/navigation";
import { LogOut, Bell } from "lucide-react";
import { GlobalSearch } from "@/components/search/GlobalSearch";

interface HeaderProps {
  userEmail?: string;
}

function initials(email?: string) {
  if (!email) return "U";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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
    <header className="fixed top-0 left-56 right-0 h-12 bg-sn-header flex items-center justify-between px-4 z-20 border-b border-white/5">
      {/* Left: global search */}
      <div className="flex items-center gap-3">
        <GlobalSearch />
      </div>

      {/* Right: user actions */}
      <div className="flex items-center gap-1">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/15">
          <div className="w-7 h-7 bg-sn-accent rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">{initials(userEmail)}</span>
          </div>
          {userEmail && (
            <span className="text-white/70 text-xs max-w-[150px] truncate">{userEmail}</span>
          )}
          <button
            onClick={handleSignOut}
            className="w-8 h-8 flex items-center justify-center rounded-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
