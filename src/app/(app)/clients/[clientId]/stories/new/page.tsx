import { notFound } from "next/navigation";
import { getClient } from "@/features/clients/client.actions";
import { StoryFormClient } from "@/features/stories/StoryForm";

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function NewStoryPage({ params }: Props) {
  const { clientId } = await params;
  try {
    const client = await getClient(clientId);
    return <StoryFormClient client={client} />;
  } catch {
    notFound();
  }
}
