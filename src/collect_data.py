import cv2
import mediapipe as mp
import pandas as pd
import os
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

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

def main():
    model_path = "hand_landmarker.task"
    if not os.path.exists(model_path):
        import urllib.request
        print("Downloading hand landmarker model...")
        urllib.request.urlretrieve(
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            model_path,
        )

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)
    detector = vision.HandLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(0)
    dataset = []

    print("=" * 60)
    print("  ASL DATASET COLLECTOR v2  (with velocity features)")
    print("=" * 60)
    print()
    print("  Hold a letter key (a-z) or Spacebar while showing the sign.")
    print("  For J: hold 'j' and trace the J motion with your pinky.")
    print("  For W: hold 'w' and show the 3-finger W sign.")
    print()
    print("  Press '1' when finished to save.")
    print("=" * 60)

    prev_coords = None  # previous frame's normalized landmarks (63 floats)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        results = detector.detect(mp_image)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("1"):
            break

        if results.hand_landmarks:
            landmarks = results.hand_landmarks[0]

            # Draw green tracking dots
            for lm in landmarks:
                x, y = int(lm.x * frame.shape[1]), int(lm.y * frame.shape[0])
                cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)

            # Normalize current frame
            current_coords = normalize_landmarks(landmarks)

            # Compute velocity (delta from previous frame)
            if prev_coords is not None:
                velocity = [c - p for c, p in zip(current_coords, prev_coords)]
            else:
                velocity = [0.0] * 63  # first frame: no motion

            # If user is holding a valid letter a-z or space
            if ord("a") <= key <= ord("z") or key == ord(" "):
                letter = chr(key).upper() if key != ord(" ") else "SPACE"

                # Build 126-feature row: [63 landmarks] + [63 velocity]
                row = [letter] + current_coords + velocity
                dataset.append(row)

            prev_coords = current_coords
        else:
            # No hand detected: reset velocity tracking
            prev_coords = None

        # UI overlays
        status_text = f"Samples Recorded: {len(dataset)}"
        cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)
        if ord("a") <= key <= ord("z") or key == ord(" "):
            lbl = chr(key).upper() if key != ord(" ") else "SPACE"
            cv2.putText(frame, f"RECORDING -> {lbl}", (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        cv2.imshow("ASL Dataset Collector v2 (Velocity)", frame)

    cap.release()
    cv2.destroyAllWindows()

    if dataset:
        # Build column names: label, x0..z20 (landmarks), vx0..vz20 (velocity)
        columns = ["label"]
        for i in range(21):
            columns.extend([f"x{i}", f"y{i}", f"z{i}"])
        for i in range(21):
            columns.extend([f"vx{i}", f"vy{i}", f"vz{i}"])

        df = pd.DataFrame(dataset, columns=columns)
        os.makedirs(os.path.join(os.path.dirname(__file__), "..", "data"), exist_ok=True)
        csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "custom_landmarks_v2.csv")

        if os.path.exists(csv_path):
            df.to_csv(csv_path, mode="a", header=False, index=False)
            print(f"\nSUCCESS! Appended {len(dataset)} new velocity samples to {csv_path}")
        else:
            df.to_csv(csv_path, mode="w", header=True, index=False)
            print(f"\nSUCCESS! Created and saved {len(dataset)} velocity samples to {csv_path}")

if __name__ == "__main__":
    main()
