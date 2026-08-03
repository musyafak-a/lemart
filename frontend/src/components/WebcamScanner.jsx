import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Camera, CameraOff, ScanLine, AlertTriangle, Loader2 } from "lucide-react";
import axios from "axios";
import { useCartStore } from "../store/useCartStore";

const SCAN_COOLDOWN_MS = 1800; // 1.5 - 2s debounce window
const SCANNER_ELEMENT_ID = "webcam-scanner-viewport";

/**
 * Plays a short synthesized "beep" using the Web Audio API.
 * No external audio asset required.
 */
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
    oscillator.onended = () => ctx.close();
  } catch (err) {
    // Web Audio not available — fail silently, scan still works.
    console.warn("Beep playback failed:", err);
  }
}

/**
 * WebcamScanner
 *
 * Real-time barcode/QR scanner using the device webcam.
 * Handles the full frontend algorithm from the spec:
 *  1. Requests getUserMedia via html5-qrcode
 *  2. Continuously decodes frames
 *  3. Debounces duplicate scans (1.5–2s cooldown) + beep feedback
 *  4. POSTs the decoded barcode to /api/scan with JWT auth
 *
 * Props:
 *  - mode: "kasir" | "restock"  → determines API behavior downstream
 *  - onProductDetected(product) → called with the product payload on success
 *  - onNotFound(barcode)        → called when the backend returns 404
 *  - apiBaseUrl                 → override for the API host (default: env var)
 */
export default function WebcamScanner({
  mode = "kasir",
  onProductDetected,
  onNotFound,
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
}) {
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false); // guards against multiple simultaneous triggers
  const cooldownTimerRef = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cameras, setCameras] = useState([]);

  const addItemToCart = useCartStore((state) => state.addItem);

  /** Sends the decoded barcode to the backend and routes the result. */
  const handleDetectedBarcode = useCallback(
    async (decodedText) => {
      const token = localStorage.getItem("auth_token");

      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const response = await axios.post(
          `${apiBaseUrl}/api/scan`,
          { barcode: decodedText, mode },
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
          setErrorMessage("Barang tidak terdaftar!");
          onNotFound?.(decodedText);
        } else if (err.response?.status === 409) {
          setErrorMessage(err.response.data?.message || "Stok tidak mencukupi.");
        } else {
          setErrorMessage("Gagal menghubungi server. Coba lagi.");
          console.error("Scan request failed:", err);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [apiBaseUrl, mode, addItemToCart, onProductDetected, onNotFound]
  );

  /** Core detection callback wired into html5-qrcode. */
  const onScanSuccess = useCallback(
    (decodedText) => {
      if (isScanningRef.current) return; // block duplicate trigger during cooldown

      isScanningRef.current = true;
      playBeep();
      handleDetectedBarcode(decodedText);

      cooldownTimerRef.current = setTimeout(() => {
        isScanningRef.current = false;
      }, SCAN_COOLDOWN_MS);
    },
    [handleDetectedBarcode]
  );

  const startScanner = useCallback(async () => {
    setErrorMessage(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);

      if (!devices || devices.length === 0) {
        setErrorMessage("Kamera tidak ditemukan.");
        return;
      }

      const cameraId = devices[0].id;
      const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.7777778,
        },
        onScanSuccess,
        () => {
          // per-frame decode failure — expected constantly, ignore silently
        }
      );

      setIsCameraActive(true);
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setErrorMessage("Akses kamera ditolak atau tidak tersedia.");
      setIsCameraActive(false);
    }
  }, [onScanSuccess]);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch (err) {
      console.warn("Error stopping scanner:", err);
    } finally {
      setIsCameraActive(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(cooldownTimerRef.current);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-canvas p-4 shadow-card border border-brand-100">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ScanLine className="h-4 w-4 text-brand" />
          {mode === "kasir" ? "Mode Kasir — Fast Scan" : "Mode Restock — Check-In Barang"}
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
              <CameraOff className="h-3.5 w-3.5" /> Stop
            </>
          ) : (
            <>
              <Camera className="h-3.5 w-3.5" /> Mulai Scan
            </>
          )}
        </button>
      </div>

      {/* Webcam viewport with scanner bounding-box overlay */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-ink">
        <div id={SCANNER_ELEMENT_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
            <Camera className="h-8 w-8" />
            <p className="text-xs">Kamera belum aktif</p>
          </div>
        )}

        {isCameraActive && (
          <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-brand shadow-scanner">
            <div className="absolute left-0 right-0 top-0 h-0.5 bg-brand animate-scan-line" />
          </div>
        )}

        {isProcessing && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
            <Loader2 className="h-3 w-3 animate-spin" /> Memproses...
          </div>
        )}
      </div>

      {/* Feedback area */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </div>
      )}

      {lastScanned && !errorMessage && (
        <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
          Terdeteksi: <span className="font-semibold">{lastScanned.name}</span>
        </div>
      )}
    </div>
  );
}
