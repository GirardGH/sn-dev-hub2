import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
}

export function AppShell({ children, userEmail }: AppShellProps) {
  return (
    <div className="min-h-screen bg-sn-bg">
      <Sidebar />
      <Header userEmail={userEmail} />
      <main className="ml-56 pt-12 min-h-screen">
        <div className="p-5">{children}</div>
      </main>
    </div>
  );
}
