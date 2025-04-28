/// <reference types="react" />

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Camera, CameraOff, Loader } from "lucide-react";
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

interface CameraFeedProps {
  cameraUrl: string;
  onError?: (message: string) => void;
  onUrlChange?: (url: string) => void;
}

interface SuggestedUrl {
  name: string;
  url: string;
}

interface CameraError {
  type: string;
  message: string;
}

type VideoMode = 'direct' | 'mjpeg' | 'img';

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  cameraUrl, 
  onError, 
  onUrlChange
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CameraError | null>(null);
  const { toast } = useToast();
  const [suggestedUrls] = useState<SuggestedUrl[]>([]);
  const [useCorsBypass, setUseCorsBypass] = useState(true);
  const [videoMode, setVideoMode] = useState<VideoMode>('direct');
  const [retryAttempts, setRetryAttempts] = useState<Record<VideoMode, number>>({
    direct: 0,
    mjpeg: 0,
    img: 0
  });
  const imageRef = useRef<HTMLImageElement>(null);
  const maxRetries = 3;
  const corsProxyUrl = "https://corsproxy.io/?";

  // Reset state when camera URL changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setRetryAttempts({
      direct: 0,
      mjpeg: 0,
      img: 0
    });
    setVideoMode('direct');
  }, [cameraUrl]);

  const getProxiedUrl = (url: string): string => {
    if (!url) return '';
    
    // If URL already includes a CORS proxy, return as is
    if (url.includes('corsproxy.io')) {
      return url;
    }

    // Clean up the URL first
    let cleanUrl = url.trim();
    
    // Ensure URL has protocol
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }

    return useCorsBypass ? `${corsProxyUrl}${encodeURIComponent(cleanUrl)}` : cleanUrl;
  };

  const getVideoUrl = (): string => {
    if (!cameraUrl) return '';
    
    // Clean up the base URL and ensure proper formatting
    let baseUrl = cameraUrl.trim();
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`;
    }
    
    // IP Webcam specific endpoints
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
    
    // Default endpoints for other cameras
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
  };

  const switchToNextMode = useCallback(() => {
    const modes: VideoMode[] = ['direct', 'mjpeg', 'img'];
    const currentIndex = modes.indexOf(videoMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    // Check if we've tried all modes too many times
    if (Object.values(retryAttempts).every(attempts => attempts >= maxRetries)) {
      setError({
        type: 'connection',
        message: 'Unable to connect to camera after trying all modes. Please check your camera settings.'
      });
      setLoading(false);
      return;
    }
    
    // Update retry attempts for the next mode
    setRetryAttempts(prev => ({
      ...prev,
      [nextMode]: prev[nextMode] + 1
    }));
    
    setVideoMode(nextMode);
    toast({
      title: "Switching video mode",
      description: `Trying ${nextMode.toUpperCase()} mode...`,
    });
  }, [videoMode, retryAttempts, maxRetries, toast]);

  const handleLoad = useCallback(() => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      if (naturalWidth && naturalHeight) {
        // Image loaded successfully with dimensions
        console.log(`Camera feed loaded: ${naturalWidth}x${naturalHeight}`);
      }
    }
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((message: string) => {
    console.error("Camera feed error:", message);
    if (retryAttempts[videoMode] < maxRetries) {
      switchToNextMode();
    } else {
      setError({ 
        type: "error", 
        message: `Failed to load camera feed: ${message}` 
      });
      setLoading(false);
      if (onError) onError(message);
    }
  }, [videoMode, retryAttempts, maxRetries, switchToNextMode, onError]);

  const reloadCamera = (): void => {
    setLoading(true);
    setError(null);
    setRetryAttempts({
      direct: 0,
      mjpeg: 0,
      img: 0
    });
    setVideoMode('direct');
    
    toast({
      title: "Reloading Camera",
      description: "Attempting to reconnect to camera feed",
    });
  };
  
  const handleSelectUrl = (urlValue: string): void => {
    if (onUrlChange) {
      onUrlChange(urlValue);
      toast({
        title: "Camera URL Updated",
        description: "Trying with new camera stream format",
      });
    }
  };
  
  const openInNewTab = (): void => {
    if (cameraUrl) {
      window.open(formatCameraUrl(cameraUrl), '_blank');
    }
  };

  if (!cameraUrl) {
    return (
      <div className="relative w-full h-full">
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
          <div className="text-center">
            <CameraOff className="mx-auto h-8 w-8 mb-2" />
            <p>No camera URL configured</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center">
            <Loader className="animate-spin h-12 w-12 mb-2 text-cyan-500" />
            <p className="text-white text-sm">Connecting to camera...</p>
            <p className="text-gray-400 text-xs mt-1">
              Mode: {videoMode.toUpperCase()} (Attempt {retryAttempts[videoMode] + 1}/{maxRetries + 1})
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 text-white">
          <CameraOff className="h-10 w-10 mb-2 text-red-400" />
          <p>{error.message}</p>
          
          <div className="mt-4 w-64">
            <p className="text-sm mb-2">Make sure:</p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>IP Webcam app is running</li>
              <li>Phone and computer are on same network</li>
              <li>Camera URL is correct</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2 mt-4">
            <Switch 
              id="cors-bypass" 
              checked={useCorsBypass}
              onCheckedChange={(checked: boolean) => {
                setUseCorsBypass(checked);
                setError(null);
                setLoading(true);
                setVideoMode('direct');
                setRetryAttempts({
                  direct: 0,
                  mjpeg: 0,
                  img: 0
                });
                toast({
                  title: checked ? "CORS Bypass Enabled" : "CORS Bypass Disabled",
                  description: "Retrying camera connection...",
                });
              }}
            />
            <Label htmlFor="cors-bypass">Try CORS bypass</Label>
          </div>
          
          <div className="flex flex-col space-y-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reloadCamera}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Open directly
            </Button>
          </div>
        </div>
      )}
      
      {!error && (
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
            </div>
          </AspectRatio>
          
          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 bg-black/50 p-2 rounded">
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
            
            {suggestedUrls.length > 0 && (
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
