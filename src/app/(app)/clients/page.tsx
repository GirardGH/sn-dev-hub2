import { getClients } from "@/features/clients/client.actions";
import { ClientListClient } from "@/features/clients/ClientList";

export default async function ClientsPage() {
  const clients = await getClients();
  return <ClientListClient clients={clients} />;
}
