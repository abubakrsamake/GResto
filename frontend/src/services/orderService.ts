import api from './api';

export type OrderType = 'DINE_IN' | 'TAKEOUT';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'PAID'
  | 'CANCELLED';

export interface OrderModifierPayload {
  modifier_id: string | number;
  modifier_name?: string;
  price?: number;
}

export interface OrderItemPayload {
  product_id: string | number;
  quantity: number;
  notes?: string;
  modifiers?: OrderModifierPayload[];
  variant_id?: string | number | null;
}

export interface OrderCreatePayload {
  pos_id: string;
  register_session_id: string;
  order_type: OrderType;
  items: OrderItemPayload[];
  table_id?: string;
  notes?: string;
}

export interface OrderItemResponse {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  subtotal_ttc: number;
  notes?: string;
  item_status?: string;
  selected_modifiers?: Array<{
    id: string;
    modifier_id: string;
    modifier_name: string;
    unit_price?: number;
  }>;
}

export interface OrderResponse {
  id: string;
  order_number: string;
  pos_id: string;
  register_session_id: string;
  user_id?: string;
  table_id?: string | null;
  order_type: OrderType;
  status: OrderStatus;
  total_ht: number;
  total_tax: number;
  total_ttc: number;
  discount_amount?: number;
  notes?: string;
  items: OrderItemResponse[];
  payments?: Array<{
    id: string;
    payment_method: string;
    amount: number;
    status?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface OrdersListParams {
  pos_id?: string;
  status_filter?: string[];
  date?: string;
}

export const orderService = {
  async getOrders(params?: OrdersListParams): Promise<OrderResponse[]> {
    const response = await api.get<OrderResponse[]>('/orders', { params });
    return response.data;
  },

  async getOrderById(orderId: string): Promise<OrderResponse> {
    const response = await api.get<OrderResponse>(`/orders/${orderId}`);
    return response.data;
  },

  async createOrder(payload: OrderCreatePayload): Promise<OrderResponse> {
    const response = await api.post<OrderResponse>('/orders', payload);
    return response.data;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderResponse> {
    const response = await api.patch<OrderResponse>(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  async cancelOrder(orderId: string): Promise<OrderResponse> {
    return this.updateOrderStatus(orderId, 'CANCELLED');
  },

  async getOrdersByDate(date: string): Promise<OrderResponse[]> {
    return this.getOrders({ date });
  },

  async getOrdersByStatus(status: OrderStatus[]): Promise<OrderResponse[]> {
    return this.getOrders({ status_filter: status });
  },

  async getReceiptRaw(orderId: string): Promise<Blob> {
    const response = await api.get(`/orders/${orderId}/receipt/raw`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default orderService;
