// src/types/pywebview.ts

export interface OrderItemPrintData {
  name: string;
  qty: number;
  total: number;
}

export interface OrderPrintData {
  orderId: string;
  items: OrderItemPrintData[];
  subtotal: number;
  tax: number;
  total: number;
  amountTendered: number;
  changeGiven: number;
  paymentMethod: string;
}

// Extension du type global Window
declare global {
  interface Window {
    pywebview?: {
      api: {
        print_receipt: (data: OrderPrintData) => Promise<{ success: boolean; message?: string }>;
        open_cash_drawer: () => Promise<{ success: boolean; error?: string }>;
        print_order_receipt?: (orderId: string, token: string) => Promise<{
          success: boolean;
          message?: string;
          error?: string;
        }>;
      };
    };
  }
}