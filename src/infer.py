import torch
import numpy as np
from model import SignLanguageModel
from data_loader import test_dataset
from torchvision import transforms
from PIL import Image

def load_model(model_path='../models/sign_language_model.pth'):
    import os
    model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'sign_language_model.pth')
    num_classes = 24
    model = SignLanguageModel(num_classes=num_classes)
    model.load_state_dict(torch.load(model_path))
    model.eval()
    return model

def predict(model, features):
    with torch.no_grad():
        output = model(features.unsqueeze(0))
        predicted = torch.argmax(output, dim=1).item()
    letters = 'ABCDEFGHIKLMNOPQRSTUVWXY'  # excluding J and Z
    return letters[predicted]

if __name__ == "__main__":
    model = load_model()
    # Test on a few samples from test dataset
    letters = 'ABCDEFGHIKLMNOPQRSTUVWXY'  # excluding J and Z
    correct = 0
    total = 10  # test 10 samples
    for i in range(total):
        features, label = test_dataset[i]
        pred_char = predict(model, features)
        print(f"Sample {i+1}: True: {letters[label]}, Predicted: {pred_char}")
        if pred_char == letters[label]:
            correct += 1
    print(f"Accuracy on {total} test samples: {correct/total*100:.2f}%")