import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, RefreshCw, Edit3, Trash2, Plus, Layers, PlusCircle } from 'lucide-react';
import { CreateProductModal } from '../common/CreateProductModal';
import { CreateModifierModal } from '../common/CreateModifierModal';
import { CreateModifierGroupModal } from '../common/CreateModifierGroupModal';
import api from '../../services/api';
import type { Product, IdLike } from '../../types';

export default function ProductView() {
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // ÉTATS DES 3 MODAUX
  const [showProductModal, setShowProductModal] = useState(false);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [showModifierGroupModal, setShowModifierGroupModal] = useState(false);
  
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

  const handleOpenCreateProduct = () => {
    setSelectedProduct(null);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleDelete = async (id: IdLike) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      await api.delete(`/catalog/${id}`);
      loadProducts();
    } catch (err: any) {
      alert(`Suppression échouée : ${err.response?.data?.detail || err.message}`);
    }
  };

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('fr-FR').format(Number(price));
  };

  return (
    <div className="p-6 bg-slate-950 min-h-full text-slate-100">
      {/* En-tête avec les 3 BOUTONS D'ACTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-amber-400" />
          <h2 className="text-xl font-black text-white">Gestion des Produits & Options</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton 1 : Créer un groupe d'options */}
          <button
            onClick={() => setShowModifierGroupModal(true)}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            + Groupe d'options
          </button>

          {/* Bouton 2 : Créer un modificateur/accompagnement */}
          <button
            onClick={() => setShowModifierModal(true)}
            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
             Option
          </button>

          {/* Bouton 3 : Créer un Produit */}
          <button
            onClick={handleOpenCreateProduct}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-500/10 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
             Produit
          </button>
        </div>
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

      {/* Grille d'affichage des produits */}
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
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-800/60">
                <button
                  onClick={() => handleOpenEditProduct(product)}
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

      {/* Rendu des 3 Modaux */}
      <CreateProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={loadProducts}
        initialData={selectedProduct}
      />

      <CreateModifierModal
        isOpen={showModifierModal}
        onClose={() => setShowModifierModal(false)}
        onSuccess={loadProducts}
      />

      <CreateModifierGroupModal
        isOpen={showModifierGroupModal}
        onClose={() => setShowModifierGroupModal(false)}
        onSuccess={loadProducts}
      />
    </div>
  );
}