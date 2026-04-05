# Gestara

This project implements a deep learning model for translating sign language gestures into text using Python and PyTorch.

## Features

- Hand gesture recognition using MediaPipe
- Sequence modeling with LSTM or Transformer
- Training and inference pipelines

## Installation

1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`

## Usage

### Web Web App
1. **Frontend**: `cd frontend && npm run dev`
2. **Backend**: `python -m uvicorn backend.main:app --reload --port 8000`

### Machine Learning Workflows
- **Collect Custom Dataset**: Record your custom dataset directly via your camera. Just show it a letter, hold down that letter's key on your keyboard for a few seconds to map your hand, and hit 'q' to save it! Data will be appended to `data/custom_landmarks.csv`.
  `python src/collect_data.py`
  *(To reset your dataset, delete the file: `Remove-Item -Path "data\custom_landmarks.csv"`)*
- **Train the Model**: Train your new isolated MLP logic (This will likely compile your structural geometry model to 100% accuracy within five seconds!). 
  `python src/train.py`
- **Run Live Inference Demo**: Enjoy the flawlessly robust live testing pipeline, which bypasses the CNN limitations. 
  `python src/webcam_test.py`

## Project Structure

- `data/`: Dataset and preprocessing scripts
- `models/`: Saved model weights and checkpoints
- `src/`: Main source code
- `tests/`: Unit tests

## Requirements

- Python 3.8+
- PyTorch
- OpenCV
- MediaPipe