import torch
import torch.nn as nn
import torch.optim as optim
from model import LandmarkModel
from data_loader import get_custom_datasets
from torch.utils.data import DataLoader
import os

def train_model():
    print("=" * 60)
    print("  ASL Landmark MLP Trainer v2  (with velocity features)")
    print("=" * 60)

    # Load datasets (auto-merges v1 + v2 data)
    try:
        train_dataset, val_dataset, classes, input_size = get_custom_datasets()
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"  Using device: {device}")

    # Initialize model with correct input size
    num_classes = len(classes)
    model = LandmarkModel(num_classes=num_classes, input_size=input_size).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.003)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=20, gamma=0.5)

    print(f"  Model: {input_size} → 256 → 128 → {num_classes}")
    print()

    # Training loop
    num_epochs = 60
    best_val_acc = 0.0

    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        scheduler.step()

        # Validation
        model.eval()
        val_loss = 0.0
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                total += targets.size(0)
                correct += (predicted == targets).sum().item()

        val_acc = 100 * correct / total if total > 0 else 0

        if (epoch + 1) % 5 == 0 or epoch == 0:
            print(f"  Epoch {epoch+1:3d}/{num_epochs} | "
                  f"Train Loss: {running_loss/len(train_loader):.4f} | "
                  f"Val Acc: {val_acc:.2f}%")

        if val_acc > best_val_acc:
            best_val_acc = val_acc

    # Save model checkpoint with metadata
    model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'landmark_model.pth')
    torch.save({
        'state_dict': model.state_dict(),
        'classes': classes,
        'input_size': input_size,
    }, model_path)

    print()
    print(f"  Best Val Accuracy: {best_val_acc:.2f}%")
    print(f"  Model saved to: {model_path}")
    print(f"  Classes ({num_classes}): {classes}")
    print(f"  Input size: {input_size}")

if __name__ == "__main__":
    train_model()