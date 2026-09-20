import api from './api';

export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CREDIT_CARD';

export interface PaymentRequest {
  order_id: string;
  payment_method: PaymentMethod;
  amount_tendered: number;
  reference_code?: string;
}

export interface PaymentOrderItem {
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

export interface PaymentOrder {
  id: string;
  order_number: string;
  pos_id: string;
  register_session_id: string;
  user_id?: string;
  table_id?: string | null;
  order_type: 'DINE_IN' | 'TAKEOUT';
  status: string;
  total_ht: number;
  total_tax: number;
  total_ttc: number;
  discount_amount?: number;
  notes?: string;
  items: PaymentOrderItem[];
  payments?: Array<{
    id: string;
    payment_method: string;
    amount: number;
    status?: string;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentResponse {
  order: PaymentOrder;
  change_given: number;
  is_fully_paid: boolean;
  receipt_text: string;
}

export const paymentService = {
  async processPayment(payload: PaymentRequest): Promise<PaymentResponse> {
    const response = await api.post<PaymentResponse>('/payments/checkout', payload);
    return response.data;
  },

  async getReceiptRaw(orderId: string): Promise<Blob> {
    const response = await api.get(`/orders/${orderId}/receipt/raw`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default paymentService;
