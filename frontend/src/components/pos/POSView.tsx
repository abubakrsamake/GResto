import { useState, useEffect } from 'react';
import { 
  ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  Banknote, Search, RefreshCw, Layers, X, Printer,
  Delete, RotateCcw
} from 'lucide-react';
import { posService } from '../../services/posService';
import paymentService from '../../services/paymentService';
import CustomizationModal from './CustomizationModal';
import InvoiceView from '../common/InvoiceView';
import { usePosStore,  } from '../../store/usePosStore';
import type { Product, Variant, Category, ModifierOption } from '../../store/usePosStore';
import type { InvoiceData } from '../common/InvoiceView';
import useCart from '../../hooks/useCart';
import useDebounce from '../../hooks/useDebounce';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Composant POSView
// ---------------------------------------------------------------------------

export default function POSView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // États du POS et de la session
  const [activePosId] = useState<string>('ac5a66d4-42c3-4347-a7e7-969d7beef108');
  const [activeSessionId] = useState<string>('299238eb-c0f8-433d-82ec-b9cab3ba69b9');
  const [orderType] = useState<'DINE_IN' | 'TAKEOUT'>('DINE_IN');

  // États des modals
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrderInfo, setLastOrderInfo] = useState<InvoiceData | null>(null);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY'>('CASH');

  // Modal de personnalisation
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null);
  const [activeVariant, setActiveVariant] = useState<Variant | undefined>(undefined);
  const [activeModifiers, setActiveModifiers] = useState<ModifierOption[]>([]);

  const { cart, addToCart, updateQuantity, clearCart, subtotal } = useCart();
  const { selectedCategory, setCategory, searchQuery, setSearchQuery } = usePosStore();
  const debouncedSearchQuery = useDebounce(searchQuery, 150);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      // Les headers Authorization sont gérés automatiquement par l'intercepteur dans ./services/api
      const { products: catalogProducts, categories: catalogCategories } = await posService.fetchCatalog();
      
      console.log('Produits chargés :', catalogProducts);
      console.log('Catégories chargées :', catalogCategories);
      setProducts(catalogProducts);
      setCategories(catalogCategories);
    } catch (error) {
      console.error('Erreur chargement catalogue :', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const hasModifiers = product.modifier_groups && product.modifier_groups.length > 0;

    if (hasVariants || hasModifiers) {
      setSelectedProductForOptions(product);
      setActiveVariant(hasVariants ? product.variants![0] : undefined);
      setActiveModifiers([]);
    } else {
      addToCart(product);
    }
  };

  const toggleModifier = (option: ModifierOption) => {
    setActiveModifiers(prev => {
      const exists = prev.some(m => m.id === option.id);
      return exists ? prev.filter(m => m.id !== option.id) : [...prev, option];
    });
  };

  const handleConfirmCustomization = () => {
    if (selectedProductForOptions) {
      addToCart(selectedProductForOptions, activeVariant, activeModifiers);
      setSelectedProductForOptions(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const productCategoryId = p.category?.id || (p as any).category_id;
    const matchesCat = 
      selectedCategory === 'ALL' || 
      String(productCategoryId) === String(selectedCategory);

    const matchesSearch = p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const categoryColor = (category: Category | null | undefined) => {
    if (category?.color_code) return category.color_code;
    const palette = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];
    const key = String(category?.id || category?.name || 'general');
    const hash = [...key].reduce((total, character) => total + character.charCodeAt(0), 0);
    return palette[hash % palette.length];
  };

  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  // Gestion du Clavier Numérique
  const handleNumpadInput = (value: string) => {
    if (value === 'CLEAR') {
      setAmountTendered('');
    } else if (value === 'BACKSPACE') {
      setAmountTendered(prev => prev.slice(0, -1));
    } else {
      setAmountTendered(prev => prev + value);
    }
  };

  const handleAddQuickAmount = (extra: number) => {
    const current = parseFloat(amountTendered) || 0;
    setAmountTendered((current + extra).toString());
  };

  const handleCheckout = async (): Promise<void> => {
    try {
      // 1. Créer la commande via l'API centralisée
      const orderPayload = {
        pos_id: activePosId,
        register_session_id: activeSessionId,
        order_type: orderType,
        items: cart.map(i => ({
          product_id: i.product.id,
          variant_id: i.selected_variant?.id || null,
          modifiers: i.selected_modifiers.map(m => ({ modifier_id: m.id, modifier_name: m.name, price: m.price })),
          quantity: i.quantity,
          notes: i.notes || ''
        }))
      };

      const orderRes = await posService.createOrder(orderPayload);
      const orderId = orderRes.id;

      // 2. Traitement du paiement
      const tenderedVal = parseFloat(amountTendered) || total;
      const paymentRes = await paymentService.processPayment({
        order_id: orderId,
        payment_method: paymentMethod,
        amount_tendered: tenderedVal
      });

      // 3. Impression via le bridge desktop unique
      if (!window.pywebview?.api?.print_order_receipt) {
        throw new Error('Le système d’impression desktop n’est pas disponible.');
      }

      await window.pywebview.api.print_order_receipt(orderId, 'TOKEN');

      setLastOrderInfo({
        orderId: orderId,
        items: cart.map(i => ({ name: i.product.name + (i.selected_variant ? ` (${i.selected_variant.name})` : ''), qty: i.quantity, total: i.unit_price * i.quantity })),
        subtotal,
        tax: subtotal * 0.18,
        total: total,
        paymentMethod,
        amountTendered: tenderedVal,
        changeGiven: paymentRes.change_given,
      });
      setShowInvoice(true);
      clearCart();
      setIsCheckoutOpen(false);
      setAmountTendered('');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Erreur lors de la commande';
      alert("Erreur lors de la commande : " + msg);
    }
  };

  const calculatedChange = Math.max(0, (parseFloat(amountTendered) || 0) - total);
  
  return (
    <div className="flex h-screen w-full max-w-full bg-slate-900 text-slate-100 overflow-hidden font-sans select-none box-border">
      
      {/* ----------------- CATALOGUE (GAUCHE) ----------------- */}
      <div className="flex-1 flex flex-col p-4 border-r border-slate-800 min-w-0 overflow-hidden h-full">
        
        {/* Recherche */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 text-lg"
            />
          </div>
          <button 
            onClick={fetchCatalog}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition shrink-0"
          >
            <RefreshCw className={`h-6 w-6 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Catégories */}
        <div
          className="pos-category-scroll flex min-w-0 w-full shrink-0 gap-2 overflow-x-auto overflow-y-hidden pb-3 mb-4"
          onWheel={(event) => {
            if (event.deltaY !== 0) {
              event.currentTarget.scrollLeft += event.deltaY;
              event.preventDefault();
            }
          }}
        >
          <button
            onClick={() => setCategory('ALL')}
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
              onClick={() => setCategory(String(cat.id))}
              style={selectedCategory === String(cat.id) ? { backgroundColor: categoryColor(cat), boxShadow: `0 8px 20px ${categoryColor(cat)}55` } : { borderColor: `${categoryColor(cat)}66` }}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition shrink-0 border ${selectedCategory === String(cat.id) ? 'text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}`}
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
                onClick={() => handleProductClick(product)}
                className="bg-slate-800/80 border border-slate-700/60 hover:border-indigo-500/80 rounded-2xl p-4 flex flex-col justify-between cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md relative"
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-xs font-semibold px-2 py-1 rounded-md text-white truncate" style={{ backgroundColor: `${categoryColor(product.category)}cc` }}>
                      {product.category?.name || 'Général'}
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

      {/* ----------------- PANIER (DROITE) ----------------- */}
      <div className="w-80 md:w-96 lg:w-[380px] shrink-0 bg-slate-950 flex flex-col border-l border-slate-800 h-full overflow-hidden">
        
        {/* Header Panier */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-indigo-400" />
            <h2 className="text-xl font-bold truncate">Commande En Cours</h2>
          </div>
          {cart.length > 0 && (
            <button 
              onClick={clearCart}
              className="text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition shrink-0"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Liste des articles du Panier */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <ShoppingCart className="h-16 w-16 mb-2 stroke-[1.5]" />
              <p className="text-lg">Aucun article dans le panier</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cart_item_id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-200 block truncate">{item.product.name}</span>
                    {item.selected_variant && (
                      <span className="block text-xs text-indigo-400 font-medium truncate">
                        Taille : {item.selected_variant.name}
                      </span>
                    )}
                    {item.selected_modifiers.length > 0 && (
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {item.selected_modifiers.map(m => `+ ${m.name}`).join(', ')}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-indigo-400 shrink-0">
                    {(item.unit_price * item.quantity).toLocaleString()} FCFA
                  </span>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-400 truncate">{item.unit_price.toLocaleString()} FCFA / u</span>
                  <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 shrink-0">
                    <button onClick={() => updateQuantity(item.cart_item_id, -1)} className="text-slate-300 hover:text-white p-1">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cart_item_id, 1)} className="text-slate-300 hover:text-white p-1">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pied de page Panier */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3 shrink-0">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Sous-total HT</span>
              <span>{subtotal.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>TVA (18%)</span>
              <span>{tax.toLocaleString()} FCFA</span>
            </div>
            <div className="flex justify-between text-lg md:text-xl font-black text-white pt-2 border-t border-slate-800">
              <span>TOTAL TTC</span>
              <span className="text-indigo-400">{total.toLocaleString()} FCFA</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => {
              setAmountTendered('');
              setIsCheckoutOpen(true);
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-base md:text-lg rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Banknote className="h-6 w-6" />
            Encaisser ({total.toLocaleString()} FCFA)
          </button>
        </div>

      </div>

      {/* ----------------- MODAL PERSONNALISATION ----------------- */}
      {selectedProductForOptions && (
        <CustomizationModal
          product={selectedProductForOptions}
          activeVariant={activeVariant}
          activeModifiers={activeModifiers}
          onSelectVariant={(variant) => setActiveVariant(variant)}
          onToggleModifier={toggleModifier}
          onConfirm={handleConfirmCustomization}
          onClose={() => setSelectedProductForOptions(null)}
        />
      )}

      {/* ----------------- MODAL D'ENCAISSEMENT AVEC NUMPAD ----------------- */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <h2 className="text-2xl font-black text-white">Règlement de la commande</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mode de Paiement */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'CASH' 
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <Banknote className="h-6 w-6" />
                Espèces
              </button>
              <button
                onClick={() => setPaymentMethod('MOBILE_MONEY')}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                  paymentMethod === 'MOBILE_MONEY' 
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <CreditCard className="h-6 w-6" />
                Mobile Money / CB
              </button>
            </div>

            {/* Affichage des montants */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
                <span className="text-xs text-slate-400 block">Total à payer</span>
                <span className="text-xl font-black text-indigo-400">{total.toLocaleString()} FCFA</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
                <span className="text-xs text-slate-400 block">Montant Reçu</span>
                <span className="text-xl font-black text-emerald-400">
                  {amountTendered ? `${parseFloat(amountTendered).toLocaleString()} FCFA` : '0 FCFA'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl text-center border border-slate-800">
                <span className="text-xs text-slate-400 block">Monnaie à Rendre</span>
                <span className="text-xl font-black text-amber-400">
                  {calculatedChange.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {/* Section Espèces avec Pavé Numérique */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3">
                {/* Boutons Rapides */}
                <div className="grid grid-cols-4 gap-2">
                  <button 
                    onClick={() => setAmountTendered(total.toString())}
                    className="py-2 px-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-indigo-300"
                  >
                    Exact ({total.toLocaleString()})
                  </button>
                  <button 
                    onClick={() => handleAddQuickAmount(1000)}
                    className="py-2 px-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200"
                  >
                    +1 000
                  </button>
                  <button 
                    onClick={() => handleAddQuickAmount(5000)}
                    className="py-2 px-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200"
                  >
                    +5 000
                  </button>
                  <button 
                    onClick={() => handleAddQuickAmount(10000)}
                    className="py-2 px-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 text-slate-200"
                  >
                    +10 000
                  </button>
                </div>

                {/* CLAVIER NUMÉRIQUE */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumpadInput(num)}
                      className="py-2.5 bg-slate-800 hover:bg-slate-700 text-xl font-bold rounded-lg text-white active:bg-indigo-600 transition"
                    >
                      {num}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handleNumpadInput('BACKSPACE')}
                    className="py-2.5 bg-slate-800 hover:bg-amber-600 text-amber-400 hover:text-white font-bold rounded-lg flex items-center justify-center transition"
                  >
                    <Delete className="h-6 w-6" />
                  </button>

                  <button
                    onClick={() => handleNumpadInput('CLEAR')}
                    className="col-span-3 py-2 bg-rose-500/20 hover:bg-rose-600/30 text-rose-400 font-bold rounded-lg border border-rose-500/30 flex items-center justify-center gap-2 transition"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Effacer la Saisie
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 shrink-0">
              <button 
                onClick={() => setIsCheckoutOpen(false)} 
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-slate-300 transition"
              >
                Annuler
              </button>
              <button 
                onClick={handleCheckout} 
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
              >
                <Printer className="h-5 w-5" />
                Valider & Imprimer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Facture (Ticket) */}
      {showInvoice && lastOrderInfo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-white">Reçu de Caisse</h3>
              <button 
                onClick={() => setShowInvoice(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <InvoiceView data={lastOrderInfo} />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowInvoice(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-slate-300 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}