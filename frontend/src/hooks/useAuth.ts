import { useEffect, useState } from 'react';
import authService, { type AuthUser } from '../services/authService';

export type AppRole = 'SUPERADMIN' | 'CASHIER';

export interface AuthState {
  name: string;
  role: AppRole;
  code: string;
}

const emptyAuthState: AuthState = {
  name: '',
  role: 'CASHIER',
  code: '',
};

const normalizeRole = (rawRole: unknown): AppRole => {
  const role = String(
    typeof rawRole === 'object' && rawRole !== null && 'code' in rawRole
      ? rawRole.code
      : rawRole || '',
  ).toUpperCase();

  return role === 'SUPERADMIN' || role === 'ADMIN' ? 'SUPERADMIN' : 'CASHIER';
};

const mapUser = (user: AuthUser): AuthState => ({
  name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email || 'Utilisateur',
  role: normalizeRole(user.role),
  code: user.code || user.user_code || user.employee_id || `#${user.id || '---'}`,
});

export function useAuth() {
  const [user, setUser] = useState<AuthState>(emptyAuthState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      if (!authService.getAccessToken()) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (mounted) {
          setUser(mapUser(currentUser));
          setIsAuthenticated(true);
        }
      } catch {
        authService.clearSession();
        if (mounted) {
          setUser(emptyAuthState);
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const sendHeartbeat = () => {
      authService.heartbeat().catch(() => undefined);
    };
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 30_000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated]);

  const completeLogin = async (token: string, name: string, role?: string, code?: string) => {
    localStorage.setItem('token', token);

    if (name && name !== 'Marie' && name !== 'Admin') {
      const nextUser = {
        name,
        role: normalizeRole(role),
        code: code || '---',
      };
      setUser(nextUser);
      setIsAuthenticated(true);
      return nextUser;
    }

    const currentUser = await authService.getCurrentUser();
    const nextUser = mapUser(currentUser);
    setUser(nextUser);
    setIsAuthenticated(true);
    return nextUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // La session locale doit être supprimée même si le serveur est indisponible.
    }
    authService.clearSession();
    setUser(emptyAuthState);
    setIsAuthenticated(false);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    completeLogin,
    logout,
  };
}

export default useAuth;
