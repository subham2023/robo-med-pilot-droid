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
import { 
  formatCameraUrl, 
  debugCameraConnection,
  testCameraConnection,
  getIpWebcamUrls
} from '@/utils/cameraUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface CameraFeedProps {
  cameraUrl: string;
  onError?: () => void;
  onUrlChange?: (url: string) => void;
  loadingTimeout?: number;
}

interface SuggestedUrl {
  name: string;
  url: string;
}

interface CameraError {
  type: 'timeout' | 'connection' | 'cors' | 'unknown';
  message: string;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  cameraUrl, 
  onError, 
  onUrlChange,
  loadingTimeout = 10000
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CameraError | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgError, setImgError] = useState(false);
  const [fallbackMode, setFallbackMode] = useState<"iframe" | "img" | "direct">("iframe");
  const { toast } = useToast();
  const [suggestedUrls, setSuggestedUrls] = useState<SuggestedUrl[]>([]);
  const [debugInfo, setDebugInfo] = useState<Record<string, string>>({});
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [useCorsBypass, setUseCorsBypass] = useState(false);
  const [videoMode, setVideoMode] = useState<'direct' | 'mjpeg' | 'img'>('direct');
  const corsProxyUrl = "https://corsproxy.io/?";
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  
  // Reset state when camera URL changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setImgError(false);
    setRetryCount(0);
    setVideoMode('direct');
  }, [cameraUrl]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getProxiedUrl = (url: string): string => {
    if (!useCorsBypass) return url;
    return `${corsProxyUrl}${encodeURIComponent(url)}`;
  };
  
  const getVideoUrl = (): string => {
    if (!cameraUrl) return '';
    const baseUrl = cameraUrl.endsWith('/') ? cameraUrl.slice(0, -1) : cameraUrl;
    
    switch (videoMode) {
      case 'direct':
        return getProxiedUrl(`${baseUrl}/video`);
      case 'mjpeg':
        return getProxiedUrl(`${baseUrl}/videofeed`);
      case 'img':
        return `${getProxiedUrl(`${baseUrl}/photo.jpg`)}?_=${Date.now()}`;
      default:
        return getProxiedUrl(`${baseUrl}/video`);
    }
  };

  const initializeCamera = useCallback(async () => {
    if (!cameraUrl) return;

    setLoading(true);
    setError(null);
    setImgError(false);
    setRetryCount(0);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new loading timeout
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setError({
          type: 'timeout',
          message: 'Camera connection timed out. Please check your network connection and camera status.'
        });
        setLoading(false);
        if (onError) onError();
      }
    }, loadingTimeout);

    try {
      // Test camera connection first
      const connectionTest = await testCameraConnection(cameraUrl);
      if (!connectionTest.success) {
        throw new Error(connectionTest.message);
      }

      // Get debug info
      const debugResult = await debugCameraConnection(cameraUrl);
      setDebugInfo(debugResult.info);

      // Set suggested URLs for IP Webcam
      if (cameraUrl.includes(':8080')) {
        const baseIp = cameraUrl.match(/(https?:\/\/[^:/]+(?::\d+)?)/)?.[1] || "";
        if (baseIp) {
          setSuggestedUrls(getIpWebcamUrls(baseIp));
        }
      }

    } catch (error) {
      console.error("Camera initialization error:", error);
      setError({
        type: error instanceof Error && error.message.includes('CORS') ? 'cors' : 'connection',
        message: error instanceof Error ? error.message : 'Failed to connect to camera'
      });
      setLoading(false);
      if (onError) onError();
    }
  }, [cameraUrl, loading, loadingTimeout, onError]);

  // Initialize camera when dependencies change
  useEffect(() => {
    initializeCamera();
  }, [initializeCamera, videoMode, useCorsBypass]);

  const handleLoad = (): void => {
    console.log("Camera feed loaded successfully in mode:", videoMode);
    setLoading(false);
    setError(null);
    setRetryCount(0);
  };

  const handleError = (): void => {
    console.log("Video feed error in mode:", videoMode);
    
    if (retryCount < maxRetries) {
      setRetryCount((prev: number) => prev + 1);
      
      // Try different video modes on error
      if (videoMode === 'direct') {
        setVideoMode('mjpeg');
        toast({
          title: "Trying alternative stream format",
          description: "Switching to MJPEG stream",
        });
      } else if (videoMode === 'mjpeg') {
        setVideoMode('img');
        toast({
          title: "Trying fallback method",
          description: "Using snapshot mode",
        });
      } else {
        setError({
          type: 'connection',
          message: 'Failed to load camera feed after trying all available modes'
        });
        setLoading(false);
        if (onError) onError();
      }
    } else {
      setError({
        type: 'connection',
        message: 'Unable to connect after multiple attempts'
      });
      setLoading(false);
      if (onError) onError();
      toast({
        title: "Camera Connection Failed",
        description: "Unable to connect after multiple attempts. Try enabling CORS bypass or check camera settings.",
        variant: "destructive",
      });
    }
  };

  const reloadCamera = (): void => {
    setLoading(true);
    setError(null);
    setImgError(false);
    setRetryCount(0);
    setVideoMode('direct');
    
    toast({
      title: "Reloading Camera",
      description: "Attempting to reconnect to camera feed",
    });
  };
  
  const handleSelectUrl = (urlValue: string): void => {
    const selectedUrl = suggestedUrls.find((item: SuggestedUrl) => item.url === urlValue)?.url || urlValue;
    if (onUrlChange && selectedUrl) {
      onUrlChange(selectedUrl);
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
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <CameraOff className="mx-auto h-8 w-8 mb-2" />
          <p>No camera URL configured</p>
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
            {retryCount > 0 && (
              <p className="text-gray-400 text-xs mt-1">Attempt {retryCount + 1} of {maxRetries + 1}</p>
            )}
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
              onCheckedChange={(checked) => {
                setUseCorsBypass(checked);
                setError(null);
                setLoading(true);
                setVideoMode('direct');
                setRetryCount(0);
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
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="w-full">Debug Info</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Camera Debug Information</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-[60vh] overflow-auto">
                  {Object.entries(debugInfo).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-2 border-b pb-1">
                      <span className="font-medium">{key}</span>
                      <span className="overflow-hidden text-ellipsis">{value}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
      
      {!error && (
        <div className="w-full h-full flex flex-col">
          <AspectRatio ratio={16/9} className="bg-black">
            {videoMode === 'img' ? (
              // Snapshot mode - refreshes every second
              <img 
                src={getVideoUrl()}
                className="w-full h-full object-contain"
                onLoad={handleLoad}
                onError={handleError}
                alt="Camera Feed"
                key={Date.now()} // Force refresh
              />
            ) : (
              // Video stream mode
              <img 
                src={getVideoUrl()}
                className="w-full h-full object-contain"
                onLoad={handleLoad}
                onError={handleError}
                alt="Camera Feed"
              />
            )}
          </AspectRatio>
          
          {/* Controls */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 bg-black/50 p-2 rounded">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextMode = videoMode === 'direct' ? 'mjpeg' : videoMode === 'mjpeg' ? 'img' : 'direct';
                setVideoMode(nextMode);
                setRetryCount(0);
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
