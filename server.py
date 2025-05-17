#!/usr/bin/env python3
import asyncio
import json
import logging
import os
import signal
import sys
import gi
import threading

gi.require_version('Gst', '1.0')
from gi.repository import Gst, GLib

import websockets
from websockets.exceptions import ConnectionClosed

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Initialize GStreamer
Gst.init(None)

# Global variables
pipelines = {}  # Store active pipelines
mainloop = None  # GLib mainloop
mainloop_thread = None  # Thread for running the GLib mainloop
clients = set()  # Connected clients

# Pipeline status mapping
PIPELINE_STATES = {
    Gst.State.NULL: "NULL",
    Gst.State.READY: "READY",
    Gst.State.PAUSED: "PAUSED",
    Gst.State.PLAYING: "PLAYING"
}

class GstreamerPipeline:
    def __init__(self, pipeline_id, description, elements):
        self.id = pipeline_id
        self.description = description
        self.elements = elements
        self.pipeline = None
        self.stats = {}
        self.error = None
        self.bus_watch_id = None
        
    def build_pipeline_string(self):
        """Convert elements to a GStreamer pipeline string"""
        pipeline_string = []
        for element in self.elements:
            el_str = element['type']
            if 'properties' in element:
                for prop_name, prop_value in element['properties'].items():
                    el_str += f" {prop_name}={prop_value}"
            pipeline_string.append(el_str)
        return " ! ".join(pipeline_string)
    
    def create(self):
        """Create the pipeline"""
        try:
            pipeline_string = self.build_pipeline_string()
            logger.info(f"Creating pipeline: {pipeline_string}")
            self.pipeline = Gst.parse_launch(pipeline_string)
            self.pipeline.set_name(self.id)
            
            # Setup bus watch
            bus = self.pipeline.get_bus()
            self.bus_watch_id = bus.add_watch(GLib.PRIORITY_DEFAULT, self.bus_callback)
            
            return {
                "id": self.id,
                "description": self.description,
                "state": "NULL",
                "elements": self.elements
            }
        except Exception as e:
            logger.error(f"Error creating pipeline: {e}")
            self.error = str(e)
            return {
                "id": self.id,
                "errorCode": "creation-failed",
                "errorMessage": str(e)
            }
    
    def start(self):
        """Start the pipeline"""
        if not self.pipeline:
            return {
                "id": self.id,
                "errorCode": "not-created",
                "errorMessage": "Pipeline not created"
            }
        
        ret = self.pipeline.set_state(Gst.State.PLAYING)
        if ret == Gst.StateChangeReturn.FAILURE:
            error = "Failed to start pipeline"
            logger.error(error)
            return {
                "id": self.id,
                "errorCode": "start-failed",
                "errorMessage": error
            }
        
        return {
            "id": self.id,
            "state": "PLAYING",
            "message": "Pipeline started"
        }
    
    def stop(self):
        """Stop the pipeline"""
        if not self.pipeline:
            return {
                "id": self.id,
                "errorCode": "not-created",
                "errorMessage": "Pipeline not created"
            }
        
        ret = self.pipeline.set_state(Gst.State.PAUSED)
        if ret == Gst.StateChangeReturn.FAILURE:
            error = "Failed to pause pipeline"
            logger.error(error)
            return {
                "id": self.id,
                "errorCode": "stop-failed",
                "errorMessage": error
            }
        
        return {
            "id": self.id,
            "state": "PAUSED",
            "message": "Pipeline paused"
        }
    
    def delete(self):
        """Delete the pipeline"""
        if self.pipeline:
            self.pipeline.set_state(Gst.State.NULL)
            if self.bus_watch_id:
                # Remove bus watch
                bus = self.pipeline.get_bus()
                bus.remove_watch(self.bus_watch_id)
                self.bus_watch_id = None
            
            self.pipeline = None
        
        return {
            "id": self.id,
            "message": "Pipeline deleted"
        }
    
    def get_status(self):
        """Get pipeline status and stats"""
        if not self.pipeline:
            return {
                "id": self.id,
                "state": "NULL",
                "stats": {}
            }
        
        success, state, pending = self.pipeline.get_state(0)
        state_name = PIPELINE_STATES.get(state, "UNKNOWN")
        
        # Get pipeline stats - this would be more complex in a real implementation
        # and would involve querying elements for their stats
        position = 0
        success, position_ns = self.pipeline.query_position(Gst.Format.TIME)
        if success:
            position = position_ns / Gst.SECOND
        
        # Update stats
        self.stats = {
            "bufferHealth": 80,  # Example value, would need real implementation
            "bitrate": 2500000,  # Example value, would need real implementation
            "framesReceived": 100 + int(position * 30),  # Simulated frames at 30fps
            "framesDropped": int(position * 0.5),  # Simulated dropped frames
            "latency": 150,  # Example value in ms
        }
        
        return {
            "id": self.id,
            "state": state_name,
            "stats": self.stats
        }
    
    def bus_callback(self, bus, message):
        """Handle pipeline messages"""
        if message.type == Gst.MessageType.ERROR:
            err, debug = message.parse_error()
            logger.error(f"Pipeline {self.id} error: {err.message}")
            self.error = err.message
            
            # Send error to clients
            asyncio.run_coroutine_threadsafe(
                broadcast_message({
                    "type": "pipelineError",
                    "payload": {
                        "id": self.id,
                        "errorCode": "gst-error",
                        "errorMessage": err.message,
                        "details": debug
                    }
                }), asyncio.get_event_loop()
            )
            
        elif message.type == Gst.MessageType.EOS:
            logger.info(f"Pipeline {self.id} reached end of stream")
            
            # Send EOS to clients
            asyncio.run_coroutine_threadsafe(
                broadcast_message({
                    "type": "pipelineStateChanged",
                    "payload": {
                        "id": self.id,
                        "state": "NULL",
                        "message": "End of stream"
                    }
                }), asyncio.get_event_loop()
            )
            
        elif message.type == Gst.MessageType.STATE_CHANGED:
            if message.src == self.pipeline:
                old_state, new_state, pending_state = message.parse_state_changed()
                old_state_name = PIPELINE_STATES.get(old_state, "UNKNOWN")
                new_state_name = PIPELINE_STATES.get(new_state, "UNKNOWN")
                logger.info(f"Pipeline {self.id} state changed from {old_state_name} to {new_state_name}")
                
                # Send state change to clients
                asyncio.run_coroutine_threadsafe(
                    broadcast_message({
                        "type": "pipelineStateChanged",
                        "payload": {
                            "id": self.id,
                            "state": new_state_name,
                            "message": f"State changed from {old_state_name} to {new_state_name}"
                        }
                    }), asyncio.get_event_loop()
                )
        
        # Return true to continue listening for messages
        return True

