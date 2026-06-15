import { getDevelopments } from "@/features/developments/development.actions";
import { DevelopmentListClient } from "@/features/developments/DevelopmentList";

export default async function DevelopmentsPage() {
  const developments = await getDevelopments();
  return <DevelopmentListClient developments={developments} />;
}
