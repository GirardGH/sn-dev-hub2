import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { DashboardClient } from "./DashboardClient";
import type { RecentDev, RecentImport } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const [
    { count: clientsCount },
    { count: storiesCount },
    { count: devCount },
    { data: rawDevs },
    { data: rawImports },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("stories").select("*", { count: "exact", head: true }),
    supabase.from("developments").select("*", { count: "exact", head: true }),
    supabase
      .from("developments")
      .select("id, title, development_type, status, created_at, client_id, story_id, stories:story_id(title), clients:client_id(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("xml_imports")
      .select("id, filename, created_developments_count, status, created_at, clients:client_id(name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <DashboardClient
      stats={{
        clients: clientsCount ?? 0,
        stories: storiesCount ?? 0,
        developments: devCount ?? 0,
      }}
      recentDevelopments={(rawDevs ?? []) as unknown as RecentDev[]}
      recentImports={(rawImports ?? []) as unknown as RecentImport[]}
    />
  );
}
