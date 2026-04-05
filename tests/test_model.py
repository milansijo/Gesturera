import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import torch
from src.model import SignLanguageModel
from src.data_loader import dataset

def test_model():
    num_classes = 24  # from the dataset
    model = SignLanguageModel(num_classes=num_classes)
    input_tensor = torch.randn(1, 63)  # 63 features
    output = model(input_tensor)
    assert output.shape == (1, num_classes), f"Expected (1, {num_classes}), got {output.shape}"
    print("Model test passed.")

if __name__ == "__main__":
    test_model()