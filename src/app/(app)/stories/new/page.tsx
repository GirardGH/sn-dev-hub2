import { getClients } from "@/features/clients/client.actions";
import { StoryFormClient } from "@/features/stories/StoryForm";

export default async function NewStoryPage() {
  const clients = await getClients();
  return <StoryFormClient allClients={clients} />;
}
