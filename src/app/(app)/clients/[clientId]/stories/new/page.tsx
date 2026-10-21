import { notFound } from "next/navigation";
import { getClient } from "@/features/clients/client.actions";
import { StoryFormClient } from "@/features/stories/StoryForm";

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function NewStoryPage({ params }: Props) {
  const { clientId } = await params;
    const client = await getClient(clientId).catch(() => notFound());
    return <StoryFormClient client={client} />;
}
