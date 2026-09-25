import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface Variant {
  id: string | number;
  name: string; // ex: "Petit", "Grand", "Taille L"
  price_override?: number; // Prix spécifique si présent, sinon prix de base du produit
}

export interface ModifierOption {
  id: string | number;
  group_id?: string;
  name: string; // ex: "Supplément Fromage", "Sans Oignon"
  price: number; // Prix additionnel du modificateur
}

export interface ModifierGroup {
  id: string;
  name: string;
  is_required?: boolean;
  min_selection?: number;
  max_selection?: number;
  options: ModifierOption[];
  modifiers?: ModifierOption[]; // Fallback d'alias backend
}
export interface Category {
  id: string | number;
  name: string;
  color_code?: string | null;
  display_order?: number;
  is_active?: boolean;
}
export interface Product {
  id: string | number;
  name: string;
  base_price: string | number;
  tax_rate?: string | number;
  is_active?: boolean;
  image_url?: string | null;
  description?: string | null;
  sku?: string | null;
  created_at?: string;
  updated_at?: string;
  modifier_groups?: any[];
  variants?: Variant[];
  
  // Remplacer ou ajouter la propriété category
  category?: Category | null;
  category_id?: string | number; // Optionnel si tu l'utilises ailleurs
}

export interface CartItem {
  cart_item_id: string; // Identifiant unique généré pour distinguer les configurations du même produit
  product: Product;
  selected_variant?: Variant;
  selected_modifiers: ModifierOption[];
  quantity: number;
  notes?: string;
  unit_price: number; // Prix unitaire (Variant ou Base + Somme des Modifiers)
}

interface PosState {
  cart: CartItem[];
  selectedCategory: string;
  searchQuery: string;
  
  // Actions
  addToCart: (product: Product, variant?: Variant, modifiers?: ModifierOption[], notes?: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  setCategory: (categoryId: string) => void;
  setSearchQuery: (query: string) => void;
  getSubtotal: () => number;
  
}

// ✅ Assurez-vous d'avoir "export const" devant la fonction :
export const calculateUnitPrice = (
  product: Product,
  selectedVariant?: Variant,
  selectedModifiers: ModifierOption[] = []
): number => {
  // 1. Déterminer le prix de base (ou le prix surchargé par la variante)
  const base = selectedVariant?.price_override !== undefined && selectedVariant?.price_override !== null
    ? Number(selectedVariant.price_override)
    : Number(product.base_price || 0);

  // 2. Additionner les prix des modificateurs sélectionnés
  const modifiersTotal = selectedModifiers.reduce((sum, mod) => sum + Number(mod.price || 0), 0);

  return base + modifiersTotal;
};


// Store Zustand pour l'état du POS
// ---------------------------------------------------------------------------




// Helper pour générer une clé unique pour chaque configuration d'article
const generateCartItemId = (
  productId: string | number, 
  variant?: Variant, 
  modifiers: ModifierOption[] = []
): string => {
  const variantPart = variant ? `v_${variant.id}` : 'v_none';
  const modPart = modifiers.map(m => m.id).sort().join('-');
  return `${productId}_${variantPart}_${modPart}`;
};

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  selectedCategory: 'ALL',
  searchQuery: '',

  addToCart: (product, variant, modifiers = [], notes = '') => {
    const cartItemId = generateCartItemId(product.id, variant, modifiers);
    const unitPrice = calculateUnitPrice(product, variant, modifiers);

    set((state) => {
      const existingIndex = state.cart.findIndex((item) => item.cart_item_id === cartItemId);

      if (existingIndex > -1) {
        // Si la même configuration existe déjà, on augmente la quantité
        const updatedCart = [...state.cart];
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity: updatedCart[existingIndex].quantity + 1,
        };
        return { cart: updatedCart };
      }

      // Sinon, on ajoute la nouvelle ligne
      const newItem: CartItem = {
        cart_item_id: cartItemId,
        product,
        selected_variant: variant,
        selected_modifiers: modifiers,
        quantity: 1,
        notes,
        unit_price: unitPrice,
      };

      return { cart: [...state.cart, newItem] };
    });
  },

  updateQuantity: (cartItemId, delta) => {
    set((state) => {
      const updatedCart = state.cart
        .map((item) => {
          if (item.cart_item_id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);

      return { cart: updatedCart };
    });
  },

  removeFromCart: (cartItemId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.cart_item_id !== cartItemId),
    }));
  },

  clearCart: () => set({ cart: [] }),

  setCategory: (categoryId) => set({ selectedCategory: categoryId }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  getSubtotal: () => {
    return get().cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  },
}));