import api from './api';

export interface ModifierOption {
  id: string;
  group_id?: string;
  name: string;
  price_override: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_selection: number;
  max_selection?: number;
  modifiers?: ModifierOption[];
}

export const modifierService = {
  // Option / Modificateur individuel
  async createModifier(data: { name: string; price: number; group_id: string }): Promise<ModifierOption> {
    const res = await api.post<ModifierOption>('/modifiers', data);
    return res.data;
  },

  // Groupe de modificateurs
  async getModifierGroups(): Promise<ModifierGroup[]> {
    const res = await api.get<ModifierGroup[]>('/modifiers/modifier-groups');
    return res.data || [];
  },

  async createModifierGroup(data: {
    name: string;
    is_required: boolean;
    min_selection: number;
    max_selection?: number;
  }): Promise<ModifierGroup> {
    const res = await api.post<ModifierGroup>('/modifiers/modifier-groups', data);
    return res.data;
  },
};

export default modifierService;