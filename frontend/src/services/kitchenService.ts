import api from './api';
import type { KitchenOrder, OrderStatus, IdLike } from '../types';

export type KitchenStatus = Extract<OrderStatus, 'PENDING' | 'IN_PREPARATION' | 'READY'>;

export interface KitchenOrdersParams {
  pos_id?: string;
  status_filter?: KitchenStatus[];
}

export const kitchenService = {
  async listOrders(params?: KitchenOrdersParams): Promise<KitchenOrder[]> {
    const response = await api.get<KitchenOrder[]>('/orders', {
      params: params
        ? {
            ...params,
            status_filter: params.status_filter?.join(','),
          }
        : undefined,
    });
    return response.data;
  },

  async updateOrderStatus(orderId: IdLike, status: KitchenStatus): Promise<void> {
    await api.patch(`/orders/${orderId}/status`, { status });
  },
};

export default kitchenService;
