import { create } from "zustand";

/**
 * useCartStore
 *
 * Zustand store for the Mode Kasir shopping cart.
 * A scanned product is added (or its qty incremented if already present).
 * Stock ceiling is enforced client-side using the product's `stock` field
 * returned by /api/scan, as a first line of defense before the backend
 * re-validates at checkout.
 */
export const useCartStore = create((set, get) => ({
  items: [], // [{ id, barcode, name, price, stock, qty }]
  paymentMethod: "cash",

  /** Adds a scanned product to the cart, or bumps qty if it's already there. */
  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);

      if (existing) {
        // Respect available stock — never let qty exceed what's on hand.
        if (existing.qty >= product.stock) {
          return state; // no-op: stock ceiling reached
        }
        return {
          items: state.items.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item
          ),
        };
      }

      if (product.stock <= 0) {
        return state; // out of stock, refuse to add
      }

      return {
        items: [...state.items, { ...product, qty: 1 }],
      };
    }),

  /** Manually sets an item's quantity (e.g. from a quantity input). */
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

  clearCart: () => set({ items: [], paymentMethod: "cash" }),

  /** Derived total — call as useCartStore(state => state.getTotal()) is NOT
   *  reactive by itself; prefer selecting `items` and computing in the
   *  component, or use this helper outside of render for one-off reads. */
  getTotal: () => get().items.reduce((sum, item) => sum + item.price * item.qty, 0),

  getItemCount: () => get().items.reduce((sum, item) => sum + item.qty, 0),
}));
