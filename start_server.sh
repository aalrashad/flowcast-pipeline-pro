
#!/bin/bash

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3."
    exit 1
fi

# Check for GStreamer
if ! pkg-config --exists gstreamer-1.0; then
    echo "GStreamer 1.0 is required but not installed. Please install GStreamer 1.0 and its development files."
    exit 1
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv || { echo "Failed to create virtual environment. Make sure python3-venv is installed."; exit 1; }
fi

# Remove the virtual environment if it exists but is causing issues
if [ "$1" == "--recreate-venv" ]; then
    echo "Recreating Python virtual environment..."
    rm -rf venv
    python3 -m venv venv || { echo "Failed to recreate virtual environment. Make sure python3-venv is installed."; exit 1; }
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate || { echo "Failed to activate virtual environment."; exit 1; }

# Install required packages in virtual environment
echo "Installing required Python packages..."
pip install --no-cache-dir -r requirements.txt || { 
    echo "Failed to install required packages."
    echo "If facing 'externally-managed-environment' error, try running with --recreate-venv option."
    deactivate
    exit 1
}

# Start the server
echo "Starting GStreamer WebSocket server..."
python server.py

# Deactivate virtual environment when script exits
deactivate
