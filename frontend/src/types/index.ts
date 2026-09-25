export type IdLike = string | number;

export interface Category {
  id: IdLike;
  name: string;
  color_code?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface Product {
  id: IdLike;
  name: string;
  sku?: string;
  description?: string | null;
  base_price: number | string;
  category_id?: IdLike;
  category?: Category | null;
  tax_rate?: number | string;
  image_url?: string | null;
  is_active?: boolean;
  variants?: Array<{ id: IdLike; name?: string; price_override?: number }>; 
  modifier_groups?: Array<{ id: IdLike; name?: string; options?: Array<{ id: IdLike; name?: string; price?: number }> }>;
}

export interface UserRole {
  id?: IdLike;
  code?: string;
  label?: string;
  name?: string;
}

export interface User {
  id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  username?: string;
  role?: UserRole | string;
  role_id?: IdLike;
  code?: string;
  pin_code?: string;
  password?: string;
  is_active?: boolean;
  last_seen_at?: string | null;
  is_online?: boolean;
  pos_ids?: string[];
}

export interface PointOfSale {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

export interface Order {
  id: string;
  order_number?: string | number;
  order_type?: string;
  status?: string;
  user?: Partial<User> | null;
  table?: { id?: IdLike; name?: string; number?: string | number; } | null;
  total_ttc?: number | string;
  total_ht?: number | string;
  total_tax?: number | string;
  discount_amount?: number | string;
  created_at?: string;
  updated_at?: string;
  items?: Array<{
    id?: IdLike;
    product_name?: string;
    variant_name?: string | null;
    quantity?: number;
    unit_price?: number | string;
    total_price?: number | string;
    modifiers?: Array<{ id: IdLike; name: string; price?: number | string }> | null;
    notes?: string | null;
  }>;
  payments?: Payment[];
}

export interface Payment {
  id: IdLike;
  payment_method: string;
  reference_code?: string | null;
  amount: number | string;
  status?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'IN_PREPARATION'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface KitchenOrder extends Order {
  id: string;
  order_number: string | number;
  order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  table_number?: string | number | null;
  status: OrderStatus;
  created_at: string;
  items: NonNullable<Order['items']>;
}

export interface InvoiceItem {
  product_name?: string;
  name?: string;
  title?: string;
  quantity?: number;
  qty?: number;
  unit_price?: number;
  price_ttc?: number;
  price?: number;
  total?: number;
  subtotal?: number;
  amount?: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  order_number: string;
  status: string;
  total_ttc: number;
  subtotal?: number;
  tax?: number;
  created_at: string;
  pos_id?: string;
  payment_method?: string;
  change_given?: number;
  amount_tendered?: number;
  items?: InvoiceItem[];
}

export interface RegisterSession {
  id: string;
  status: string;
  created_at: string;
  opening_amount: number;
}

export interface DailySalesPoint {
  time: string;
  total: number;
}

export interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

export interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  average_basket: number;
  peak_hour: string;
  revenue_growth_percent: number;
  sales_chart: DailySalesPoint[];
  top_products: TopProduct[];
  payment_methods: Array<{ method: string; amount: number; count: number }>;
  order_types: Array<{ order_type: string; total: number; count: number }>;
  total_tax: number;
  cancelled_orders: number;
  orders_chart: DailySalesPoint[];
}