async def broadcast_message(message):
    """Broadcast message to all connected clients"""
    if clients:
        message['timestamp'] = int(asyncio.get_event_loop().time() * 1000)
        encoded_message = json.dumps(message)
        await asyncio.gather(
            *[client.send(encoded_message) for client in clients],
            return_exceptions=True
        )

async def send_stats_updates():
    """Send periodic stats updates to clients"""
    while True:
        try:
            for pipeline_id, pipeline in pipelines.items():
                status = pipeline.get_status()
                if status['state'] == 'PLAYING':
                    await broadcast_message({
                        "type": "pipelineStats",
                        "payload": {
                            "id": pipeline_id,
                            "stats": status['stats']
                        }
                    })
            await asyncio.sleep(1)  # Update every second
        except Exception as e:
            logger.error(f"Error sending stats updates: {e}")
            await asyncio.sleep(5)  # Retry after 5 seconds

async def handle_websocket(websocket, path):
    """Handle WebSocket connections"""
    # Register client
    clients.add(websocket)
    client_id = id(websocket)
    logger.info(f"Client connected: {client_id}")
    
    try:
        # Send current pipelines list
        pipelines_list = [pipeline.get_status() for pipeline in pipelines.values()]
        await websocket.send(json.dumps({
            "type": "pipelinesList",
            "payload": {
                "pipelines": pipelines_list
            },
            "timestamp": int(asyncio.get_event_loop().time() * 1000)
        }))
        
        # Process incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get('type')
                payload = data.get('payload', {})
                logger.debug(f"Received message: {message_type}")
                
                if message_type == "ping":
                    # Respond to ping
                    await websocket.send(json.dumps({
                        "type": "pong",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000)
                    }))
                
                elif message_type == "createPipeline":
                    # Create a new pipeline
                    pipeline_id = payload.get('id', f"pipeline-{int(asyncio.get_event_loop().time() * 1000)}")
                    description = payload.get('description', f"Pipeline {pipeline_id}")
                    pipeline_def = payload.get('pipeline', {})
                    elements = pipeline_def.get('elements', [])
                    
                    # Validate input
                    if not elements:
                        await websocket.send(json.dumps({
                            "type": "pipelineError",
                            "payload": {
                                "id": pipeline_id,
                                "errorCode": "invalid-pipeline",
                                "errorMessage": "No pipeline elements provided"
                            },
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                        continue
                    
                    # Create pipeline
                    pipeline = GstreamerPipeline(pipeline_id, description, elements)
                    result = pipeline.create()
                    
                    if "errorCode" in result:
                        await websocket.send(json.dumps({
                            "type": "pipelineError",
                            "payload": result,
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                    else:
                        # Store pipeline
                        pipelines[pipeline_id] = pipeline
                        
                        # Send success response
                        await websocket.send(json.dumps({
                            "type": "pipelineCreated",
                            "payload": {
                                "pipeline": result
                            },
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                
                elif message_type == "startPipeline":
                    # Start a pipeline
                    pipeline_id = payload.get('id')
                    if not pipeline_id or pipeline_id not in pipelines:
                        await websocket.send(json.dumps({
                            "type": "pipelineError",
                            "payload": {
                                "id": pipeline_id,
                                "errorCode": "not-found",
                                "errorMessage": "Pipeline not found"
                            },
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                        continue
                    
                    result = pipelines[pipeline_id].start()
                    
                    if "errorCode" in result:
                        await websocket.send(json.dumps({
                            "type": "pipelineError",
                            "payload": result,
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                    else:
                        await websocket.send(json.dumps({
                            "type": "pipelineStateChanged",
                            "payload": result,
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                
                elif message_type == "stopPipeline":
                    # Stop a pipeline
                    pipeline_id = payload.get('id')
                    if not pipeline_id or pipeline_id not in pipelines:
                        await websocket.send(json.dumps({
                            "type": "pipelineError",
                            "payload": {
                                "id": pipeline_id,
                                "errorCode": "not-found",
                                "errorMessage": "Pipeline not found"
                            },
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                        continue
                    
                    result = pipelines[pipeline_id].stop()
                    
                    if "errorCode" in result:
                        await websocket.send(json.dumps({
                            "type": "pipelineError",
                            "payload": result,
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                    else:
                        await websocket.send(json.dumps({
                            "type": "pipelineStateChanged",
                            "payload": result,
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                
                elif message_type == "deletePipeline":
                    # Delete a pipeline
                    pipeline_id = payload.get('id')
                    if not pipeline_id or pipeline_id not in pipelines:
                        await websocket.send(json.dumps({
                            "type": "pipelineError",
                            "payload": {
                                "id": pipeline_id,
                                "errorCode": "not-found",
                                "errorMessage": "Pipeline not found"
                            },
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        }))
                        continue
                    
                    result = pipelines[pipeline_id].delete()
                    del pipelines[pipeline_id]
                    
                    await websocket.send(json.dumps({
                        "type": "pipelineDeleted",
                        "payload": result,
                        "timestamp": int(asyncio.get_event_loop().time() * 1000)
                    }))
                
                elif message_type == "getPipelines":
                    # Get list of all pipelines
                    pipelines_list = [pipeline.get_status() for pipeline in pipelines.values()]
                    await websocket.send(json.dumps({
                        "type": "pipelinesList",
                        "payload": {
                            "pipelines": pipelines_list
                        },
                        "timestamp": int(asyncio.get_event_loop().time() * 1000)
                    }))
                
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received: {message}")
            except Exception as e:
                logger.error(f"Error processing message: {e}")
    
    except ConnectionClosed:
        logger.info(f"Client disconnected: {client_id}")
    finally:
        # Unregister client
        clients.remove(websocket)

def mainloop_thread_func():
    """Function to run the GLib mainloop in a separate thread"""
    global mainloop
    mainloop = GLib.MainLoop()
    mainloop.run()

# Function to check if a request path matches our WebSocket path
async def path_filter(path, request_headers):
    ws_path = os.environ.get("GSTREAMER_WS_PATH", "/gstreamer")
    # Log the path for debugging
    logging.debug(f"WebSocket request path: {path}, expected: {ws_path}")
    
    # Check if the path matches exactly or if it's a root path when no path is configured
    if path == ws_path or (ws_path == "/" and path == ""):
        return None
    
    # Otherwise return a 404
    logging.warning(f"Rejected WebSocket connection to invalid path: {path}")
    return 404, {"Content-Type": "text/plain"}, b'Not Found - WebSocket endpoint is at ' + ws_path.encode()

async def main():
    """Main function to start the server"""
    global mainloop_thread
    
    # Get host and port from environment variables or use defaults
    host = os.environ.get("GSTREAMER_WS_HOST", "0.0.0.0")
    port = int(os.environ.get("GSTREAMER_WS_PORT", "8080"))
    ws_path = os.environ.get("GSTREAMER_WS_PATH", "/gstreamer")
    
    logging.info(f"Starting WebSocket server on {host}:{port}{ws_path}")
    
    # Start GStreamer main loop in a separate thread
    mainloop_thread = threading.Thread(target=mainloop_thread_func)
    mainloop_thread.daemon = True
    mainloop_thread.start()
    
    # Start periodic stats updates
    stats_task = asyncio.create_task(send_stats_updates())
    
    # Start WebSocket server with proper path filtering and increased max_size for larger messages
    async with websockets.serve(
        handle_websocket, 
        host, 
        port, 
        process_request=path_filter,
        max_size=10_485_760,  # Increase max message size to 10MB
        ping_interval=30,      # Send ping every 30 seconds
        ping_timeout=10        # Wait 10 seconds for pong before closing
    ):
        # Handle signals for graceful shutdown
        loop = asyncio.get_event_loop()
        for signame in ('SIGINT', 'SIGTERM'):
            loop.add_signal_handler(
                getattr(signal, signame),
                lambda: asyncio.create_task(shutdown(loop, stats_task))
            )
        
        logging.info(f"WebSocket server started on ws://{host}:{port}{ws_path}")
        await asyncio.Future()  # Run forever

async def shutdown(loop, stats_task):
    """Shutdown the server gracefully"""
    logger.info("Shutting down...")
    
    # Stop all pipelines
    for pipeline_id, pipeline in list(pipelines.items()):
        logger.info(f"Stopping pipeline {pipeline_id}")
        pipeline.delete()
        del pipelines[pipeline_id]
    
    # Stop GLib mainloop
    if mainloop and mainloop.is_running():
        mainloop.quit()
    
    # Close all WebSocket connections
    if clients:
        await asyncio.gather(*[client.close() for client in clients])
    
    # Exit
    loop.stop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupted by user.")
    except Exception as e:
        logger.error(f"Unhandled exception: {e}")
        sys.exit(1)
