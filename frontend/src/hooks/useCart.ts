import { usePosStore } from '../store/usePosStore';

export function useCart() {
  const cart = usePosStore((state) => state.cart);
  const addToCart = usePosStore((state) => state.addToCart);
  const updateQuantity = usePosStore((state) => state.updateQuantity);
  const removeFromCart = usePosStore((state) => state.removeFromCart);
  const clearCart = usePosStore((state) => state.clearCart);
  const getSubtotal = usePosStore((state) => state.getSubtotal);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal: getSubtotal(),
  };
}

export default useCart;
