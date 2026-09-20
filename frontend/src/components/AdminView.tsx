//import AdminDashboard from './admin/AdminDashboard';
import OrderView from './admin/OrderView';
import ProductView from './admin/ProductView';
import StatsView from './admin/StatsView';
import UserView from './admin/UserView';
import SettingView from './admin/SettingView';

interface AdminViewProps {
  activeTab: string;
}

export default function AdminView({ activeTab }: AdminViewProps) {
  return (
    <div className="flex-1 h-full w-full overflow-y-auto bg-slate-950 text-slate-100 p-6">
      {/* Affichage conditionnel selon la sous-page sélectionnée dans le Sidebar */}
      {activeTab === 'USERS' && <UserView />}
      {activeTab === 'PRODUCTS' && <ProductView />}
      {activeTab === 'ORDERS' && <OrderView />}
      {activeTab === 'STATS' && <StatsView />}
      {activeTab === 'SETTINGS' && <SettingView />}
    </div>
  );
}