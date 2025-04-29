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
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const {
    videoRef,
    isLoading,
    error,
    hasFrontAndBackCamera,
    startCamera,
    switchCamera,
    isActive,
    cameraPosition,
    hasPermission
  } = useCamera({ 
    autoStart: true,
    preferredPosition: 'back',
    onError: (err) => {
      console.error("Camera error:", err);
      setDebugInfo(prev => `${new Date().toISOString()}: ${err}\n${prev}`);
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
    setDebugInfo(prev => `${new Date().toISOString()}: Initializing camera...\n${prev}`);
    
    try {
      const result = await startCamera();
      setDebugInfo(prev => `${new Date().toISOString()}: Camera start result: ${result}\n${prev}`);
    } catch (err) {
      console.error("Failed to initialize camera:", err);
      setDebugInfo(prev => `${new Date().toISOString()}: Camera init error: ${err}\n${prev}`);
      if (onError) onError(err instanceof Error ? err.message : "Failed to initialize camera");
    } finally {
      setIsInitializing(false);
    }
  }, [startCamera, onError, isInitializing, isActive]);

  const handleRetry = useCallback(async () => {
    if (isInitializing) return;
    setDebugInfo(prev => `${new Date().toISOString()}: Retrying camera initialization...\n${prev}`);
    await initializeCamera();
  }, [initializeCamera, isInitializing]);

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
          style={{ transform: cameraPosition === 'front' ? 'scaleX(-1)' : 'none' }}
          onLoadedMetadata={(e) => {
            console.log('Video metadata loaded:', e);
            const video = e.target as HTMLVideoElement;
            console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
            setDebugInfo(prev => 
              `${new Date().toISOString()}: Video loaded - ${video.videoWidth}x${video.videoHeight}\n${prev}`
            );
          }}
          onPlay={() => {
            console.log('Video playback started');
            setDebugInfo(prev => `${new Date().toISOString()}: Video playback started\n${prev}`);
          }}
          onError={(e) => {
            const video = e.target as HTMLVideoElement;
            console.error('Video element error:', video.error);
            setDebugInfo(prev => 
              `${new Date().toISOString()}: Video error - ${video.error?.message || 'Unknown error'}\n${prev}`
            );
          }}
        />

        {(isLoading || isInitializing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center">
              <RefreshCw className="animate-spin h-12 w-12 mb-2 text-cyan-500" />
              <p className="text-white text-sm">Initializing camera...</p>
              <p className="text-white/60 text-xs mt-2">
                Status: {hasPermission ? 'Permission granted' : 'Waiting for permission'}
              </p>
              <div className="text-white/60 text-xs mt-2 max-w-xs text-center">
                <p>Camera position: {cameraPosition}</p>
                <p>Active: {isActive ? 'Yes' : 'No'}</p>
                <p>Has front/back: {hasFrontAndBackCamera ? 'Yes' : 'No'}</p>
              </div>
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
            <div className="mt-4 max-w-md mx-auto p-4 bg-black/50 rounded text-xs text-white/60 font-mono whitespace-pre-wrap">
              {debugInfo}
            </div>
          </div>
        )}

        {isActive && hasFrontAndBackCamera && !error && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => switchCamera()}
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