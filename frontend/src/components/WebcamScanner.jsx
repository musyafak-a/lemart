import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, CameraOff, ScanLine, AlertTriangle, Loader2, Keyboard, ArrowRight, Zap } from "lucide-react";
import axios from "axios";
import { useCartStore } from "../store/useCartStore";

const SCAN_COOLDOWN_MS = 1500;

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1046.5, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
    oscillator.onended = () => ctx.close();
  } catch (err) {
    console.warn("Beep playback failed:", err);
  }
}

export default function WebcamScanner({
  mode = "kasir",
  onProductDetected,
  onNotFound,
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
}) {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const isScanningRef = useRef(false);
  const cooldownTimerRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [manualBarcode, setManualBarcode] = useState("");

  const addItemToCart = useCartStore((state) => state.addItem);

  const handleDetectedBarcode = useCallback(
    async (decodedText) => {
      const cleanBarcode = String(decodedText).trim();
      if (!cleanBarcode) return;

      const token = localStorage.getItem("auth_token");

      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const response = await axios.post(
          `${apiBaseUrl}/api/scan`,
          { barcode: cleanBarcode, mode },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const product = response.data?.data;

        if (mode === "kasir" && product) {
          addItemToCart(product);
        }

        onProductDetected?.(product);
        setLastScanned(product);
      } catch (err) {
        if (err.response?.status === 404) {
          setErrorMessage(`Barang (${cleanBarcode}) tidak terdaftar di MySQL!`);
          onNotFound?.(cleanBarcode);
        } else if (err.response?.status === 409) {
          setErrorMessage(err.response.data?.message || "Stok tidak mencukupi.");
        } else {
          setErrorMessage("Gagal menghubungi server backend (port 3000).");
          console.error("Scan request failed:", err);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [apiBaseUrl, mode, addItemToCart, onProductDetected, onNotFound]
  );

  const startScanner = useCallback(async () => {
    setErrorMessage(null);

    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {}
    }

    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, 300);
      codeReaderRef.current = reader;

      await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result && !isScanningRef.current) {
          isScanningRef.current = true;
          playBeep();
          const decodedText = result.getText();
          handleDetectedBarcode(decodedText);

          cooldownTimerRef.current = setTimeout(() => {
            isScanningRef.current = false;
          }, SCAN_COOLDOWN_MS);
        }
      });

      setIsCameraActive(true);
    } catch (err) {
      console.error("ZXing Camera Error:", err);
      setErrorMessage("Gagal mengakses webcam atau kamera dikunci program lain.");
      setIsCameraActive(false);
    }
  }, [handleDetectedBarcode]);

  const stopScanner = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    playBeep();
    handleDetectedBarcode(manualBarcode.trim());
    setManualBarcode("");
  };

  useEffect(() => {
    startScanner();

    return () => {
      clearTimeout(cooldownTimerRef.current);
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-card border border-brand-100">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ScanLine className="h-4 w-4 text-brand" />
          {mode === "kasir" ? "Mode Kasir — ZXing Barcode Engine" : "Mode Restock — Check-In Barang"}
        </h2>

        <button
          onClick={isCameraActive ? stopScanner : startScanner}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            isCameraActive
              ? "bg-red-50 text-red-600 hover:bg-red-100"
              : "bg-brand text-white hover:bg-brand-hover active:bg-brand-active"
          }`}
        >
          {isCameraActive ? (
            <>
              <CameraOff className="h-3.5 w-3.5" /> Matikan Kamera
            </>
          ) : (
            <>
              <Camera className="h-3.5 w-3.5" /> Nyalakan Kamera
            </>
          )}
        </button>
      </div>

      {/* Viewport Kamera Direct Video Element */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-ink">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60 p-4 text-center">
            <Camera className="h-8 w-8" />
            <p className="text-xs">Kamera belum aktif. Klik tombol di kanan atas.</p>
          </div>
        )}

        {isCameraActive && (
          <div className="pointer-events-none absolute inset-4 rounded-lg border-2 border-brand shadow-scanner">
            <div className="absolute left-0 right-0 top-0 h-0.5 bg-brand animate-scan-line" />
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-brand/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-bold">
              <Zap className="h-3 w-3 text-amber-300" /> ZXing EAN-13 TryHarder Engine
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-xs text-white z-10">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-300" /> Memeriksa ke MySQL...
          </div>
        )}
      </div>

      {/* Manual Input Form */}
      <form onSubmit={handleManualSubmit} className="flex gap-2 items-center pt-1">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Input / Temblok Barcode Manual (misal: 8992753033744)"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={!manualBarcode.trim()}
          className="px-3.5 py-2 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-hover active:bg-brand-active disabled:opacity-40 transition-all flex items-center gap-1 shrink-0"
        >
          Scan <ArrowRight className="h-3 w-3" />
        </button>
      </form>

      {/* Feedback area */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {lastScanned && !errorMessage && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 flex items-center justify-between">
          <span>Terdeteksi: <strong className="font-semibold">{lastScanned.brand} — {lastScanned.variant_name}</strong></span>
          <span className="font-bold text-emerald-600">Rp {Number(lastScanned.price).toLocaleString('id-ID')}</span>
        </div>
      )}
    </div>
  );
}
