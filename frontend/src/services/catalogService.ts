import api from './api';
import type { Category, Product, IdLike } from '../types';

export interface ProductPayload {
  name: string;
  sku?: string;
  description?: string | null;
  image_url?: string | null;
  base_price: number;
  tax_rate?: number;
  is_active?: boolean;
  category_id: IdLike;
  modifier_group_ids?: IdLike[];
}

export const catalogService = {
  async listProducts(categoryId?: IdLike): Promise<Product[]> {
    const response = await api.get<Product[]>('/catalog/products', {
      params: categoryId ? { category_id: categoryId } : undefined,
    });
    return response.data;
  },

  async listCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>('/catalog/categories');
    return response.data;
  },

  async getProduct(productId: IdLike): Promise<Product> {
    const response = await api.get<Product>(`/catalog/${productId}`);
    return response.data;
  },

  async createProduct(payload: ProductPayload): Promise<Product> {
    const response = await api.post<Product>('/catalog', payload);
    return response.data;
  },

  async updateProduct(productId: IdLike, payload: Partial<ProductPayload>): Promise<Product> {
    const response = await api.put<Product>(`/catalog/${productId}`, payload);
    return response.data;
  },

  async uploadProductImage(productId: IdLike, file: File): Promise<Product> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<Product>(`/catalog/products/${productId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteProduct(productId: IdLike): Promise<void> {
    await api.delete(`/catalog/${productId}`);
  },
};

export default catalogService;
