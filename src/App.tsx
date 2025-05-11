
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Providers } from "@/lib/providers";
import { useEffect } from "react";
import { toast } from "sonner";
import wsClient from "./services/WebSocketClient";
import streamManager from "./services/StreamManager";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Initialize services when the app loads
const initializeServices = () => {
  // Initialize WebSocket connection
  wsClient.connect().catch(error => {
    console.error("Failed to connect to WebSocket server:", error);
    toast.error("Failed to connect to backend server. Please check your connection.");
  });
  
  // Register global error handlers
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    toast.error("An error occurred: " + (event.reason?.message || "Unknown error"));
  });
  
  return () => {
    wsClient.disconnect();
    window.removeEventListener('unhandledrejection', () => {});
  };
};

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const cleanup = initializeServices();
    return cleanup;
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Providers>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </Providers>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
