import api from './api';

export interface RegisterSession {
  id: string;
  register_id?: string;
  status: string;
  opening_amount: number;
  expected_amount?: number | null;
  actual_amount?: number | null;
  created_at?: string;
  closing_time?: string | null;
  order_count?: number;
}

export interface OpenSessionPayload {
  register_id: string;
  opening_amount: number;
}

export interface CloseSessionPayload {
  session_id: string;
  actual_amount: number;
  notes?: string | null;
}

export const sessionService = {
  async listOpen(): Promise<RegisterSession[]> {
    const response = await api.get<RegisterSession[]>('/sessions/');
    return response.data;
  },

  async get(sessionId: string): Promise<RegisterSession> {
    const response = await api.get<RegisterSession>(`/sessions/${sessionId}`);
    return response.data;
  },

  async open(payload: OpenSessionPayload): Promise<RegisterSession> {
    const response = await api.post<RegisterSession>('/sessions/', payload);
    return response.data;
  },

  async close(payload: CloseSessionPayload): Promise<RegisterSession> {
    const response = await api.post<RegisterSession>('/sessions/close', payload);
    return response.data;
  },
};

export default sessionService;
