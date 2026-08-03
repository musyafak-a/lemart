import { create } from "zustand";

/**
 * useCartStore
 *
 * Zustand store for the Mode Kasir shopping cart (Master Spec Compliant).
 * Tracks items with { id, barcode, brand, variant_name, price, stock, qty }.
 */
export const useCartStore = create((set, get) => ({
  items: [],
  paymentMethod: "CASH",

  /** Adds a scanned product to the cart, or bumps qty if already present. */
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);

      if (existing) {
        if (existing.qty >= product.stock) {
          return state; // stock ceiling reached
        }
        return {
          items: state.items.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item
          ),
        };
      }

      if (product.stock <= 0) {
        return state; // out of stock
      }

      return {
        items: [...state.items, { ...product, qty: 1 }],
      };
    }),

  updateQty: (productId, qty) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.id === productId
            ? { ...item, qty: Math.max(1, Math.min(qty, item.stock)) }
            : item
        )
        .filter((item) => item.qty > 0),
    })),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    })),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  clearCart: () => set({ items: [], paymentMethod: "CASH" }),

  getTotal: () => get().items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0),

  getItemCount: () => get().items.reduce((sum, item) => sum + item.qty, 0),
}));
