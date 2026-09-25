import type { ReactNode } from 'react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

interface AppShellProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  role: 'SUPERADMIN' | 'CASHIER';
  userName: string;
  userCode: string;
  onLogout: () => void;
  children: ReactNode;
}

export default function AppShell({
  activeTab,
  onTabChange,
  role,
  userName,
  userCode,
  onLogout,
  children,
}: AppShellProps) {
  return (
    <div className="flex flex-col h-dvh w-screen bg-slate-950 overflow-hidden font-sans text-slate-100 select-none">
      <AppHeader
        isSuperAdmin={role === 'SUPERADMIN'}
        userName={userName}
        userCode={userCode}
        userRole={role}
        onLogout={onLogout}
      />

      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} role={role} />
        <main className="flex-1 h-full min-h-0 relative overflow-hidden bg-slate-950 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
