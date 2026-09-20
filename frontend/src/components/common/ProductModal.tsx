import React, { useState, useEffect, type ChangeEvent, type SubmitEvent } from 'react';import { ImagePlus, X } from 'lucide-react';
import api from '../../services/api';
import catalogService from '../../services/catalogService';
import type { Category, Product } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Product | null;
}

const DEFAULT_FORM_STATE: Partial<Product> = {
  name: '',
  sku: '',
  description: '',
  base_price: 0,
  tax_rate: 18,
  image_url: '',
  category_id: '',
};

export const ProductModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formObj, setFormObj] = useState<Partial<Product>>(DEFAULT_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEdit = Boolean(initialData?.id);

  // Chargement des catégories à l'ouverture du modal
  useEffect(() => {
    if (!isOpen) return;

    const fetchCategories = async () => {
      try {
        const res = await api.get<Category[]>('/catalog/categories');
        setCategories(res.data || []);
      } catch (err) {
        console.error('Erreur lors du chargement des catégories :', err);
      }
    };

    fetchCategories();
  }, [isOpen]);

  // Initialisation du formulaire
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
    } else {
      setFormObj({
        ...DEFAULT_FORM_STATE,
        category_id: categories[0]?.id || '',
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setError(null);
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormObj((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...formObj,
      sku: typeof formObj.sku === 'string' ? formObj.sku.trim() || undefined : formObj.sku,
      description: typeof formObj.description === 'string' ? formObj.description.trim() || undefined : formObj.description,
      image_url: typeof formObj.image_url === 'string' ? formObj.image_url.trim() || undefined : formObj.image_url,
      base_price: Number(formObj.base_price) || 0,
      tax_rate: Number(formObj.tax_rate) || 0,
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
      if (imageFile && savedProduct.id) await catalogService.uploadProductImage(savedProduct.id, imageFile);
      onSuccess();
      onClose();
    } catch (err: any) {
      const apiMessage = err.response?.data?.detail || 'Une erreur est survenue lors de l\'enregistrement.';
      setError(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={onClose} 
          type="button"
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-4">
          {isEdit ? 'Modifier Produit' : 'Nouveau Produit'}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-medium">Nom du Produit</label>
            <input
              type="text"
              name="name"
              required
              value={formObj.name || ''}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Catégorie</label>
            <select
              name="category_id"
              value={formObj.category_id || ''}
              onChange={handleChange}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            >
              <option value="">-- Sélectionner une catégorie --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Prix de base (FCFA)</label>
            <input
              type="number"
              name="base_price"
              required
              min="0"
              step="any"
              value={formObj.base_price ?? ''}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Taux TVA (%)</label>
            <input
              type="number"
              name="tax_rate"
              required
              min="0"
              step="any"
              value={formObj.tax_rate ?? ''}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Image du produit</label>
            <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-3 hover:border-amber-400/60">
              <ImagePlus className="h-5 w-5 text-amber-400" />
              <span className="text-xs text-slate-300">Choisir une image (5 Mo max)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
            </label>
            {imagePreview && <img src={imagePreview} alt="Aperçu" className="mt-2 h-24 w-full rounded-lg object-cover" />}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-sm transition-all"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};