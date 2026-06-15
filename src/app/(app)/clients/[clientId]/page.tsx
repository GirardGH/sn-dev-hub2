import { notFound } from "next/navigation";
import { getClient } from "@/features/clients/client.actions";
import { getStoriesByClient } from "@/features/stories/story.actions";
import { ClientFormClient } from "@/features/clients/ClientForm";

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function ClientPage({ params }: Props) {
  const { clientId } = await params;

  try {
    const [client, stories] = await Promise.all([
      getClient(clientId),
      getStoriesByClient(clientId),
    ]);
    return <ClientFormClient client={client} stories={stories} />;
  } catch {
    notFound();
  }
}
