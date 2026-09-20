import api from './api';
import type { PointOfSale, User, UserRole, IdLike } from '../types';

export interface UserPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  username?: string;
  role_id: IdLike;
  pin_code?: string;
  password?: string;
  is_active?: boolean;
  pos_ids?: string[];
}

export const userService = {
  async list(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async listRoles(): Promise<UserRole[]> {
    const response = await api.get<UserRole[]>('/users/roles');
    return response.data;
  },

  async listPointsOfSale(): Promise<PointOfSale[]> {
    const response = await api.get<PointOfSale[]>('/pos/');
    return response.data;
  },

  async create(payload: UserPayload): Promise<User> {
    const response = await api.post<User>('/users', payload);
    return response.data;
  },

  async update(userId: IdLike, payload: Partial<UserPayload>): Promise<User> {
    const response = await api.put<User>(`/users/${userId}`, payload);
    return response.data;
  },

  async remove(userId: IdLike): Promise<void> {
    await api.delete(`/users/${userId}`);
  },
};

export default userService;
