import { getClients } from "@/features/clients/client.actions";
import { getStories } from "@/features/stories/story.actions";
import { XmlImportFormClient } from "@/features/xml/XmlImportForm";

interface Props {
  searchParams: Promise<{ storyId?: string; clientId?: string }>;
}

export default async function NewXmlImportPage({ searchParams }: Props) {
  const { storyId, clientId } = await searchParams;
  const [clients, stories] = await Promise.all([getClients(), getStories()]);
  return (
    <XmlImportFormClient
      clients={clients}
      stories={stories}
      defaultClientId={clientId}
      defaultStoryId={storyId}
    />
  );
}
