import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onScan, onError, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerElementId = useMemo(() => `qr-reader-${Math.random().toString(36).slice(2, 10)}`, []);
  const html5QrCodeRef = useRef(null);
  const isScannerRunningRef = useRef(false);
  const isScannerStartingRef = useRef(false);
  const hasScannedRef = useRef(false);

  const stopScanner = async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner) return;

    try {
      if (isScannerRunningRef.current) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch (err) {
      console.error('Error stopping scanner:', err);
    } finally {
      html5QrCodeRef.current = null;
      isScannerRunningRef.current = false;
      isScannerStartingRef.current = false;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        if (!window.isSecureContext) {
          const msg = 'Camera requires HTTPS on mobile. Open with https://<PC-IP>:5173 and allow camera permission.';
          setErrorMsg(msg);
          if (onError) onError(msg);
          return;
        }

        if (isScannerRunningRef.current || isScannerStartingRef.current) return;
        isScannerStartingRef.current = true;

        const scanner = new Html5Qrcode(scannerElementId);
        html5QrCodeRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras?.length) {
          throw new Error('No camera detected on this device.');
        }

        const preferredCamera =
          cameras.find((camera) => /back|rear|environment/i.test(camera.label || '')) || cameras[0];

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * 0.7);
            return { width: qrboxSize, height: qrboxSize };
          },
          aspectRatio: 1,
          rememberLastUsedCamera: true
        };

        await scanner.start(
          preferredCamera.id,
          config,
          (decodedText) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            if (onScan) onScan(decodedText);
            stopScanner();
          },
          () => {}
        );

        const videoEl = document.querySelector(`#${scannerElementId} video`);
        if (videoEl) {
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('muted', 'true');
          videoEl.setAttribute('autoplay', 'true');
          videoEl.style.objectFit = 'cover';
        }

        if (!isMounted) {
          await stopScanner();
          return;
        }

        isScannerRunningRef.current = true;
        isScannerStartingRef.current = false;
        setIsScanning(true);
      } catch (err) {
        if (!isMounted) return;

        isScannerStartingRef.current = false;
        isScannerRunningRef.current = false;

        let msg = 'Failed to access camera.';
        if (err?.name === 'NotAllowedError' || err === 'NotAllowedError') {
          msg = 'Camera permission denied. Allow camera access in browser settings and refresh.';
        } else if (err?.name === 'NotFoundError' || err === 'NotFoundError') {
          msg = 'No camera detected on this device.';
        } else if (err?.message) {
          msg = `Camera error: ${err.message}`;
        }

        setErrorMsg(msg);
        if (onError) onError(msg);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerElementId]);

  const handleClose = async () => {
    await stopScanner();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b dark:border-slate-800">
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Scan QR Code</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Device Synchronization</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all text-2xl"
          >
            ×
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-8">
          {errorMsg ? (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900/30 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📷</div>
              <p className="text-red-800 dark:text-red-400 font-black uppercase tracking-widest text-xs mb-2">Camera Error</p>
              <p className="text-red-600 dark:text-red-500 text-sm font-medium mb-6 leading-relaxed">{errorMsg}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  Retry
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div 
                id={scannerElementId}
                className="rounded-3xl overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-inner bg-slate-50 dark:bg-slate-950/50"
                style={{ userSelect: 'none', cursor: 'default' }}
              ></div>
              
              <div className="mt-8 text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {isScanning ? 'Optical sensor active' : 'Initializing optical sensor'}
                  </p>
                </div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 px-8">
                  Position the code within the biometric frame for automated detection
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex justify-center">
          <button
            onClick={handleClose}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Terminate Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
