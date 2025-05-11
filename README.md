
# GStreamer WebSocket Backend Server

This is a Python-based backend server that provides a WebSocket interface to GStreamer pipelines.

## Prerequisites

- Python 3.7 or higher
- GStreamer 1.0 with development files
- PyGObject
- websockets Python package

## Installation

1. Install GStreamer:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install libgstreamer1.0-dev gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-tools

   # macOS with Homebrew
   brew install gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly
   ```

2. Install Python dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```

## Running the Server

```bash
# Make the startup script executable
chmod +x start_server.sh

# Start the server
./start_server.sh
```

Alternatively, you can run the server directly:
```bash
python3 server.py
```

## Configuration

The server can be configured using the following environment variables:

- `GSTREAMER_WS_HOST`: Host to bind to (default: localhost)
- `GSTREAMER_WS_PORT`: Port to listen on (default: 8080)
- `GSTREAMER_WS_PATH`: WebSocket path (default: /gstreamer)

Example:
```bash
GSTREAMER_WS_PORT=9000 GSTREAMER_WS_HOST=0.0.0.0 python3 server.py
```

## WebSocket API

The server exposes the following WebSocket API:

### Create Pipeline

```json
{
  "type": "createPipeline",
  "payload": {
    "id": "pipeline-123",
    "description": "Example Pipeline",
    "pipeline": {
      "elements": [
        {
          "type": "videotestsrc",
          "properties": {
            "pattern": "ball"
          }
        },
        {
          "type": "autovideosink"
        }
      ]
    }
  }
}
```

### Start Pipeline

```json
{
  "type": "startPipeline",
  "payload": {
    "id": "pipeline-123"
  }
}
```

### Stop Pipeline

```json
{
  "type": "stopPipeline",
  "payload": {
    "id": "pipeline-123"
  }
}
```

### Delete Pipeline

```json
{
  "type": "deletePipeline",
  "payload": {
    "id": "pipeline-123"
  }
}
```

### Get Pipelines List

```json
{
  "type": "getPipelines"
}
```

## Health Monitoring

The server monitors the health of all active pipelines and broadcasts stats updates every second.
