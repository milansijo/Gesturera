import cv2
import torch
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request
import os
import mediapipe as mp
from model import LandmarkModel

def normalize_landmarks(landmarks):
    """Normalize 21 landmarks: translate to wrist origin, scale to [-1, 1]."""
    wrist_x, wrist_y, wrist_z = landmarks[0].x, landmarks[0].y, landmarks[0].z
    coords = []
    for lm in landmarks:
        coords.extend([lm.x - wrist_x, lm.y - wrist_y, lm.z - wrist_z])

    max_val = max(abs(v) for v in coords)
    if max_val > 0.0:
        coords = [v / max_val for v in coords]
    return coords

def load_model():
    model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'landmark_model.pth')
    if not os.path.exists(model_path):
        raise FileNotFoundError("Model not found. Please run collect_data.py then train.py")

    checkpoint = torch.load(model_path, map_location='cpu')
    classes = checkpoint['classes']
    input_size = checkpoint.get('input_size', 63)  # default 63 for legacy models

    model = LandmarkModel(num_classes=len(classes), input_size=input_size)
    model.load_state_dict(checkpoint['state_dict'])
    model.eval()
    return model, classes, input_size

def main():
    try:
        model, classes, input_size = load_model()
        print(f"Loaded model: {len(classes)} classes, input_size={input_size}")
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    model_path = "hand_landmarker.task"
    if not os.path.exists(model_path):
        urllib.request.urlretrieve(
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            model_path,
        )

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)
    detector = vision.HandLandmarker.create_from_options(options)
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Cannot open webcam")
        return

    print("Press '1' to quit. Press 'c' to clear. Use Backspace to delete. Show sign in the frame.")

    sentence = ""
    current_prediction_steady = ""
    steady_count = 0
    FRAMES_TO_CONFIRM = 15
    last_appended = ""
    prev_coords = None  # for velocity computation

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        results = detector.detect(mp_image)

        pred_text = "No hand detected"

        if results.hand_landmarks:
            landmarks = results.hand_landmarks[0]

            # Draw tracking dots
            for lm in landmarks:
                x, y = int(lm.x * frame.shape[1]), int(lm.y * frame.shape[0])
                cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)

            # Normalize current frame
            current_coords = normalize_landmarks(landmarks)

            # Build feature vector based on model input size
            if input_size == 126:
                # Compute velocity from previous frame
                if prev_coords is not None:
                    velocity = [c - p for c, p in zip(current_coords, prev_coords)]
                else:
                    velocity = [0.0] * 63
                features = current_coords + velocity
            else:
                # Legacy 63-feature model
                features = current_coords

            prev_coords = current_coords

            feature_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)

            with torch.no_grad():
                output = model(feature_tensor)
                predicted_idx = torch.argmax(output, dim=1).item()
                raw_pred = classes[predicted_idx]
                pred_text = f'Prediction: {raw_pred}'

                # Debounce logic to build sentence
                if raw_pred == current_prediction_steady:
                    steady_count += 1
                else:
                    current_prediction_steady = raw_pred
                    steady_count = 0

                if steady_count > FRAMES_TO_CONFIRM and raw_pred != last_appended:
                    if raw_pred == 'SPACE':
                        sentence += " "
                    else:
                        sentence += raw_pred
                    last_appended = raw_pred
        else:
            # No hand: reset velocity tracking and last_appended lock
            last_appended = ""
            prev_coords = None

        # Display
        cv2.putText(frame, pred_text, (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 2)
        cv2.putText(frame, f"Sentence: {sentence}", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 0), 2)
        cv2.imshow('ASL Recognition (MLP + Velocity)', frame)

        key = cv2.waitKey(1)
        if key == ord('1'):
            break
        elif key == ord('c'):
            sentence = ""
            last_appended = ""
            steady_count = 0
        elif key in (8, 127, 0x110000 + 8, 2228224 + 8):  # Backspace
            if len(sentence) > 0:
                sentence = sentence[:-1]
                last_appended = ""
                steady_count = 0

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()