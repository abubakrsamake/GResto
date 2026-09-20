import { ShoppingCart, Trash2, Plus, Minus, Banknote } from 'lucide-react';
import type { CartItem } from '../../store/usePosStore';

interface CartSidebarProps {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  onUpdateQuantity: (cartItemId: string, delta: number) => void;
  onClearCart: () => void;
  onOpenCheckout: () => void;
}

export default function CartSidebar({
  cart,
  subtotal,
  tax,
  total,
  onUpdateQuantity,
  onClearCart,
  onOpenCheckout
}: CartSidebarProps) {
  return (
    <div className="w-80 md:w-96 lg:w-[380px] shrink-0 bg-slate-950 flex flex-col border-l border-slate-800 h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-indigo-400" />
          <h2 className="text-xl font-bold truncate">Commande En Cours</h2>
        </div>
        {cart.length > 0 && (
          <button 
            onClick={onClearCart}
            className="text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition shrink-0"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Liste Articles */}
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
                  <button onClick={() => onUpdateQuantity(item.cart_item_id, -1)} className="text-slate-300 hover:text-white p-1">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                  <button onClick={() => onUpdateQuantity(item.cart_item_id, 1)} className="text-slate-300 hover:text-white p-1">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Totaux */}
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
          onClick={onOpenCheckout}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-base md:text-lg rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Banknote className="h-6 w-6" />
          Encaisser ({total.toLocaleString()} FCFA)
        </button>
      </div>
    </div>
  );
}