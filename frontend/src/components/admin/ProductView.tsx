import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, RefreshCw, Edit3, Trash2 } from 'lucide-react';
import { ProductModal } from '../common/ProductModal';
import api from '../../services/api';
import type { Product, IdLike } from '../../types';

export default function ProductView() {
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Product[]>('/catalog');
      setItems(res.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des produits :', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return items.filter((item) =>
      (item.name || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setShowModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (id: IdLike) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      await api.delete(`/catalog/${id}`);
      loadProducts();
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Erreur inconnue';
      alert(`Suppression échouée : ${message}`);
    }
  };

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('fr-FR').format(Number(price));
  };

  const categoryColor = (category: Product['category']) => {
    if (category?.color_code) return category.color_code;
    const palette = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];
    const key = String(category?.id || category?.name || 'general');
    const hash = [...key].reduce((total, character) => total + character.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  return (
    <div className="p-6 bg-slate-950 min-h-full text-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-amber-400" />
          <h2 className="text-xl font-black text-white">Gestion des Produits</h2>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
        >
          + Ajouter produit
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white flex-1 focus:outline-none focus:border-amber-400/50"
          placeholder="Rechercher un produit..."
        />
        <button
          onClick={loadProducts}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
            {loading ? 'Chargement des produits...' : 'Aucun produit trouvé.'}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-xl mb-3 shadow-md"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-32 bg-slate-950 rounded-xl mb-3 flex items-center justify-center text-slate-700 font-mono text-xs border border-slate-800/80">
                    Pas d'image
                  </div>
                )}
                <h3 className="font-bold text-white text-base mb-1">{product.name}</h3>
                <p className="text-sm font-semibold text-amber-400">
                  {formatPrice(product.base_price)} FCFA
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-md text-white border"
                    style={{
                      backgroundColor: `${categoryColor(product.category)}cc`,
                      borderColor: `${categoryColor(product.category)}88`,
                    }}
                  >
                    {product.category?.name || 'Général'}
                  </span>
                  <span className="text-xs text-slate-500">TVA {product.tax_rate}%</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800/60">
                <button
                  onClick={() => handleOpenEdit(product)}
                  className="p-1.5 rounded-lg bg-indigo-950/50 text-indigo-400 hover:bg-indigo-900/50 transition-colors"
                  title="Modifier"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-1.5 rounded-lg bg-rose-950/50 text-rose-400 hover:bg-rose-900/50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ProductModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadProducts}
        initialData={selectedProduct}
      />
    </div>
  );
}