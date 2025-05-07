# Check if Python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python is not installed. Please install Python 3.8 or later."
    exit 1
}

# Create a virtual environment
Write-Host "Creating virtual environment..."
python -m venv whisper-env

# Activate the environment
Write-Host "Activating virtual environment..."
.\whisper-env\Scripts\Activate

# Install dependencies
Write-Host "Installing dependencies..."
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install openai-whisper

# Verify installation
Write-Host "Verifying Whisper installation..."
python -c "import whisper; print('Whisper version:', whisper.__version__)"

Write-Host "Whisper installation completed successfully!" 