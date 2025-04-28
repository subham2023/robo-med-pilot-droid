
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw } from "lucide-react";

interface CameraFeedProps {
  cameraUrl: string;
  onError?: () => void;
}

const CameraFeed = ({ cameraUrl, onError }: CameraFeedProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    setError(false);
    
    const timeout = setTimeout(() => {
      if (loading) {
        setError(true);
        setLoading(false);
        if (onError) onError();
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [cameraUrl]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    if (onError) onError();
    toast({
      title: "Camera Connection Failed",
      description: "Unable to load camera feed. Please check URL and connection.",
      variant: "destructive",
    });
  };

  const reloadCamera = () => {
    setLoading(true);
    setError(false);
    
    if (iframeRef.current) {
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = cameraUrl;
        }
      }, 300);
    }
  };

  if (!cameraUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        No camera URL configured
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 text-white">
          <p>Failed to load camera feed</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={reloadCamera} 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src={cameraUrl}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        title="Camera Feed"
        allow="camera;microphone"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};

export default CameraFeed;
