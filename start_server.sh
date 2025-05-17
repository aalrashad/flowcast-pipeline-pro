
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

# Process command line arguments
RECREATE_VENV=0
VERBOSE=0
for arg in "$@"; do
    case $arg in
        --recreate-venv)
            RECREATE_VENV=1
            echo "Will recreate virtual environment..."
            shift
            ;;
        --verbose)
            VERBOSE=1
            echo "Enabling verbose logging..."
            shift
            ;;
        *)
            # Unknown option
            ;;
    esac
done

# Remove the virtual environment if it exists and --recreate-venv was passed
if [ $RECREATE_VENV -eq 1 ] && [ -d "venv" ]; then
    echo "Removing existing virtual environment..."
    rm -rf venv
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv || { 
        echo "Failed to create virtual environment."
        echo "Make sure python3-venv is installed or try:"
        echo "sudo apt-get install python3-venv"
        exit 1
    }
    # Flag that we need to install packages
    INSTALL_PACKAGES=1
else
    INSTALL_PACKAGES=0
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate || { 
    echo "Failed to activate virtual environment."
    exit 1
}

# Install required packages if we created a new venv or --recreate-venv was passed
if [ $RECREATE_VENV -eq 1 ] || [ $INSTALL_PACKAGES -eq 1 ]; then
    echo "Installing required Python packages..."
    pip install --no-cache-dir -r requirements.txt || { 
        echo "Failed to install required packages."
        
        # Check if the issue is with an externally managed environment
        if pip --version | grep -q "pip 23"; then
            echo ""
            echo "Detected 'externally-managed-environment' error."
            echo "Trying to fix with '--break-system-packages' flag..."
            pip install --break-system-packages -r requirements.txt || {
                echo "Still failed. Please try manually running:"
                echo "python3 -m pip install -r requirements.txt --break-system-packages"
                deactivate
                exit 1
            }
        else
            echo "If facing 'externally-managed-environment' error, try running with --recreate-venv option."
            deactivate
            exit 1
        fi
    }
fi

# Set environment variables for server to listen on all interfaces
export GSTREAMER_WS_HOST="0.0.0.0"  # Listen on all interfaces
export GSTREAMER_WS_PORT="8080"     # Use port 8080
export GSTREAMER_WS_PATH="/gstreamer"  # WebSocket path

if [ $VERBOSE -eq 1 ]; then
    export GSTREAMER_LOG_LEVEL="DEBUG"
    echo "Log level set to DEBUG"
else
    export GSTREAMER_LOG_LEVEL="INFO"  # Default log level
fi

echo ""
echo "======================================"
echo "Starting GStreamer WebSocket server..."
echo "Listening on all interfaces (0.0.0.0)"
echo "Port: 8080"
echo "WebSocket path: /gstreamer"
echo "Log level: $GSTREAMER_LOG_LEVEL"
echo "======================================"
echo ""
echo "Connect at: ws://localhost:8080/gstreamer"
echo ""

# Start the server
python server.py

# Deactivate virtual environment when script exits
deactivate
