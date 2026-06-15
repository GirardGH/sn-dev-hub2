import { notFound } from "next/navigation";
import { getDevelopment } from "@/features/developments/development.actions";
import { DevelopmentFormClient } from "@/features/developments/DevelopmentForm";

interface Props {
  params: Promise<{ clientId: string; storyId: string; developmentId: string }>;
}

export default async function DevelopmentPage({ params }: Props) {
  const { clientId, storyId, developmentId } = await params;
  try {
    const dev = await getDevelopment(developmentId);
    return <DevelopmentFormClient development={dev} clientId={clientId} storyId={storyId} />;
  } catch {
    notFound();
  }
}
