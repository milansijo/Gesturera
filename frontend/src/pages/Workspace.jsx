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

  // Debounce logic: prevents duplicate letter appending
  // - prediction: the current streak prediction
  // - count: how many consecutive frames predicted the same sign
  // - lastAppended: the last letter that was appended to the sentence
  // - emptyCount: consecutive frames with no hand detected
  // - lastAppendTime: timestamp of the last append (cooldown guard)
  const steadyRef = useRef({
    prediction: '',
    count: 0,
    lastAppended: '',
    emptyCount: 0,
    lastAppendTime: 0,
  });

  // Threshold: number of consecutive same-predictions required to append
  const STEADY_THRESHOLD = 12;
  // Cooldown: minimum ms between appends
  const APPEND_COOLDOWN_MS = 800;
  // Empty frames required before allowing same letter re-detection
  const EMPTY_RESET_THRESHOLD = 40;

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Backspace') {
        setSentence(prev => prev.slice(0, -1));
      } else if (e.key === 'c' || e.key === 'C') {
        setSentence('');
        steadyRef.current = {
          prediction: '',
          count: 0,
          lastAppended: '',
          emptyCount: 0,
          lastAppendTime: 0,
        };
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize WebSockets
  useEffect(() => {
    socketRef.current = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/predict`);
    
    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.predicted_sign) {
        const raw_pred = data.predicted_sign;
        setCurrentSign(raw_pred);
        
        const steady = steadyRef.current;
        // Reset empty counter since we have a valid prediction
        steady.emptyCount = 0;

        if (raw_pred === steady.prediction) {
          steady.count += 1;
        } else {
          // New prediction detected — reset the streak
          steady.prediction = raw_pred;
          steady.count = 1;
        }
        
        const now = Date.now();
        const cooldownOk = (now - steady.lastAppendTime) >= APPEND_COOLDOWN_MS;

        // Only append if:
        // 1. The streak is long enough (hand held steady)
        // 2. This letter hasn't already been appended in the current streak
        // 3. Enough time has passed since the last append (cooldown)
        if (steady.count >= STEADY_THRESHOLD && raw_pred !== steady.lastAppended && cooldownOk) {
          if (raw_pred === 'SPACE') {
            setSentence(prev => prev + ' ');
          } else {
            setSentence(prev => prev + raw_pred);
          }
          steady.lastAppended = raw_pred;
          steady.lastAppendTime = now;
          // Reset count to prevent re-triggering if lastAppended is ever cleared
          steady.count = 0;
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
          steadyRef.current.emptyCount = 0;
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
          steadyRef.current.emptyCount = (steadyRef.current.emptyCount || 0) + 1;
          if (steadyRef.current.emptyCount >= EMPTY_RESET_THRESHOLD) {
            // Only reset the prediction streak — do NOT reset lastAppended.
            // This prevents the same letter from being re-appended when the
            // hand briefly leaves and re-enters the frame with the same sign.
            steadyRef.current.prediction = '';
            steadyRef.current.count = 0;
            // Only clear lastAppended after a very long absence (3x threshold)
            // to allow intentional re-signing of the same letter.
            if (steadyRef.current.emptyCount >= EMPTY_RESET_THRESHOLD * 3) {
              steadyRef.current.lastAppended = '';
            }
          }
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
                steadyRef.current = { prediction: '', count: 0, lastAppended: '', emptyCount: 0, lastAppendTime: 0 };
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
