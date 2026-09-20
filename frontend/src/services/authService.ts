import api from './api';

export interface AuthRole {
  id?: string | number;
  code?: string;
  name?: string;
}

export interface AuthUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  role?: AuthRole | string;
  code?: string;
  user_code?: string;
  employee_id?: string;
  is_active?: boolean;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user?: AuthUser;
  active_pos_id?: string | null;
}

export const authService = {
  storeSession(data: AuthTokenResponse) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('token', data.access_token);

    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }

    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  },

  clearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getAccessToken(): string | null {
    return localStorage.getItem('access_token') ?? localStorage.getItem('token');
  },

  async loginWithEmail(email: string, password: string): Promise<AuthTokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post<AuthTokenResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.storeSession(response.data);
    return response.data;
  },

  async loginWithPin(posId: string, pinCode: string, email?: string): Promise<AuthTokenResponse> {
    const response = await api.post<AuthTokenResponse>('/auth/login-pin', {
      pos_id: posId,
      pin_code: pinCode,
      ...(email ? { email } : {}),
    });

    this.storeSession(response.data);
    return response.data;
  },

  async getCurrentUser(): Promise<AuthUser> {
    const response = await api.get<AuthUser>('/auth/me');
    return response.data;
  },

  async heartbeat(): Promise<void> {
    await api.post('/auth/heartbeat');
  },

  async logout(): Promise<void> {
    if (!this.getAccessToken()) return;
    await api.post('/auth/logout');
  },

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const response = await api.post<{ access_token: string; refresh_token?: string }>('/auth/refresh', {
      refresh_token: refreshToken,
    });

    const accessToken = response.data.access_token;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('token', accessToken);

    if (response.data.refresh_token) {
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }

    return accessToken;
  },
};

export default authService;
