import torch
import torch.nn as nn

class LandmarkModel(nn.Module):
    def __init__(self, num_classes=26, input_size=126):
        """
        MLP classifier for ASL fingerspelling.

        input_size=63   → static landmarks only (legacy v1 model)
        input_size=126  → landmarks (63) + velocity deltas (63) — supports J motion
        """
        super(LandmarkModel, self).__init__()
        # Input: 63 or 126 features
        self.fc1 = nn.Linear(input_size, 256)
        self.bn1 = nn.BatchNorm1d(256)
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(0.3)

        self.fc2 = nn.Linear(256, 128)
        self.bn2 = nn.BatchNorm1d(128)
        self.relu2 = nn.ReLU()
        self.dropout2 = nn.Dropout(0.2)

        self.fc3 = nn.Linear(128, num_classes)

    def forward(self, x):
        x = self.dropout1(self.relu1(self.bn1(self.fc1(x))))
        x = self.dropout2(self.relu2(self.bn2(self.fc2(x))))
        x = self.fc3(x)
        return x

# For backwards compatibility
SignLanguageModel = LandmarkModel

if __name__ == "__main__":
    # Test v2 model (126 input)
    model = LandmarkModel(num_classes=26, input_size=126)
    dummy = torch.randn(32, 126)
    out = model(dummy)
    print("LandmarkModel v2 (velocity):")
    print(model)
    print(f"Output shape: {out.shape} (Batch, Classes)")

    # Test legacy model (63 input)
    model_legacy = LandmarkModel(num_classes=24, input_size=63)
    dummy_legacy = torch.randn(32, 63)
    out_legacy = model_legacy(dummy_legacy)
    print(f"\nLegacy output shape: {out_legacy.shape}")