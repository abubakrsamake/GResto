import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import authService from '../services/authService';
import { posService } from '../services/posService';
import type { PointOfSale } from '../types';
import { LogIn, Store, Lock, KeyRound, Delete, ShieldCheck } from 'lucide-react';

export interface Role {
  id: string;
  code: string;
  name?: string;
}

export interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: Role | string;
  code?: string;
}

export interface LoginPinResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user?: User;
}

interface LoginProps {
  onLoginSuccess: (token: string, userName: string, userRole?: string, userCode?: string) => void;
  onAdminClick?: () => void;
}

export default function LoginView({ onLoginSuccess, onAdminClick }: LoginProps) {
  const [pinCode, setPinCode] = useState('');
  const [sellerEmail, setSellerEmail] = useState('');
  const [pointsOfSale, setPointsOfSale] = useState<PointOfSale[]>([]);
  const [posId, setPosId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPointsOfSale = async () => {
      try {
        const loadedPointsOfSale = await posService.fetchPointsOfSale();
        setPointsOfSale(loadedPointsOfSale);
        setPosId((currentPosId) => currentPosId || loadedPointsOfSale[0]?.id || '');
      } catch {
        setError('Impossible de charger les postes de vente actifs.');
      }
    };

    loadPointsOfSale();
  }, []);

  // Gestion des touches du clavier physique (1-9, Backspace, Enter)
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pinCode.length < 6) {
          setPinCode((prev) => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        setPinCode((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pinCode && !loading) {
          handleLogin();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [pinCode, loading]);

  const handleLogin = async () => {
    if (!pinCode || !posId || loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await authService.loginWithPin(posId, pinCode, sellerEmail.trim() || undefined);
      const { access_token, user } = response;

      let rawRole = 'CASHIER';
      if (user?.role) {
        if (typeof user.role === 'object') {
          rawRole = user.role.code || 'CASHIER';
        } else {
          rawRole = user.role;
        }
      }

      const normalizedRole = rawRole.toUpperCase().includes('ADMIN') ? 'SUPERADMIN' : 'CASHIER';
      const userName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'Caissier';
      const userCode = user?.code || `C-${user?.id?.slice(0, 4) || '001'}`;

      onLoginSuccess(access_token, userName, normalizedRole, userCode);
    } catch (e) {
      const err = e as AxiosError<{ detail?: string; message?: string }>;
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Code PIN invalide';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleNumpadClick = (digit: string) => {
    if (pinCode.length < 6) {
      setPinCode((prev) => prev + digit);
    }
  };

  const handleClearPin = () => {
    setPinCode('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-start sm:items-center justify-center font-sans select-none overflow-y-auto p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 w-full max-w-md shadow-2xl shadow-indigo-900/20 space-y-5 sm:space-y-6 my-2 sm:my-0">
        
        {/* En-tête */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Store className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">GRestaurant</h1>
          <p className="text-xs text-slate-400">Connexion au terminal POS</p>
        </div>

        {/* Champs de Saisie */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Code PIN
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="password"
                placeholder="Entrez votre PIN"
                value={pinCode}
                readOnly
                className="w-full bg-slate-950 text-white text-center tracking-[0.5em] text-xl pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition cursor-default"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Email vendeur <span className="normal-case text-slate-500">(si PIN partagé)</span>
            </label>
            <input
              type="email"
              placeholder="vendeur@restaurant.com"
              value={sellerEmail}
              onChange={(e) => setSellerEmail(e.target.value)}
              className="w-full bg-slate-950 text-white pl-4 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Point de Vente
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <select
                value={posId}
                onChange={(e) => setPosId(e.target.value)}
                disabled={pointsOfSale.length === 0}
                className="w-full bg-slate-800/40 text-slate-200 pl-9 pr-4 py-2.5 rounded-xl border border-slate-800/80 text-sm focus:outline-none focus:border-indigo-500"
              >
                {pointsOfSale.length === 0 ? (
                  <option value="">Aucun poste disponible</option>
                ) : (
                  pointsOfSale.map((pointOfSale) => (
                    <option key={pointOfSale.id} value={pointOfSale.id}>
                      {pointOfSale.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Clavier Numérique Tactile */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleNumpadClick(digit)}
              className="py-3 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-lg rounded-xl transition border border-slate-700/50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearPin}
            className="py-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs rounded-xl transition border border-rose-900/40 flex items-center justify-center gap-1"
          >
            <Delete className="h-4 w-4" /> Effacer
          </button>
          <button
            type="button"
            onClick={() => handleNumpadClick('0')}
            className="py-3 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-lg rounded-xl transition border border-slate-700/50"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || !pinCode || !posId}
            className="py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800/50 disabled:text-slate-600 text-white font-bold text-sm rounded-xl transition border border-indigo-500/30 flex items-center justify-center"
          >
            <LogIn className="h-5 w-5" />
          </button>
        </div>

        {/* Erreurs API */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-900/50 text-rose-200 text-xs px-4 py-2.5 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Connexion Admin */}
        {onAdminClick && (
          <button
            type="button"
            onClick={onAdminClick}
            className="w-full text-center text-xs text-amber-400 hover:text-amber-300 transition flex items-center justify-center gap-1.5 pt-1"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Connexion Administrateur (Email/Mot de passe)
          </button>
        )}
      </div>
    </div>
  );
}