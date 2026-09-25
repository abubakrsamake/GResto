import { ShoppingCart, ChefHat, Receipt, FileText, Settings, Users, Package, BarChart3 } from 'lucide-react';
import logoUrl from '../../assets/logo_p.jpg';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  role: 'CASHIER' | 'SUPERADMIN';
}

export default function Sidebar({ activeTab, onTabChange, role }: SidebarProps) {
  const cashierTabs = [
    { key: 'POS', label: 'Caisse', icon: ShoppingCart },
    { key: 'KDS', label: 'Cuisine', icon: ChefHat },
    { key: 'INVOICES', label: 'Factures', icon: FileText },
    { key: 'SESSIONS', label: 'Clôtures', icon: Receipt },
      { key: 'SETTINGS', label: 'Paramètres', icon: Settings },
  ];

  const adminTabs = [
    { key: 'USERS', label: 'Utilisateurs', icon: Users },
    { key: 'PRODUCTS', label: 'Produits', icon: Package },
    { key: 'ORDERS', label: 'Commandes', icon: Receipt },
    { key: 'STATS', label: 'Stats', icon: BarChart3 },
    { key: 'SETTINGS', label: 'Paramètres', icon: Settings },
  ];

  const tabs = role === 'SUPERADMIN' ? adminTabs : cashierTabs;

  return (
    <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 shrink-0 h-full">
      <div className="p-3 mb-6">
        <img src={logoUrl} alt="GRestaurant" className="h-9 w-9 rounded-full shadow-lg shadow-indigo-600/20" />
      </div>

      <nav className="flex flex-col gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`p-3 rounded-xl transition relative group flex items-center justify-center ${
              activeTab === key
                ? 'bg-indigo-600 text-white shadow-xl'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={label}
          >
            <Icon className="h-5 w-5" />
            <span className="absolute left-20 bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              {label}
            </span>
          </button>
        ))}
      </nav>

    </aside>
  );
}