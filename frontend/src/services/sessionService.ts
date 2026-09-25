import api from './api';

export interface Register {
  id: string;
  name: string;
  pos_id?: string;
  is_active?: boolean;
}
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

  // Récupérer la liste des caisses enregistrées en base
  async getRegisters(): Promise<Register[]> {
    const response = await api.get<Register[]>('/registers/');
    return response.data || [];
  },

  // Lister les sessions ouvertes
  async listOpen(): Promise<RegisterSession[]> {
    const response = await api.get<RegisterSession[]>('/sessions/');
    return response.data;
  },

  // Récupérer les détails d'une session spécifique par son ID
  async get(sessionId: string): Promise<RegisterSession> {
    const response = await api.get<RegisterSession>(`/sessions/${sessionId}`);
    return response.data;
  },

  // Ouvrir une session
  async open(payload: OpenSessionPayload): Promise<RegisterSession> {
    const response = await api.post<RegisterSession>('/sessions/', payload);
    return response.data;
  },

  // Clôturer une session
  async close(payload: CloseSessionPayload): Promise<RegisterSession> {
    const response = await api.post<RegisterSession>('/sessions/close', payload);
    return response.data;
  },
};

export default sessionService;
