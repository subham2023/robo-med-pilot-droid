import React, { useEffect, useState, useCallback } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Button } from "@/components/ui/button";
import { RefreshCw, Camera, CameraOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface NativeCameraProps {
  onError?: (message: string) => void;
}

const NativeCamera: React.FC<NativeCameraProps> = ({ onError }) => {
  const { toast } = useToast();
  const [initAttempted, setInitAttempted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const {
    videoRef,
    isLoading,
    error,
    hasFrontAndBackCamera,
    startCamera,
    switchCamera,
    isActive
  } = useCamera({ 
    autoStart: false,
    onError: (err) => {
      console.error("Camera error:", err);
      toast({
        title: "Camera Error",
        description: err,
        variant: "destructive",
      });
      if (onError) onError(err);
    }
  });

  // Stabilized camera initialization
  const initializeCamera = useCallback(async () => {
    if (isInitializing || isActive) return;
    
    setIsInitializing(true);
    try {
      await startCamera();
      setInitAttempted(true);
    } catch (err) {
      console.error("Failed to initialize camera:", err);
      if (onError) onError(err instanceof Error ? err.message : "Failed to initialize camera");
    } finally {
      setIsInitializing(false);
    }
  }, [startCamera, onError, isInitializing, isActive]);

  // Handle initial camera start
  useEffect(() => {
    if (!initAttempted && !isLoading && !isActive) {
      initializeCamera();
    }
  }, [initAttempted, isLoading, isActive, initializeCamera]);

  const handleRetry = async () => {
    setInitAttempted(false);
    await initializeCamera();
  };

  return (
    <div className="relative w-full h-full">
      {(isLoading || isInitializing) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center">
            <RefreshCw className="animate-spin h-12 w-12 mb-2 text-cyan-500" />
            <p className="text-white text-sm">Initializing camera...</p>
          </div>
        </div>
      )}
      
      {error && !isInitializing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 text-white">
          <CameraOff className="h-10 w-10 mb-2 text-red-400" />
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-4 text-white border-white hover:bg-white hover:text-gray-900"
            onClick={handleRetry}
            disabled={isInitializing}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="relative bg-black rounded-md flex-grow min-h-[300px] overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {isActive && hasFrontAndBackCamera && !error && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => switchCamera()}
            disabled={isInitializing}
            className="bg-white/10 hover:bg-white/20"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default NativeCamera; 