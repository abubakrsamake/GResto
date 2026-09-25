import api from './api';
import type { PointOfSale } from '../types';

export interface Product {
  id: string | number;
  name: string;
  base_price: number;
  category_id?: string | number;
  category_name?: string;
  variants?: any[];
  modifier_groups?: any[];
  is_active?: boolean;
  tax_rate?: number;
}

export interface Category {
  id: string | number;
  name: string;
}

export interface OrderItemPayload {
  product_id: string | number;
  quantity: number;
  notes?: string;
  modifiers?: Array<{ modifier_id: string | number; modifier_name?: string; price?: number }>;
  variant_id?: string | number | null;
}

export interface OrderCreatePayload {
  pos_id: string;
  register_session_id: string;
  order_type: 'DINE_IN' | 'TAKEOUT';
  items: OrderItemPayload[];
  table_id?: string;
  notes?: string;
}

export interface OrderResponse {
  id: string;
  order_number: string;
  status: string;
  total_ttc: number;
  total_ht: number;
  total_tax: number;
  items: any[];
}

export interface PaymentPayload {
  order_id: string;
  payment_method: 'CASH' | 'MOBILE_MONEY';
  amount_tendered: number;
  reference_code?: string;
}

export interface PaymentResponse {
  order: OrderResponse;
  change_given: number;
  is_fully_paid: boolean;
  receipt_text: string;
}

export const posService = {
  fetchPointsOfSale: async (): Promise<PointOfSale[]> => {
    const response = await api.get<PointOfSale[]>('/pos/');
    return response.data;
  },

  fetchCatalog: async () => {
    const [resProd, resCat] = await Promise.all([
      api.get<Product[]>('/catalog/products'),
      api.get<Category[]>('/catalog/categories'),
    ]);
    const products = resProd.data.map((product) => ({
      ...product,
      modifier_groups: (product.modifier_groups || []).map((group: any) => ({
        ...group,
        options: (group.options || group.modifiers || []).map((modifier: any) => ({
          ...modifier,
          price: Number(modifier.price ?? modifier.price_override ?? 0),
        })),
      })),
    }));
    return { products, categories: resCat.data as Category[] };
  },

  createOrder: async (payload: OrderCreatePayload) => {
    const res = await api.post<OrderResponse>('/orders', payload);
    return res.data;
  },

  processPayment: async (payload: PaymentPayload) => {
    const res = await api.post<PaymentResponse>('/payments/checkout', payload);
    return res.data;
  },

  getReceiptRaw: async (orderId: string) => {
    const res = await api.get(`/orders/${orderId}/receipt/raw`, { responseType: 'blob' });
    return res.data;
  },
};
