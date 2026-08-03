import { useState } from "react";
import { useCartStore } from "./store/useCartStore";
import WebcamScanner from "./components/WebcamScanner";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, CreditCard, Banknote, QrCode, Store } from "lucide-react";
import axios from "axios";

export default function App() {
  const [activeTab, setActiveTab] = useState("kasir"); // "kasir" | "restock"
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const paymentMethod = useCartStore((state) => state.paymentMethod);
  const setPaymentMethod = useCartStore((state) => state.setPaymentMethod);
  const clearCart = useCartStore((state) => state.clearCart);

  const totalAmount = items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setIsSubmitting(true);
    setCheckoutError(null);
    setCheckoutSuccess(null);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    try {
      const response = await axios.post(`${apiBaseUrl}/api/checkout`, {
        items: items.map(item => ({
          product_id: item.id,
          qty: item.qty,
          price: item.price,
          subtotal: Number(item.price) * item.qty
        })),
        total_price: totalAmount,
        payment_method: paymentMethod
      });

      setCheckoutSuccess(response.data?.data);
      clearCart();
    } catch (err) {
      console.error("Checkout failed:", err);
      setCheckoutError(err.response?.data?.message || "Gagal memproses transaksi checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* FamilyMart Inspired Header / Navbar */}
      <header className="bg-brand text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl tracking-tight leading-none">Lemart POS</h1>
              <p className="text-xs text-white/80 font-medium mt-0.5">Smart Asset, Inventory & POS System</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-brand-900/30 p-1 rounded-xl backdrop-blur-sm border border-white/10">
            <button
              onClick={() => setActiveTab("kasir")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "kasir"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Mode Kasir (POS)
            </button>
            <button
              onClick={() => setActiveTab("restock")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "restock"
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Mode Restock (Gudang)
            </button>
          </div>
        </div>
      </header>

      {/* Main Dual-Column Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Webcam Feed Scanner) - 5 Cols */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="sticky top-20">
            <WebcamScanner 
              mode={activeTab} 
              onProductDetected={(product) => {
                setCheckoutSuccess(null);
                setCheckoutError(null);
              }}
            />

            {/* Quick Helper / Instructions */}
            <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Petunjuk Pemindaian</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Arahkan barcode produk tepat di dalam kotak biru pada kamera. Sistem akan otomatis memutar nada <span className="font-semibold text-brand font-mono">BEEP</span> dan memasukkan produk ke keranjang belanja.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Contoh Barcode Tes:</span>
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-brand-800 font-bold">8992753033744</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (Real-Time Cart & Checkout Table) - 7 Cols */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-full min-h-[500px]">
            
            {/* Header Cart */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-brand" />
                <h2 className="font-bold text-slate-800">Keranjang Transaksi</h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700">
                {items.reduce((s, i) => s + i.qty, 0)} Item
              </span>
            </div>

            {/* Checkout Success Alert */}
            {checkoutSuccess && (
              <div className="my-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-900">Transaksi Berhasil!</p>
                  <p>Kode Transaksi: <span className="font-mono font-semibold">{checkoutSuccess.transaction_code}</span></p>
                </div>
              </div>
            )}

            {/* Checkout Error Alert */}
            {checkoutError && (
              <div className="my-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {checkoutError}
              </div>
            )}

            {/* Cart Items List Table */}
            <div className="flex-1 overflow-y-auto my-3 divide-y divide-slate-100">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 gap-2">
                  <ShoppingCart className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs">Keranjang masih kosong. Silakan scan barcode barang.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 px-2 rounded-lg transition-colors">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{item.brand} — {item.variant_name}</h4>
                      <p className="text-[11px] font-mono text-slate-400">{item.barcode}</p>
                      <p className="text-xs font-semibold text-brand mt-0.5">
                        Rp {Number(item.price).toLocaleString("id-ID")}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, item.qty - 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, item.qty + 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">
                        Rp {(Number(item.price) * item.qty).toLocaleString("id-ID")}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 text-[10px] inline-flex items-center gap-0.5 mt-1"
                      >
                        <Trash2 className="h-3 w-3" /> Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer: Payment Method & Total Checkout */}
            {items.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                
                {/* Payment Method Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "CASH", label: "Tunai / Cash", icon: Banknote },
                      { id: "QRIS", label: "QRIS", icon: QrCode },
                      { id: "DEBIT", label: "Debit / Card", icon: CreditCard },
                    ].map((method) => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                            isSelected
                              ? "border-brand bg-brand-50 text-brand-800 font-bold"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {method.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Total & Pay Button */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs text-slate-500 block">Total Pembayaran</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      Rp {totalAmount.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Memproses..." : "Bayar / Checkout"}
                  </button>
                </div>

              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
