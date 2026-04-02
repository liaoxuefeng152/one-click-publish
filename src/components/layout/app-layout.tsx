import { Header } from './header';
import { Sidebar } from './sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    role: string;
  } | null;
}

export function AppLayout({ children, user }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header user={user} />
      <Sidebar />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
