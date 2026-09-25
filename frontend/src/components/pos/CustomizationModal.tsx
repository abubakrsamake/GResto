import { X, Check } from 'lucide-react';
import { calculateUnitPrice } from '../../store/usePosStore';
import type { Product, Variant, ModifierOption, ModifierGroup } from '../../store/usePosStore';

interface CustomizationModalProps {
  product: Product;
  activeVariant: Variant | undefined;
  activeModifiers: ModifierOption[];
  onSelectVariant: (v: Variant) => void;
  onToggleModifier: (opt: ModifierOption) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CustomizationModal({
  product,
  activeVariant,
  activeModifiers,
  onSelectVariant,
  onToggleModifier,
  onConfirm,
  onClose
}: CustomizationModalProps) {
  
  // Vérification si au moins un groupe obligatoire n'a pas été sélectionné
  const isMissingRequired = product.modifier_groups?.some((group: ModifierGroup) => {
    if (!group.is_required && (group.min_selection || 0) <= 0) return false;
    const options = group.options || (group as any).modifiers || [];
    const selectedCount = activeModifiers.filter(m => options.some(opt => opt.id === m.id)).length;
    const minRequired = group.min_selection || (group.is_required ? 1 : 0);
    return selectedCount < minRequired;
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white">{product.name}</h2>
            <p className="text-sm text-slate-400">Personnalisez votre commande</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto my-4 space-y-6 pr-1 min-h-0">
          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Taille / Format</h3>
              <div className="grid grid-cols-2 gap-3">
                {product.variants.map((v) => {
                  const isSelected = activeVariant?.id === v.id;
                  const variantPrice = v.price_override !== undefined ? v.price_override : product.base_price;
                  return (
                    <button
                      key={v.id}
                      onClick={() => onSelectVariant(v)}
                      className={`p-3 rounded-xl border text-left flex justify-between items-center transition ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold' 
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="text-sm font-black">{Number(variantPrice).toLocaleString()} FCFA</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifier Groups */}
          {product.modifier_groups?.map((group: ModifierGroup) => {
            const optionsList: ModifierOption[] = group.options || (group as any).modifiers || [];
            
            return (
              <div key={group.id}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{group.name}</h3>
                  {group.is_required && (
                    <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">Obligatoire</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {optionsList.map((opt: ModifierOption) => {
                    const isSelected = activeModifiers.some(m => m.id === opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => onToggleModifier(opt)}
                        className={`p-3 rounded-xl border text-left flex justify-between items-center transition ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300 font-bold' 
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span>{opt.name}</span>
                        </div>
                        {opt.price > 0 && <span className="text-sm font-bold text-slate-400">+ {opt.price} FCFA</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs text-slate-400 block">Prix unitaire configuré</span>
            <span className="text-2xl font-black text-indigo-400">
              {calculateUnitPrice(product, activeVariant, activeModifiers).toLocaleString()} FCFA
            </span>
          </div>
          <button 
            onClick={onConfirm} 
            disabled={isMissingRequired}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 font-bold text-white rounded-xl shadow-lg shadow-indigo-600/20 transition"
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}