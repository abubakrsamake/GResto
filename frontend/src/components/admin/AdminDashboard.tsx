import { useState, useEffect } from 'react';
import LoginView from '../LoginView';
import UserView from './UserView';
import ProductView from './ProductView';
import OrderView from './OrderView';
import StatsView from './StatsView';
import authService from '../../services/authService';
import SettingView from './SettingView';

export default function AdminDashboard({ activeTab }: { activeTab?: string }) {
  const tab = (activeTab || 'USERS') as 'USERS' | 'PRODUCTS' | 'ORDERS' | 'STATS' | 'SETTINGS';
  const [role, setRole] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) return;
      try {
        const user = await authService.getCurrentUser();
        setRole(typeof user.role === 'string' ? user.role : user.role?.code || '');
      } catch { setRole(''); }
    };
    verify();
  }, [token]);

  if (!token) return <LoginView onLoginSuccess={() => window.location.reload()} />;
  if (role && role !== 'SUPERADMIN') return <div className="flex h-screen items-center justify-center text-rose-400">Accès réservé au SUPERADMIN</div>;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      <main className="flex-1 p-6 overflow-y-auto">
        {tab === 'USERS' && <UserView />}
        {tab === 'PRODUCTS' && <ProductView />}
        {tab === 'ORDERS' && <OrderView />}
        {tab === 'STATS' && <StatsView />}
        {tab === 'SETTINGS' && <SettingView />}
        {!['USERS', 'PRODUCTS', 'ORDERS', 'STATS', 'SETTINGS'].includes(tab) && <UserView />}
      </main>
    </div>
  );
}
