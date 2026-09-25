import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import LoginView from './components/LoginView';
import AdminLoginView from './components/admin/AdminLoginView';
import LoadingScreen from './components/common/LoadingScreen';
import AppShell from './components/layout/AppShell';
import POSView from './components/pos/POSView';
import AdminDashboard from './components/admin/AdminDashboard';
import KitchenView from './components/KitchenView';
import SessionsView from './components/SessionsView';
import InvoicesView from './components/InvoicesView';
import SettingView from './components/admin/SettingView';
import useAuth from './hooks/useAuth';

export default function App() {
  const [adminLoginMode, setAdminLoginMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('POS');
  const { user, isAuthenticated, isLoading, completeLogin, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    setActiveTab((currentTab) => {
      if (user.role === 'SUPERADMIN' && currentTab === 'POS') return 'USERS';
      if (user.role === 'CASHIER' && currentTab === 'USERS') return 'POS';
      return currentTab;
    });
  }, [isAuthenticated, user.role]);

  const handleLogout = () => {
    logout();
    setAdminLoginMode(false);
    setActiveTab('POS');
  };

  const handleLogin = async (token: string, name: string, role?: string, code?: string) => {
    const nextUser = await completeLogin(token, name, role, code);
    setActiveTab(nextUser.role === 'SUPERADMIN' ? 'USERS' : 'POS');
  };

  if (isLoading) return <LoadingScreen />;
  if (adminLoginMode) return <AdminLoginView onLoginSuccess={(t, n, r, c) => { handleLogin(t, n, r, c); setAdminLoginMode(false); }} onBack={() => setAdminLoginMode(false)} />;
  if (!isAuthenticated) return <LoginView onLoginSuccess={handleLogin} onAdminClick={() => setAdminLoginMode(true)} />;

  const isSuperAdmin = user.role === 'SUPERADMIN';

  return (
    
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      role={user.role}
      userName={user.name}
      userCode={user.code}
      onLogout={handleLogout}
    >
      <div>
        {/* Ton application */}
        <Toaster position="top-right" reverseOrder={false} />
      </div>
      {isSuperAdmin ? (
        <AdminDashboard activeTab={activeTab} />
      ) : (
        <div className="flex-1 h-full min-h-0 relative overflow-hidden bg-slate-950 flex flex-col">
          {activeTab === 'POS' && <POSView />}
          {activeTab === 'KDS' && <KitchenView />}
          {activeTab === 'INVOICES' && <InvoicesView />}
          {activeTab === 'SESSIONS' && <SessionsView />}
          {activeTab === 'SETTINGS' && <SettingView mode="pos" />}
        </div>
      )}
    </AppShell>
  );
}