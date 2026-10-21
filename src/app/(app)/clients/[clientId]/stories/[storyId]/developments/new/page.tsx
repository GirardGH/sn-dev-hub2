import { notFound } from "next/navigation";
import { getStory } from "@/features/stories/story.actions";
import { getClient } from "@/features/clients/client.actions";
import { DevelopmentFormClient } from "@/features/developments/DevelopmentForm";
import type { Client } from "@/features/clients/client.types";
import type { Story } from "@/features/stories/story.types";

interface Props {
  params: Promise<{ clientId: string; storyId: string }>;
}

export default async function NewDevelopmentPage({ params }: Props) {
  const { clientId, storyId } = await params;
    const [client, story] = await Promise.all([
      getClient(clientId),
      getStory(storyId),
    ]).catch(() => notFound());
    return (
      <DevelopmentFormClient
        client={client as Client}
        story={story as Story}
      />
    );
}
