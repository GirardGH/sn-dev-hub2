import { getSpaceContext } from "@/features/spaces/space.server";
import { SpaceProvider } from "@/features/spaces/SpaceProvider";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const spaceContext = await getSpaceContext();
  return <SpaceProvider value={spaceContext}><AppShell userEmail={user.email}>{children}</AppShell></SpaceProvider>;
}
