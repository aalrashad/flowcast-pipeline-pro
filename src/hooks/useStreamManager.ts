
import { useState, useEffect } from 'react';
import streamManager, { Stream, StreamType, StreamSource, StreamDestination, StreamPriority } from '@/services/StreamManager';

export const useStreamManager = (streamId?: string) => {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [systemStats, setSystemStats] = useState({
    totalStreams: 0,
    activeStreams: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    bandwidthUsage: 0
  });
  
  // Load all streams initially
  useEffect(() => {
    const loadStreams = () => {
      const allStreams = streamManager.getStreams();
      setStreams(allStreams);
      setSystemStats(streamManager.getSystemStats());
    };
    
    loadStreams();
    
    // Set up an interval to refresh stream list
    const interval = setInterval(loadStreams, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Subscribe to a specific stream if ID is provided
  useEffect(() => {
    if (!streamId) return;
    
    const stream = streamManager.getStream(streamId);
    if (stream) {
      setSelectedStream(stream);
    }
    
    const unsubscribe = streamManager.subscribeToStream(streamId, (updatedStream) => {
      setSelectedStream(updatedStream);
      
      // Also update the stream in the full list
      setStreams(prev => prev.map(s => s.id === updatedStream.id ? updatedStream : s));
      
      // Update system stats
      setSystemStats(streamManager.getSystemStats());
    });
    
    return () => unsubscribe();
  }, [streamId]);
  
  // Functions for stream management
  const createStream = async (options: {
    name: string;
    type: StreamType;
    source: StreamSource;
    destination?: StreamDestination;
    priority?: StreamPriority;
    metadata?: Record<string, any>;
  }) => {
    try {
      const stream = await streamManager.createStream(options);
      setStreams(prev => [...prev, stream]);
      setSystemStats(streamManager.getSystemStats());
      return stream;
    } catch (error) {
      console.error('Failed to create stream:', error);
      throw error;
    }
  };
  
  const startStream = async (id: string) => {
    try {
      await streamManager.startStream(id);
      setSystemStats(streamManager.getSystemStats());
    } catch (error) {
      console.error('Failed to start stream:', error);
      throw error;
    }
  };
  
  const stopStream = async (id: string) => {
    try {
      await streamManager.stopStream(id);
      setSystemStats(streamManager.getSystemStats());
    } catch (error) {
      console.error('Failed to stop stream:', error);
      throw error;
    }
  };
  
  const deleteStream = async (id: string) => {
    try {
      await streamManager.deleteStream(id);
      // Remove from local state
      setStreams(prev => prev.filter(s => s.id !== id));
      if (selectedStream?.id === id) {
        setSelectedStream(null);
      }
      setSystemStats(streamManager.getSystemStats());
    } catch (error) {
      console.error('Failed to delete stream:', error);
      throw error;
    }
  };
  
  const restartStream = async (id: string) => {
    try {
      await streamManager.restartStream(id);
    } catch (error) {
      console.error('Failed to restart stream:', error);
      throw error;
    }
  };
  
  return {
    streams,
    selectedStream,
    systemStats,
    createStream,
    startStream,
    stopStream,
    deleteStream,
    restartStream
  };
};
