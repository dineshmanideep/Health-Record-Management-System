import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onScan, onError, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const isScannerRunningRef = useRef(false);
  const hasScannedRef = useRef(false);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScannerRunningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        isScannerRunningRef.current = false;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      try {
        // Create scanner instance
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
        
        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        console.log('Available cameras:', devices);
        
        if (!mounted) return;
        
        if (devices && devices.length) {
          // Prefer back camera on mobile devices
          const preferredCamera = devices.find(device => 
            device.label && device.label.toLowerCase().includes('back')
          ) || devices[0];

          console.log('Using camera:', preferredCamera.label);

          // Start scanning
          await html5QrCodeRef.current.start(
            preferredCamera.id,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              // Success callback - only process once
              if (hasScannedRef.current) return;
              hasScannedRef.current = true;
              
              console.log('QR Code scanned:', decodedText);
              
              if (onScan) {
                onScan(decodedText);
              }
              stopScanner();
            },
            () => {
              // Error callback (ignore continuous scanning errors)
              // Only log critical errors
            }
          );
          
          if (!mounted) {
            stopScanner();
            return;
          }
          
          isScannerRunningRef.current = true;
          setIsScanning(true);
          console.log('Scanner started successfully');
        } else {
          setErrorMsg('No camera found on this device');
          if (onError) {
            onError('No camera found');
          }
        }
      } catch (err) {
        console.error('Error starting QR scanner:', err);
        if (!mounted) return;
        
        setErrorMsg('Failed to access camera. Please allow camera permissions.');
        if (onError) {
          onError(err.message || 'Camera access denied');
        }
      }
    };

    startScanner();

    // Cleanup on unmount
    return () => {
      mounted = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async () => {
    await stopScanner();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-xl font-bold text-gray-800">Scan QR Code</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {errorMsg ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 font-semibold mb-2">📷 Camera Error</p>
              <p className="text-red-600 text-sm">{errorMsg}</p>
              <button
                onClick={handleClose}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div 
                id="qr-reader" 
                ref={scannerRef}
                className="rounded-lg overflow-hidden border-2 border-purple-200"
                style={{ userSelect: 'none', cursor: 'default' }}
              ></div>
              
              <div className="mt-4 text-center">
                <p className="text-gray-600 text-sm mb-2">
                  📱 Position the QR code within the frame
                </p>
                <p className="text-gray-500 text-xs">
                  The scanner will automatically detect and read the code
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={handleClose}
            className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
