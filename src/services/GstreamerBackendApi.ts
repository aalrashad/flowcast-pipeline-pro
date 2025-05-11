
/**
 * Type definitions for GStreamer backend API
 */

// API Request Types
export interface CreatePipelineRequest {
  id?: string;
  description?: string;
  pipeline: {
    elements: {
      type: string;
      properties: Record<string, any>;
    }[];
    options?: {
      latency?: number;
      bufferSize?: number;
      reconnect?: boolean;
      reconnectDelay?: number;
      maxReconnects?: number;
    };
  };
}

export interface PipelineActionRequest {
  id: string;
}

// API Response Types
export interface PipelineCreatedResponse {
  pipeline: {
    id: string;
    description: string;
    state: string;
    elements: {
      name: string;
      type: string;
      properties: Record<string, any>;
    }[];
  };
}

export interface PipelineStateChangedResponse {
  id: string;
  state: string;
  message?: string;
}

export interface PipelineErrorResponse {
  id: string;
  errorCode: string;
  errorMessage: string;
  details?: any;
}

export interface PipelineStatsResponse {
  id: string;
  stats: {
    bufferLevel?: number;
    receivedBytes?: number;
    framesReceived?: number;
    framesDropped?: number;
    bitrate?: number;
    latency?: number;
    jitter?: number;
  };
}

export interface PipelinesListResponse {
  pipelines: {
    id: string;
    description: string;
    state: string;
    elements: {
      name: string;
      type: string;
      properties: Record<string, any>;
    }[];
  }[];
}

// WebSocket Message Types
export type WebSocketMessageType = 
  'createPipeline' | 
  'startPipeline' | 
  'stopPipeline' | 
  'deletePipeline' | 
  'getPipelines' | 
  'pipelineCreated' | 
  'pipelineDeleted' | 
  'pipelineStateChanged' | 
  'pipelineError' | 
  'pipelineStats' | 
  'pipelinesList';

export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  payload: T;
  id?: string;
  timestamp?: number;
}

// WebSocket Events
export interface WebSocketErrorEvent extends Event {
  error: Error;
  message: string;
}

