import { getClients } from "@/features/clients/client.actions";
import { getStories } from "@/features/stories/story.actions";
import { DevelopmentFormClient } from "@/features/developments/DevelopmentForm";

export default async function NewDevelopmentPage() {
  const [clients, stories] = await Promise.all([getClients(), getStories()]);
  return <DevelopmentFormClient allClients={clients} allStories={stories} />;
}
