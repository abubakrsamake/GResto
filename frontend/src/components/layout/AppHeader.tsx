import { LogOut } from 'lucide-react';

interface AppHeaderProps {
  isSuperAdmin: boolean;
  userName: string;
  userCode: string;
  userRole: string;
  onLogout: () => void;
}

export default function AppHeader({
  isSuperAdmin,
  userName,
  userCode,
  userRole,
  onLogout,
}: AppHeaderProps) {
  const now = new Date();

  return (
    <header className="w-full h-14 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 shrink-0 shadow-xl z-30">
      <div className="flex items-center gap-3">
        <img src="/src/assets/Logo.svg" alt="Logo" className="h-9 w-9 rounded-full shadow-lg shadow-indigo-600/30" />
        <div>
          <h2 className="text-sm font-black text-white leading-none">GRestaurant</h2>
          <p className="text-[10px] text-slate-500 font-medium">{isSuperAdmin ? 'Back-Office Admin' : 'POS Terminal'}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-xs text-slate-300 font-medium text-center leading-tight px-2 border-r border-slate-800">
          <div>{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div className="text-[10px] text-slate-500">{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>

        <div className="bg-emerald-900/30 border border-emerald-700/50 px-3 py-1 rounded-lg text-emerald-300 text-xs font-bold shadow-inner">
          {userName || 'Utilisateur'} · {userCode?.slice(0, 8) || 'N/A'} · {userRole}
        </div>

        <button
          onClick={onLogout}
          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
