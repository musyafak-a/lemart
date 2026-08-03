import WebcamScanner from "./components/WebcamScanner";

function App() {
  return (
    <div className="min-h-screen bg-canvas-off p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-brand-700">Lemart POS</h1>
          <p className="text-sm text-ink/70">Arahkan barcode produk ke kamera</p>
        </div>
        
        {/* Render komponen scanner */}
        <WebcamScanner 
          mode="kasir"
          onProductDetected={(product) => console.log("Terdeteksi:", product)}
          onNotFound={(barcode) => console.log("Tidak ditemukan:", barcode)}
        />
      </div>
    </div>
  );
}

export default App;
