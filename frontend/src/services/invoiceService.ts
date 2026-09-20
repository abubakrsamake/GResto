import api from './api';
import type { Invoice } from '../types';

export const invoiceService = {
  async list(): Promise<Invoice[]> {
    const response = await api.get<Invoice[]>('/invoices/');
    return response.data;
  },

  async getReceipt(orderId: string): Promise<Blob> {
    const response = await api.get(`/payments/${orderId}/receipt/raw`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default invoiceService;
