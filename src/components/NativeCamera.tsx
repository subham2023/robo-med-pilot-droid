import React, { useEffect, useRef } from 'react';
import { useCamera } from '@/hooks/use-camera';
import { Button } from "@/components/ui/button";
import { RefreshCw, Camera, CameraOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface NativeCameraProps {
  onError?: (message: string) => void;
}

const NativeCamera: React.FC<NativeCameraProps> = ({ onError }) => {
  const { toast } = useToast();
  const {
    videoRef,
    devices,
    currentDevice,
    isLoading,
    isActive,
    hasPermission,
    error,
    cameraPosition,
    hasFrontAndBackCamera,
    startCamera,
    stopCamera,
    switchCamera,
    setDeviceId,
    setCameraPosition
  } = useCamera({ autoStart: true });

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleError = (message: string) => {
    console.error("Camera error:", message);
    toast({
      title: "Camera Error",
      description: message,
      variant: "destructive",
    });
    if (onError) {
      onError(message);
    }
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center">
            <RefreshCw className="animate-spin h-12 w-12 mb-2 text-cyan-500" />
            <p className="text-white text-sm">Initializing camera...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 text-white">
          <CameraOff className="h-10 w-10 mb-2 text-red-400" />
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="mt-4 text-white border-white hover:bg-white hover:text-gray-900"
            onClick={() => startCamera()}
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

      <div className="absolute bottom-4 right-4 flex gap-2">
        {hasFrontAndBackCamera && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => switchCamera()}
            className="bg-white/10 hover:bg-white/20"
          >
            <Camera className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default NativeCamera; 