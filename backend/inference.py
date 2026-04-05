import sys
import os
import torch
import json
import time
import threading
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session

# Add the parent directory to sys module path so we can import src.model
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.model import LandmarkModel
from .database import get_db
from . import models, auth

router = APIRouter()

# ── Model state (mutable at runtime) ────────────────────────
MODEL_PATH = "models/landmark_model.pth"
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# These are module-level variables that get swapped on reload
isl_model = None
actions = []
input_size = 63
num_classes = 0
_model_loaded_at = None  # ISO timestamp of last load

# ── Active WebSocket connection tracking ─────────────────
_active_connections = 0
_connections_lock = threading.Lock()

def get_active_connections():
    """Return the number of currently active WebSocket connections."""
    with _connections_lock:
        return _active_connections


def load_model():
    """
    (Re-)load the model checkpoint from disk.
    Updates the module-level isl_model, actions, input_size, num_classes.
    Returns a dict with metadata about the loaded model.
    """
    global isl_model, actions, input_size, num_classes, _model_loaded_at

    default_actions = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M',
        'N', 'O', 'P', 'Q', 'R', 'S', 'SPACE', 'T', 'U', 'V', 'X', 'Y', 'Z'
    ]

    if not os.path.exists(MODEL_PATH):
        actions = default_actions
        input_size = 63
        num_classes = len(actions)
        isl_model = LandmarkModel(num_classes=num_classes, input_size=input_size).to(device)
        _model_loaded_at = None
        print(f"WARNING: Model weights not found at {MODEL_PATH}. Using random weights.")
        return {
            "status": "missing",
            "message": f"Model file not found at {MODEL_PATH}",
            "num_classes": num_classes,
            "input_size": input_size,
            "classes": actions,
        }

    checkpoint = torch.load(MODEL_PATH, map_location=device)

    _actions = default_actions
    _input_size = 63

    if isinstance(checkpoint, dict):
        if 'classes' in checkpoint:
            _actions = checkpoint['classes']
        if 'input_size' in checkpoint:
            _input_size = checkpoint['input_size']

    _num_classes = len(_actions)

    new_model = LandmarkModel(num_classes=_num_classes, input_size=_input_size).to(device)

    if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
        new_model.load_state_dict(checkpoint['state_dict'])
    else:
        new_model.load_state_dict(checkpoint)

    new_model.eval()

    # Atomic swap
    actions = _actions
    input_size = _input_size
    num_classes = _num_classes
    isl_model = new_model
    _model_loaded_at = time.strftime("%Y-%m-%dT%H:%M:%S")

    print(f"Loaded ASL Model: {num_classes} classes, input_size={input_size}")
    return {
        "status": "loaded",
        "message": f"Model loaded successfully ({num_classes} classes, input_size={input_size})",
        "num_classes": num_classes,
        "input_size": input_size,
        "classes": actions,
        "loaded_at": _model_loaded_at,
    }


# ── Initial load on startup ────────────────────────────────
load_model()


# ── Admin endpoints ─────────────────────────────────────────
@router.post("/api/admin/reload-model", dependencies=[Depends(auth.get_current_admin_user)])
def reload_model():
    """
    Hot-reload the model from disk.
    Call this after retraining to pick up new weights without restarting the server.
    """
    try:
        result = load_model()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload model: {str(e)}")


@router.get("/api/admin/model-info", dependencies=[Depends(auth.get_current_admin_user)])
def get_model_info():
    """Return current model metadata."""
    model_file_exists = os.path.exists(MODEL_PATH)
    model_file_size = os.path.getsize(MODEL_PATH) if model_file_exists else 0
    model_file_modified = (
        time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(os.path.getmtime(MODEL_PATH)))
        if model_file_exists else None
    )

    return {
        "num_classes": num_classes,
        "input_size": input_size,
        "classes": actions,
        "loaded_at": _model_loaded_at,
        "model_file": MODEL_PATH,
        "model_file_exists": model_file_exists,
        "model_file_size_kb": round(model_file_size / 1024, 1),
        "model_file_modified": model_file_modified,
        "device": str(device),
    }


def normalize_landmarks(raw_landmarks):
    """
    Normalize 63 raw landmark values: translate to wrist origin, scale to [-1, 1].
    Input:  list of 63 floats [x0, y0, z0, x1, y1, z1, ...]
    Output: list of 63 floats (normalized)
    """
    wrist_x, wrist_y, wrist_z = raw_landmarks[0], raw_landmarks[1], raw_landmarks[2]
    coords = []
    for i in range(0, 63, 3):
        coords.extend([
            raw_landmarks[i] - wrist_x,
            raw_landmarks[i+1] - wrist_y,
            raw_landmarks[i+2] - wrist_z
        ])

    max_val = max(abs(v) for v in coords)
    if max_val > 0.0:
        coords = [v / max_val for v in coords]
    return coords


@router.websocket("/ws/predict")
async def websocket_predict(websocket: WebSocket, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time predictions.
    The client should send JSON payloads with {"landmarks": [63 floats]}
    Server tracks previous frame per connection to compute velocity features.
    """
    global _active_connections
    await websocket.accept()

    with _connections_lock:
        _active_connections += 1
    print(f"Client connected. Active connections: {_active_connections}")

    # Per-connection state for velocity tracking
    prev_coords = None

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            landmarks = payload.get("landmarks")

            if landmarks and len(landmarks) == 63:
                # Normalize landmarks
                current_coords = normalize_landmarks(landmarks)

                # Build feature vector based on model input size
                if input_size == 126:
                    if prev_coords is not None:
                        velocity = [c - p for c, p in zip(current_coords, prev_coords)]
                    else:
                        velocity = [0.0] * 63
                    features = current_coords + velocity
                else:
                    features = current_coords

                prev_coords = current_coords

                # Convert to tensor and predict
                input_tensor = torch.tensor([features], dtype=torch.float32).to(device)

                with torch.no_grad():
                    output = isl_model(input_tensor)
                    probabilities = torch.softmax(output, dim=1)
                    confidence, predicted_idx = torch.max(probabilities, 1)
                    predicted_sign = actions[predicted_idx.item()]
                    conf_value = float(confidence.item())

                # Send prediction back
                await websocket.send_json({
                    "predicted_sign": predicted_sign,
                    "confidence": conf_value
                })
            else:
                # No landmarks / invalid payload → signal "no hand"
                prev_coords = None
                await websocket.send_json({"predicted_sign": None, "confidence": 0})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
             await websocket.close()
        except:
             pass
    finally:
        with _connections_lock:
            _active_connections = max(0, _active_connections - 1)
        print(f"Client disconnected. Active connections: {_active_connections}")
