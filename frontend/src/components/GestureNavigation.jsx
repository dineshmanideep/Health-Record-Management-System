import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

const GestureNavigation = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGesture, setCurrentGesture] = useState('');
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognizerRef = useRef(null);
  const requestRef = useRef(null);
  const navigate = useNavigate();
  
  const lastNavTime = useRef(0);
  const cooldown = 2000; // 2 seconds cooldown
  
  // Initialize gesture recognizer
  const initRecognizer = async () => {
    try {
      setIsLoading(true);
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      recognizerRef.current = recognizer;
      
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      setIsLoading(false);
      setIsActive(true);
    } catch (err) {
      console.error("Error initializing gesture recognizer", err);
      setIsLoading(false);
      setIsActive(false);
    }
  };
  
  const stopRecognizer = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    setIsActive(false);
    setCurrentGesture('');
  };
  
  const toggleGestureNav = () => {
    if (isActive) {
      stopRecognizer();
    } else {
      initRecognizer();
    }
  };
  
  const processVideo = useCallback(async () => {
    if (!videoRef.current || !recognizerRef.current || !isActive) return;
    
    const nowInMs = Date.now();
    
    // Process only if video is playing
    if (videoRef.current.readyState >= 2) {
      const results = recognizerRef.current.recognizeForVideo(videoRef.current, nowInMs);
      
      if (results.gestures.length > 0) {
        const categoryName = results.gestures[0][0].categoryName;
        setCurrentGesture(categoryName);
        
        if (nowInMs - lastNavTime.current > cooldown) {
          if (categoryName === 'Thumb_Up') {
            navigate(1);
            lastNavTime.current = nowInMs;
          } else if (categoryName === 'Thumb_Down') {
            navigate(-1);
            lastNavTime.current = nowInMs;
          }
        }
      } else {
        setCurrentGesture('None');
      }
    }
    
    requestRef.current = requestAnimationFrame(processVideo);
  }, [isActive, navigate]);
  
  useEffect(() => {
    if (isActive && !isLoading) {
      requestRef.current = requestAnimationFrame(processVideo);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, isLoading, processVideo]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => stopRecognizer();
  }, []);

  // Attach stream to video element when it mounts
  useEffect(() => {
    if (isActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isActive]);
  
  return (
    <div className="fixed bottom-32 left-4 md:left-8 z-[9999] flex flex-col gap-2 pointer-events-auto">
      {isActive && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl p-2 w-48 relative animate-fadeIn">
          <div className="text-xs font-bold text-slate-500 mb-2 flex justify-between items-center">
            <span>Gesture Cam</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              currentGesture === 'Thumb_Up' || currentGesture === 'Thumb_Down' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {currentGesture || 'Scanning...'}
            </span>
          </div>
          <video 
            ref={videoRef} 
            className="w-full rounded-lg bg-black aspect-video object-cover" 
            playsInline 
            autoPlay
            muted 
          />
          <div className="mt-2 text-[9px] text-slate-400 dark:text-slate-500 text-center font-bold">
            👍 NEXT PAGE | 👎 PREV PAGE
          </div>
        </div>
      )}
      
      <button
        onClick={toggleGestureNav}
        disabled={isLoading}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${
          isActive 
            ? 'bg-emerald-600 text-white border-white dark:border-slate-800 shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:scale-110' 
            : 'bg-white text-slate-600 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800/50 hover:text-emerald-600 hover:scale-110'
        } ${isLoading ? 'opacity-75 cursor-not-allowed animate-pulse' : ''}`}
        title="Hand Gesture Navigation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
        </svg>
      </button>
    </div>
  );
};

export default GestureNavigation;
