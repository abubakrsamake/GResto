import api from './api';
import type { DashboardStats } from '../types';

export type StatsPeriod = 'today' | 'week' | 'month';

export const statsService = {
  async getDashboard(period: StatsPeriod): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/stats/dashboard', {
      params: { period },
    });
    return response.data;
  },
};

export default statsService;
