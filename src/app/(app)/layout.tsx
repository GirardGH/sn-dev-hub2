import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <AppShell userEmail={user.email}>{children}</AppShell>;
}
