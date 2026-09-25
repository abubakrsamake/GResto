import React, { useState, useEffect, type ChangeEvent, type SubmitEvent } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, X } from 'lucide-react';
import api from '../../services/api';
import catalogService from '../../services/catalogService';
import modifierService, { type ModifierGroup } from '../../services/modifierService';
import type { Category, Product } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Product | null;
}

export const CreateProductModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [formObj, setFormObj] = useState<Partial<Product>>({ name: '', base_price: 0, tax_rate: 18 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEdit = Boolean(initialData?.id);

  useEffect(() => {
    if (!isOpen) return;

    const loadDependencies = async () => {
      try {
        const [catRes, groupsData] = await Promise.all([
          api.get<Category[]>('/catalog/categories'),
          modifierService.getModifierGroups()
        ]);
        setCategories(catRes.data || []);
        setModifierGroups(groupsData || []);
       
      } catch (err) {
        console.error('Erreur de chargement des données :', err);
      }
    };

    loadDependencies();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormObj({
        name: initialData.name || '',
        sku: initialData.sku || '',
        description: initialData.description || '',
        base_price: initialData.base_price ?? 0,
        tax_rate: initialData.tax_rate ?? 18,
        image_url: initialData.image_url || '',
        category_id: initialData.category_id || initialData.category?.id || '',
      });
      setImagePreview(initialData.image_url || null);
      //setSelectedGroupIds(initialData.modifier_groups?.map(g => g.id) || []);
      setSelectedGroupIds(initialData.modifier_groups?.map((g) => String(g.id)) || []
);
    } else {
      setFormObj({ name: '', base_price: 0, tax_rate: 18, category_id: categories[0]?.id || '' });
      setImagePreview(null);
      setSelectedGroupIds([]);
    }
    setImageFile(null);
    setError(null);
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...formObj,
      base_price: Number(formObj.base_price) || 0,
      tax_rate: Number(formObj.tax_rate) || 0,
      modifier_group_ids: selectedGroupIds
    };

    try {
      let savedProduct: Product;
      if (isEdit && initialData?.id) {
        const response = await api.put<Product>(`/catalog/${initialData.id}`, payload);
        savedProduct = response.data;
      } else {
        const response = await api.post<Product>('/catalog/', payload);
        savedProduct = response.data;
      }

      if (imageFile && savedProduct.id) {
        await catalogService.uploadProductImage(savedProduct.id, imageFile);
      }
      toast.success('Modification effectuée avec succès !');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'enregistrement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-4">
          {isEdit ? 'Modifier Produit' : 'Nouveau Produit'}
        </h3>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-medium">Nom du Produit</label>
            <input
              type="text"
              required
              value={formObj.name || ''}
              onChange={(e) => setFormObj(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium">Catégorie</label>
              <select
                value={formObj.category_id || ''}
                onChange={(e) => setFormObj(p => ({ ...p, category_id: e.target.value }))}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">Choisir une catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium">Prix (FCFA)</label>
              <input
                type="number"
                required
                min="0"
                value={formObj.base_price ?? ''}
                onChange={(e) => setFormObj(p => ({ ...p, base_price: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          {/* SÉLECTION DES GROUPES D'OPTIONS / ACCOMPAGNEMENTS */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">Groupes d'options associés</label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-800 p-2 rounded-lg bg-slate-950">
              {modifierGroups.length === 0 ? (
                <p className="text-xs text-slate-500">Aucun groupe créé pour le moment.</p>
              ) : (
                modifierGroups.map((group) => {
                  const isChecked = selectedGroupIds.includes(group.id);
                  return (
                    <label key={group.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-900 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGroup(group.id)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-xs text-slate-200">{group.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Image du produit</label>
            <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-2">
              <ImagePlus className="h-5 w-5 text-amber-400" />
              <span className="text-xs text-slate-300">Choisir une image</span>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }} className="hidden" />
            </label>
            {imagePreview && <img src={imagePreview} alt="Aperçu" className="mt-2 h-20 w-full rounded-lg object-cover" />}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-sm">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-sm">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};