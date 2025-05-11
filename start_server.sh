
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

# Install required packages if not already installed
echo "Installing required Python packages..."
pip3 install -r requirements.txt

# Start the server
echo "Starting GStreamer WebSocket server..."
python3 server.py