/**
 * Example backend server implementation (Node.js with WebSocket)
 * 
 * This is a placeholder to show how the backend would be structured.
 * In a real implementation, this would be in a separate Node.js project.
 * 
 * ```typescript
 * import WebSocket from 'ws';
 * import { spawn } from 'child_process';
 * import { 
 *   WebSocketMessage, 
 *   CreatePipelineRequest, 
 *   PipelineCreatedResponse 
 * } from './api-types';
 * 
 * // Set up WebSocket server
 * const wss = new WebSocket.Server({ port: 8080, path: '/gstreamer' });
 * 
 * // Store active pipelines and processes
 * const pipelines = new Map();
 * const processes = new Map();
 * 
 * wss.on('connection', (ws) => {
 *   console.log('Client connected');
 *   
 *   // Send current pipelines list
 *   sendPipelinesList(ws);
 *   
 *   ws.on('message', (message) => {
 *     try {
 *       const data = JSON.parse(message.toString()) as WebSocketMessage;
 *       
 *       switch (data.type) {
 *         case 'createPipeline':
 *           handleCreatePipeline(ws, data.payload);
 *           break;
 *         case 'startPipeline':
 *           handleStartPipeline(ws, data.payload);
 *           break;
 *         // Handle other message types...
 *       }
 *     } catch (error) {
 *       console.error('Error processing message', error);
 *     }
 *   });
 * });
 * 
 * function handleCreatePipeline(ws, request: CreatePipelineRequest) {
 *   const id = request.id || `pipeline-${Date.now()}`;
 *   
 *   // Build GStreamer pipeline string from elements
 *   const pipelineString = buildPipelineString(request.pipeline.elements);
 *   
 *   // Create pipeline object
 *   const pipeline = {
 *     id,
 *     description: request.description || `Pipeline ${id}`,
 *     state: 'NULL',
 *     elements: request.pipeline.elements
 *   };
 *   
 *   pipelines.set(id, pipeline);
 *   
 *   // Send confirmation
 *   sendToClient(ws, {
 *     type: 'pipelineCreated',
 *     payload: { pipeline }
 *   });
 * }
 * 
 * function handleStartPipeline(ws, request) {
 *   const { id } = request;
 *   const pipeline = pipelines.get(id);
 *   
 *   if (!pipeline) {
 *     sendErrorToClient(ws, id, 'not-found', 'Pipeline not found');
 *     return;
 *   }
 *   
 *   // Build pipeline string
 *   const pipelineString = buildPipelineString(pipeline.elements);
 *   
 *   // Launch GStreamer process
 *   const process = spawn('gst-launch-1.0', ['-e', pipelineString]);
 *   processes.set(id, process);
 *   
 *   // Update state
 *   pipeline.state = 'PLAYING';
 *   pipelines.set(id, pipeline);
 *   
 *   // Send state change notification
 *   sendToClient(ws, {
 *     type: 'pipelineStateChanged',
 *     payload: {
 *       id,
 *       state: 'PLAYING'
 *     }
 *   });
 *   
 *   // Set up process event handlers
 *   process.stdout.on('data', (data) => {
 *     // Parse GStreamer output for stats
 *     const stats = parseGstreamerOutput(data.toString());
 *     
 *     if (stats) {
 *       sendToClient(ws, {
 *         type: 'pipelineStats',
 *         payload: {
 *           id,
 *           stats
 *         }
 *       });
 *     }
 *   });
 *   
 *   process.stderr.on('data', (data) => {
 *     // Check for errors
 *     const errorMessage = data.toString();
 *     console.error(`GStreamer error (${id}):`, errorMessage);
 *     
 *     if (errorMessage.includes('ERROR')) {
 *       sendToClient(ws, {
 *         type: 'pipelineError',
 *         payload: {
 *           id,
 *           errorCode: 'gst-error',
 *           errorMessage
 *         }
 *       });
 *     }
 *   });
 * }
 * 
 * function buildPipelineString(elements) {
 *   return elements.map(element => {
 *     const propsString = Object.entries(element.properties || {})
 *       .map(([key, value]) => `${key}=${value}`)
 *       .join(' ');
 *     
 *     return `${element.type} ${propsString}`.trim();
 *   }).join(' ! ');
 * }
 * 
 * function sendToClient(ws, message: WebSocketMessage) {
 *   if (ws.readyState === WebSocket.OPEN) {
 *     ws.send(JSON.stringify({
 *       ...message,
 *       timestamp: Date.now()
 *     }));
 *   }
 * }
 * 
 * function sendErrorToClient(ws, id, code, message) {
 *   sendToClient(ws, {
 *     type: 'pipelineError',
 *     payload: {
 *       id,
 *       errorCode: code,
 *       errorMessage: message
 *     }
 *   });
 * }
 * 
 * function sendPipelinesList(ws) {
 *   sendToClient(ws, {
 *     type: 'pipelinesList',
 *     payload: {
 *       pipelines: Array.from(pipelines.values())
 *     }
 *   });
 * }
 * 
 * function parseGstreamerOutput(output) {
 *   // Example implementation that parses GStreamer debug output
 *   // In a real implementation, this would be more sophisticated
 *   const stats = {};
 *   
 *   if (output.includes('buffering')) {
 *     const match = output.match(/buffering\s+(\d+)/);
 *     if (match && match[1]) {
 *       stats.bufferLevel = parseInt(match[1], 10);
 *     }
 *   }
 *   
 *   // Parse other stats (bitrate, frames, etc.)
 *   
 *   return Object.keys(stats).length > 0 ? stats : null;
 * }
 * ```
 */

// No actual implementation here - this is just for documentation
export const backendApiExample = {
  description: "This file contains type definitions for the GStreamer backend API."
};
