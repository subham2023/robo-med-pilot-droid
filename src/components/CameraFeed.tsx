
/// <reference types="react" />

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Camera, CameraOff, Loader, Smartphone, SwitchCamera } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCameraUrl } from '@/utils/cameraUtils';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useCamera } from '@/hooks/use-camera';

interface CameraFeedProps {
  cameraUrl: string;
  onError?: (message: string) => void;
  onUrlChange?: (url: string) => void;
}

interface SuggestedUrl {
  name: string;
  url: string;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  cameraUrl, 
  onError, 
  onUrlChange
}) => {
  // Enhanced state management
  const [useCorsBypass, setUseCorsBypass] = useState(true);
  const [videoMode, setVideoMode] = useState<'direct' | 'mjpeg' | 'img' | 'webcam'>('direct');
  const [usingDeviceCamera, setUsingDeviceCamera] = useState(false);
  const [suggestedUrls] = useState<SuggestedUrl[]>([]);
  const { toast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);
  const [retryAttempts, setRetryAttempts] = useState<Record<'direct' | 'mjpeg' | 'img' | 'webcam', number>>({
    direct: 0,
    mjpeg: 0,
    img: 0,
    webcam: 0
  });
  const maxRetries = 3;
  const corsProxyUrl = "https://corsproxy.io/?";

  // Use our new camera hook for device camera management
  const camera = useCamera({
    autoStart: false,
    preferredPosition: 'front'
  });

  // Reset state when camera URL changes
  useEffect(() => {
    if (!usingDeviceCamera) {
      setRetryAttempts({
        direct: 0,
        mjpeg: 0,
        img: 0,
        webcam: 0
      });
      setVideoMode('direct');
    }
  }, [cameraUrl, usingDeviceCamera]);

  // Handle CORS proxy for external camera URLs
  const getProxiedUrl = useCallback((url: string): string => {
    if (!url) return '';
    
    if (url.includes('corsproxy.io')) {
      return url;
    }

    let cleanUrl = url.trim();
    
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }

    return useCorsBypass ? `${corsProxyUrl}${encodeURIComponent(cleanUrl)}` : cleanUrl;
  }, [useCorsBypass, corsProxyUrl]);

  // Format video URL based on camera type and mode
  const getVideoUrl = useCallback((): string => {
    if (!cameraUrl) return '';
    
    let baseUrl = cameraUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`;
    }
    
    if (baseUrl.includes(':8080')) {
      switch (videoMode) {
        case 'mjpeg':
          return getProxiedUrl(`${baseUrl}/video`);
        case 'direct':
          return getProxiedUrl(`${baseUrl}/videofeed`);
        case 'img':
          return `${getProxiedUrl(`${baseUrl}/shot.jpg`)}?t=${Date.now()}`;
        default:
          return getProxiedUrl(`${baseUrl}/video`);
      }
    }
    
    switch (videoMode) {
      case 'direct':
        return getProxiedUrl(`${baseUrl}/video`);
      case 'mjpeg':
        return getProxiedUrl(`${baseUrl}/videofeed`);
      case 'img':
        return `${getProxiedUrl(`${baseUrl}/photo.jpg`)}?t=${Date.now()}`;
      default:
        return getProxiedUrl(`${baseUrl}/video`);
    }
  }, [cameraUrl, videoMode, getProxiedUrl]);

  // Switch camera modes with fallback sequence
  const switchToNextMode = useCallback(() => {
    const modes: ('direct' | 'mjpeg' | 'img' | 'webcam')[] = ['direct', 'mjpeg', 'img', 'webcam'];
    const currentIndex = modes.indexOf(videoMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    if (Object.values(retryAttempts).every(attempts => attempts >= maxRetries)) {
      if (onError) {
        onError('Unable to connect to camera after trying all modes');
      }
      return;
    }
    
    setRetryAttempts(prev => ({
      ...prev,
      [nextMode]: prev[nextMode] + 1
    }));
    
    setVideoMode(nextMode);
    toast({
      title: "Switching video mode",
      description: `Trying ${nextMode.toUpperCase()} mode...`,
    });

    if (nextMode === 'webcam') {
      setUsingDeviceCamera(true);
    } else {
      setUsingDeviceCamera(false);
    }
  }, [videoMode, retryAttempts, maxRetries, toast, onError]);

  // Handle image load success
  const handleLoad = useCallback(() => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      if (naturalWidth && naturalHeight) {
        console.log(`Camera feed loaded: ${naturalWidth}x${naturalHeight}`);
      }
    }
  }, []);

  // Handle image load error
  const handleError = useCallback((message: string) => {
    console.error("Camera feed error:", message);
    if (retryAttempts[videoMode] < maxRetries) {
      switchToNextMode();
    } else {
      if (onError) onError(message);
    }
  }, [videoMode, retryAttempts, maxRetries, switchToNextMode, onError]);

  // Reload camera handler
  const reloadCamera = useCallback((): void => {
    setRetryAttempts({
      direct: 0,
      mjpeg: 0,
      img: 0,
      webcam: 0
    });
    
    if (usingDeviceCamera) {
      camera.stopCamera();
      camera.startCamera();
    } else {
      setVideoMode('direct');
    }
    
    toast({
      title: "Reloading Camera",
      description: "Attempting to reconnect to camera feed",
    });
  }, [usingDeviceCamera, camera, toast]);

  // Handle URL selection from suggested options
  const handleSelectUrl = useCallback((urlValue: string): void => {
    if (onUrlChange) {
      onUrlChange(urlValue);
      toast({
        title: "Camera URL Updated",
        description: "Trying with new camera stream format",
      });
    }
  }, [onUrlChange, toast]);

  // Open camera URL in new tab
  const openInNewTab = useCallback((): void => {
    if (cameraUrl) {
      window.open(formatCameraUrl(cameraUrl), '_blank');
    }
  }, [cameraUrl]);

  // Toggle between external and device camera
  const toggleCameraSource = useCallback(async (): Promise<void> => {
    const newUsingDeviceCamera = !usingDeviceCamera;
    setUsingDeviceCamera(newUsingDeviceCamera);
    
    if (newUsingDeviceCamera) {
      setVideoMode('webcam');
      await camera.startCamera();
      
      toast({
        title: "Switching to Device Camera",
        description: "Using browser camera access",
      });
    } else {
      camera.stopCamera();
      setVideoMode('direct');
      toast({
        title: "Switching to IP Camera",
        description: "Using external IP camera",
      });
    }
  }, [usingDeviceCamera, camera, toast]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      camera.stopCamera();
    };
  }, [camera]);

  // Empty camera URL state
  if (!cameraUrl && !usingDeviceCamera) {
    return (
      <div className="relative w-full h-full">
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
          <div className="text-center">
            <CameraOff className="mx-auto h-8 w-8 mb-2" />
            <p>No camera URL configured</p>
            <Button 
              variant="outline"
              className="mt-4"
              onClick={toggleCameraSource}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Use Device Camera
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading state */}
      {(camera.isLoading || (!usingDeviceCamera && videoMode !== 'webcam')) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center">
            <Loader className="animate-spin h-12 w-12 mb-2 text-cyan-500" />
            <p className="text-white text-sm">Connecting to camera...</p>
            <p className="text-gray-400 text-xs mt-1">
              Mode: {usingDeviceCamera ? 'DEVICE' : videoMode.toUpperCase()} 
              {!usingDeviceCamera && videoMode !== 'webcam' && 
                ` (Attempt ${retryAttempts[videoMode] + 1}/${maxRetries + 1})`
              }
            </p>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {((camera.error && usingDeviceCamera) || (!usingDeviceCamera && retryAttempts.img >= maxRetries)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 text-white">
          <CameraOff className="h-10 w-10 mb-2 text-red-400" />
          <p>{camera.error || "Failed to connect to camera"}</p>
          
          <div className="mt-4 w-64">
            <p className="text-sm mb-2">Make sure:</p>
            {!usingDeviceCamera ? (
              <ul className="text-sm list-disc pl-5 space-y-1">
                <li>IP Webcam app is running</li>
                <li>Phone and computer are on same network</li>
                <li>Camera URL is correct</li>
              </ul>
            ) : (
              <ul className="text-sm list-disc pl-5 space-y-1">
                <li>Camera permissions are allowed in browser</li>
                <li>Camera is not used by another application</li>
                <li>Your device has a working camera</li>
              </ul>
            )}
          </div>

          {usingDeviceCamera && !camera.hasPermission && (
            <div className="mt-4 text-amber-300">
              <p>Browser permission is required to access your camera.</p>
              <p className="text-xs mt-1">Try clicking the button below to request access again.</p>
            </div>
          )}

          <div className="flex items-center space-x-2 mt-4">
            {!usingDeviceCamera && (
              <>
                <Switch 
                  id="cors-bypass" 
                  checked={useCorsBypass}
                  onCheckedChange={(checked: boolean) => {
                    setUseCorsBypass(checked);
                    setRetryAttempts({
                      direct: 0,
                      mjpeg: 0,
                      img: 0,
                      webcam: 0
                    });
                    setVideoMode('direct');
                    toast({
                      title: checked ? "CORS Bypass Enabled" : "CORS Bypass Disabled",
                      description: "Retrying camera connection...",
                    });
                  }}
                />
                <Label htmlFor="cors-bypass">Try CORS bypass</Label>
              </>
            )}
          </div>
          
          <div className="flex flex-col space-y-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reloadCamera}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Camera Access
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCameraSource}
              className="w-full"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {usingDeviceCamera ? "Try IP Camera" : "Use Device Camera"}
            </Button>

            {!usingDeviceCamera && (
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Open directly
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Camera feed display */}
      {!camera.error && (
        <div className="w-full h-full flex flex-col">
          <AspectRatio ratio={16/9} className="bg-black">
            <div 
              style={{ 
                width: '100%', 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'black'
              }}
            >
              {usingDeviceCamera ? (
                <video
                  ref={camera.videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <img
                  ref={imageRef}
                  src={getVideoUrl()}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                  onLoad={handleLoad}
                  onError={() => handleError("Failed to load camera feed")}
                  alt="Camera Feed"
                  key={`${videoMode}-${Date.now()}`}
                />
              )}
            </div>
          </AspectRatio>
          
          {/* Camera controls */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 bg-black/50 p-2 rounded">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCameraSource}
              className="flex items-center gap-2"
            >
              <Smartphone className="h-4 w-4" />
              {usingDeviceCamera ? "IP Camera" : "Device Camera"}
            </Button>
            
            {usingDeviceCamera && (
              <>
                {camera.hasFrontAndBackCamera && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={camera.switchCamera}
                    className="flex items-center gap-2"
                  >
                    <SwitchCamera className="h-4 w-4" />
                    {camera.cameraPosition === 'front' ? "Back Camera" : "Front Camera"}
                  </Button>
                )}
                
                {camera.devices.length > 0 && (
                  <Select onValueChange={(deviceId) => camera.setDeviceId(deviceId)} value={camera.currentDevice?.deviceId}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {camera.devices.map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${camera.devices.indexOf(device) + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
            
            {!usingDeviceCamera && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextMode = videoMode === 'direct' ? 'mjpeg' : videoMode === 'mjpeg' ? 'img' : 'direct';
                  setVideoMode(nextMode);
                  setRetryAttempts(prev => ({
                    ...prev,
                    [nextMode]: 0
                  }));
                  toast({
                    title: "Changing Video Mode",
                    description: `Switching to ${nextMode.toUpperCase()} mode`,
                  });
                }}
              >
                Mode: {videoMode.toUpperCase()}
              </Button>
            )}
            
            {suggestedUrls.length > 0 && !usingDeviceCamera && (
              <Select onValueChange={handleSelectUrl}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Try other formats" />
                </SelectTrigger>
                <SelectContent>
                  {suggestedUrls.map((url) => (
                    <SelectItem key={url.url} value={url.url}>
                      {url.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
