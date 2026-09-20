import { Search, RefreshCw, Layers, Plus } from 'lucide-react';
import type { Product } from '../../store/usePosStore';

interface Category {
  id: string | number;
  name: string;
  color_code?: string | null;
}

interface ProductCatalogProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  searchQuery: string;
  selectedCategory: string;
  onSearchChange: (query: string) => void;
  onSelectCategory: (catId: string) => void;
  onRefresh: () => void;
  onProductClick: (product: Product) => void;
}

export default function ProductCatalog({
  products,
  categories,
  loading,
  searchQuery,
  selectedCategory,
  onSearchChange,
  onSelectCategory,
  onRefresh,
  onProductClick
}: ProductCatalogProps) {
  const categoryColor = (category: Category | undefined) => {
    if (category?.color_code) return category.color_code;
    const palette = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];
    const key = String(category?.id || category?.name || 'general');
    const hash = [...key].reduce((total, character) => total + character.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || String(p.category_id) === String(selectedCategory);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col p-4 border-r border-slate-800 min-w-0 overflow-hidden h-full">
      {/* Recherche */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 text-lg"
          />
        </div>
        <button 
          onClick={onRefresh}
          className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition shrink-0"
        >
          <RefreshCw className={`h-6 w-6 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filtres Catégories */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none shrink-0 w-full">
        <button
          onClick={() => onSelectCategory('ALL')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition shrink-0 ${
            selectedCategory === 'ALL' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Tous les articles
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(String(cat.id))}
            style={selectedCategory === String(cat.id) ? { backgroundColor: categoryColor(cat), boxShadow: `0 8px 20px ${categoryColor(cat)}55` } : { borderColor: `${categoryColor(cat)}66` }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition shrink-0 border ${selectedCategory === String(cat.id) ? 'text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grille Produits */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-1 min-h-0 pb-4">
        {filteredProducts.map((product) => {
          const imageUrl = (product as any).image_url || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80';
          const hasOptions = (product.variants?.length || 0) > 0 || (product.modifier_groups?.length || 0) > 0;

          return (
            <div
              key={product.id}
              onClick={() => onProductClick(product)}
              className="bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/80 rounded-2xl p-4 flex flex-col justify-between cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md relative"
            >
              <div>
                <div className="flex justify-between items-start gap-1">
                  <span className="text-xs font-semibold px-2 py-1 rounded-md text-white truncate" style={{ backgroundColor: `${categoryColor(categories.find((category) => String(category.id) === String(product.category_id)))}cc` }}>
                    {(product as any).category_name || 'Général'}
                  </span>
                  {hasOptions && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                      <Layers className="h-3 w-3" /> Options
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-slate-100 mt-2 line-clamp-2">{product.name}</h3>
                <img src={imageUrl} alt={product.name} className="w-full h-24 object-cover rounded-xl mb-2 mt-2 shadow-md" loading="lazy" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-lg md:text-xl font-black text-indigo-400 truncate">
                  {Number(product.base_price).toLocaleString()} FCFA
                </span>
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg shrink-0">
                  <Plus className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}