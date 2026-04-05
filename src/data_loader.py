import torch
from torch.utils.data import Dataset, random_split
import numpy as np
import pandas as pd
import os

class CustomLandmarkDataset(Dataset):
    """
    Loads landmark CSVs with either 63 columns (v1, static only)
    or 126 columns (v2, static + velocity).

    v1 data is automatically padded with zero-velocity to produce 126 features.
    """
    def __init__(self, csv_file):
        self.data = pd.read_csv(csv_file)

        # Extract raw features (everything after the label column)
        raw_features = self.data.iloc[:, 1:].values.astype(np.float32)
        num_cols = raw_features.shape[1]

        if num_cols == 63:
            # Legacy v1 data: pad with 63 zero-velocity columns
            padding = np.zeros((raw_features.shape[0], 63), dtype=np.float32)
            self.features = np.hstack([raw_features, padding])
            print(f"  [data_loader] Loaded v1 data ({num_cols} cols) → padded to 126 features")
        elif num_cols == 126:
            self.features = raw_features
            print(f"  [data_loader] Loaded v2 data (126 cols) with velocity features")
        else:
            raise ValueError(f"Unexpected feature count: {num_cols}. Expected 63 (v1) or 126 (v2).")

        # Map character labels → integer indices
        raw_labels = self.data.iloc[:, 0].values
        self.classes = sorted(list(np.unique(raw_labels)))
        self.label_map = {label: idx for idx, label in enumerate(self.classes)}
        self.labels = np.array([self.label_map[label] for label in raw_labels], dtype=np.int64)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        feature_tensor = torch.tensor(self.features[idx], dtype=torch.float32)
        label_tensor = torch.tensor(self.labels[idx], dtype=torch.long)
        return feature_tensor, label_tensor


def get_custom_datasets():
    """
    Load the dataset, preferring v2 (velocity) over v1 (static).
    If both exist, they are concatenated so old data is preserved.
    Returns (train_dataset, val_dataset, classes, input_size).
    """
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    v1_path = os.path.join(data_dir, 'custom_landmarks.csv')
    v2_path = os.path.join(data_dir, 'custom_landmarks_v2.csv')

    has_v1 = os.path.exists(v1_path)
    has_v2 = os.path.exists(v2_path)

    if not has_v1 and not has_v2:
        raise FileNotFoundError(
            "No dataset found. Run src/collect_data.py to record ASL samples first!"
        )

    frames = []

    if has_v1:
        df_v1 = pd.read_csv(v1_path)
        num_feat_cols = df_v1.shape[1] - 1  # minus label column
        if num_feat_cols == 63:
            # Pad with zero-velocity
            vel_cols = [f"v{c}" for c in df_v1.columns[1:]]
            vel_df = pd.DataFrame(
                np.zeros((len(df_v1), 63), dtype=np.float32),
                columns=vel_cols,
            )
            df_v1 = pd.concat([df_v1, vel_df], axis=1)
        frames.append(df_v1)
        print(f"  Loaded v1 dataset: {len(df_v1)} samples")

    if has_v2:
        df_v2 = pd.read_csv(v2_path)
        frames.append(df_v2)
        print(f"  Loaded v2 dataset: {len(df_v2)} samples")

    # Merge
    combined = pd.concat(frames, ignore_index=True)

    # Ensure column alignment: label + 126 features
    # Write to temp CSV for the Dataset class
    tmp_path = os.path.join(data_dir, '_combined_tmp.csv')
    combined.to_csv(tmp_path, index=False)

    full_dataset = CustomLandmarkDataset(tmp_path)
    input_size = 126

    # Clean up temp
    try:
        os.remove(tmp_path)
    except OSError:
        pass

    # 80/20 split
    train_sz = int(0.8 * len(full_dataset))
    val_sz = len(full_dataset) - train_sz
    train_dataset, val_dataset = random_split(full_dataset, [train_sz, val_sz])

    print(f"  Total samples: {len(full_dataset)} | Train: {train_sz} | Val: {val_sz}")
    print(f"  Classes ({len(full_dataset.classes)}): {full_dataset.classes}")
    print(f"  Input size: {input_size}")

    return train_dataset, val_dataset, full_dataset.classes, input_size