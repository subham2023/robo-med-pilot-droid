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
  const [isInitializing, setIsInitializing] = useState(false);
  
  const {
    videoRef,
    isLoading,
    error,
    hasFrontAndBackCamera,
    startCamera,
    switchCamera,
    isActive,
    cameraPosition
  } = useCamera({ 
    autoStart: true,
    preferredPosition: 'back',
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

  const initializeCamera = useCallback(async () => {
    if (isInitializing || isActive) return;
    
    setIsInitializing(true);
    try {
      await startCamera();
    } catch (err) {
      console.error("Failed to initialize camera:", err);
      if (onError) onError(err instanceof Error ? err.message : "Failed to initialize camera");
    } finally {
      setIsInitializing(false);
    }
  }, [startCamera, onError, isInitializing, isActive]);

  const handleRetry = useCallback(async () => {
    if (isInitializing) return;
    await initializeCamera();
  }, [initializeCamera, isInitializing]);

  const handleSwitchCamera = useCallback(async () => {
    if (isInitializing) return;
    try {
      await switchCamera();
    } catch (err) {
      console.error("Failed to switch camera:", err);
      toast({
        title: "Camera Switch Error",
        description: "Failed to switch camera. Please try again.",
        variant: "destructive",
      });
    }
  }, [switchCamera, isInitializing, toast]);

  useEffect(() => {
    if (!isActive && !isLoading && !isInitializing) {
      initializeCamera();
    }
  }, [isActive, isLoading, isInitializing, initializeCamera]);

  return (
    <div className="relative w-full h-full">
      <div className="relative bg-black rounded-md flex-grow min-h-[300px] overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {(isLoading || isInitializing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center">
              <RefreshCw className="animate-spin h-12 w-12 mb-2 text-cyan-500" />
              <p className="text-white text-sm">Initializing camera...</p>
            </div>
          </div>
        )}
        
        {error && !isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-10">
            <CameraOff className="h-10 w-10 mb-2 text-red-400" />
            <p className="text-white text-center px-4 mb-4">{error}</p>
            <Button 
              variant="outline" 
              className="bg-transparent text-white border-white hover:bg-white/10"
              onClick={handleRetry}
              disabled={isInitializing}
            >
              Try Again
            </Button>
          </div>
        )}

        {isActive && hasFrontAndBackCamera && !error && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwitchCamera}
              disabled={isInitializing}
              className="bg-black/20 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white"
              title={`Switch to ${cameraPosition === 'front' ? 'back' : 'front'} camera`}
            >
              <Camera className="h-4 w-4" />
              <span className="sr-only">
                Switch to {cameraPosition === 'front' ? 'back' : 'front'} camera
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NativeCamera; 