import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export default function Workspace() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [sentence, setSentence] = useState('');
  const [currentSign, setCurrentSign] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Debounce logic matching Python terminal
  const steadyRef = useRef({ prediction: '', count: 0, lastAppended: '' });

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Backspace') {
        setSentence(prev => prev.slice(0, -1));
      } else if (e.key === 'c' || e.key === 'C') {
        setSentence('');
        steadyRef.current = { prediction: '', count: 0, lastAppended: '' };
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize WebSockets
  useEffect(() => {
    socketRef.current = new WebSocket('ws://127.0.0.1:8000/ws/predict');
    
    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.predicted_sign) {
        const raw_pred = data.predicted_sign;
        setCurrentSign(raw_pred);
        
        const steady = steadyRef.current;
        if (raw_pred === steady.prediction) {
            steady.count += 1;
        } else {
            steady.prediction = raw_pred;
            steady.count = 0;
        }
        
        if (steady.count > 15 && raw_pred !== steady.lastAppended) {
            if (raw_pred === 'SPACE') {
                setSentence(prev => prev + ' ');
            } else {
                setSentence(prev => prev + raw_pred);
            }
            steady.lastAppended = raw_pred;
        }
      }
    };

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // Initialize MediaPipe
  useEffect(() => {
    const initModel = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      setHandLandmarker(landmarker);
    };
    initModel();
  }, []);

  // Initialize Webcam
  useEffect(() => {
    const enableWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    enableWebcam();
  }, []);

  // Throttle ref
  const lastPredictTimeRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const PREDICT_INTERVAL_MS = 33;

  // Prediction loop
  const predictLoop = useCallback(() => {
    if (!handLandmarker || !videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      requestAnimationFrame(predictLoop);
      return;
    }

    const video = videoRef.current;
    
    // Only run if there is a new frame to prevent MediaPipe timestamp errors
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const now = performance.now();

      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const results = handLandmarker.detectForVideo(video, now);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
          ctx.fillStyle = "#4f6ef7";
          for (const landmarks of results.landmarks) {
            let coordinates = [];
            for (const landmark of landmarks) {
              ctx.beginPath();
              ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
              ctx.fill();
              coordinates.push(1 - landmark.x, landmark.y, landmark.z);
            }
            
            if (now - lastPredictTimeRef.current >= PREDICT_INTERVAL_MS) {
              if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                  socketRef.current.send(JSON.stringify({ landmarks: coordinates }));
              }
              lastPredictTimeRef.current = now;
            }
          }
        } else {
          setCurrentSign(prev => prev !== null ? null : prev);
          steadyRef.current.lastAppended = '';
        }
      } catch (error) {
        console.error("MediaPipe detection error:", error);
      }
    }
    
    requestAnimationFrame(predictLoop);
  }, [handLandmarker]);

  useEffect(() => {
    if (handLandmarker) {
      requestAnimationFrame(predictLoop);
    }
  }, [handLandmarker, predictLoop]);

  return (
    <div className="ws-page">
      {/* Subtle background orbs */}
      <div className="ws-orb ws-orb-1" />
      <div className="ws-orb ws-orb-2" />

      {/* Top navigation bar */}
      <nav className="ws-nav">
        <div className="ws-nav-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-9v4h4l-5 9z"/></svg>
          </div>
          Gesturera Workspace
        </div>
        <div className="ws-nav-right">
          <div className="ws-live-badge">
            <span className="live-dot" />
            Live Sign: <strong>{currentSign || '—'}</strong>
          </div>
          <button className="btn-ghost" onClick={() => {
            localStorage.removeItem('token');
            navigate('/login');
          }}>Logout</button>
        </div>
      </nav>

      <div className="ws-content">
        {/* Translation output panel */}
        <div className="ws-panel ws-translation-panel">
          <div className="ws-panel-header">
            <h3>
              <span className="panel-icon">💬</span>
              Accumulated Translation
            </h3>
            <button
              className="btn-ghost btn-sm"
              style={{ borderColor: 'rgba(232,79,79,.4)', color: '#d44' }}
              onClick={() => {
                setSentence('');
                steadyRef.current = { prediction: '', count: 0, lastAppended: '' };
              }}
            >
              Clear
            </button>
          </div>
          <textarea 
            className="ws-sentence"
            value={sentence}
            readOnly
            placeholder="Perform ASL signs in front of the camera to see the translation here… (Backspace to delete, C to clear)"
          />
        </div>

        {/* Camera feed */}
        <div className="ws-camera-card">
          <div className="ws-camera-inner">
            <video 
              ref={videoRef} 
              className="ws-video" 
              autoPlay 
              playsInline 
              muted 
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas 
              ref={canvasRef} 
              className="ws-canvas"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
          <div className="ws-camera-hint">
            <span>🎥</span> Keep your hand within the frame for accurate detection
          </div>
        </div>
      </div>
    </div>
  );
}
