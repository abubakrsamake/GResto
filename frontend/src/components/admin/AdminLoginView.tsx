import { useState } from 'react';
import authService from '../../services/authService';
import { ShieldCheck, LogIn } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string, userName: string, userRole?: string, userCode?: string) => void;
  onBack: () => void;
}

export default function AdminLoginView({ onLoginSuccess, onBack }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const response = await authService.loginWithEmail(email, password);
      const userName = response.user?.first_name || 'Admin';
      const userRole: string = response.user?.role && typeof response.user.role === 'object'
        ? String(response.user.role.code || 'SUPERADMIN')
        : String(response.user?.role ?? 'SUPERADMIN');

      onLoginSuccess(response.access_token, userName, userRole, 'ADM-001');
    } catch (e: any) {
      setError(e.response?.data?.detail || e.response?.data?.message || e.message || 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans select-none overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 w-full max-w-md shadow-2xl shadow-amber-900/20 space-y-6">
        <button onClick={onBack} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">← Retour</button>
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-600/30">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Administration</h1>
          <p className="text-sm text-slate-400">Connexion SUPERADMIN</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500" placeholder="admin@restaurant.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500" placeholder="********" />
          </div>
        </div>
        {error && <div className="bg-rose-950/40 border border-rose-900/50 text-rose-200 text-sm px-4 py-3 rounded-xl">{error}</div>}
        <button onClick={handleLogin} disabled={loading || !email || !password} className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2">
          <LogIn className="h-5 w-5" /> {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </div>
    </div>
  );
}
