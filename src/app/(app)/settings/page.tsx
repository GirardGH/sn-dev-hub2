import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return <SettingsClient user={user} profile={profile} />;
}
