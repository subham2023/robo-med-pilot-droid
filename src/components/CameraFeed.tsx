
import React, { useState, useEffect, useRef } from 'react';
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
  detectCameraType, 
  getIpWebcamUrls, 
  formatCameraUrl, 
  getImageUrlFromStreamUrl,
  debugCameraConnection
} from '@/utils/cameraUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CameraFeedProps {
  cameraUrl: string;
  onError?: () => void;
  onUrlChange?: (url: string) => void;
}

const CameraFeed = ({ cameraUrl, onError, onUrlChange }: CameraFeedProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgError, setImgError] = useState(false);
  const [fallbackMode, setFallbackMode] = useState<"iframe" | "img" | "direct">("iframe");
  const { toast } = useToast();
  const [suggestedUrls, setSuggestedUrls] = useState<{ name: string; url: string }[]>([]);
  const [debugInfo, setDebugInfo] = useState<Record<string, string>>({});
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [useCorsBypass, setUseCorsBypass] = useState(false);
  const [corsProxyUrl, setCorsProxyUrl] = useState("https://corsproxy.io/?");
  
  const getProxiedUrl = (url: string): string => {
    if (!useCorsBypass) return url;
    return `${corsProxyUrl}${encodeURIComponent(url)}`;
  };
  
  useEffect(() => {
    if (cameraUrl && cameraUrl.includes(':8080')) {
      // This looks like an IP Webcam URL, get suggested formats
      const baseIp = cameraUrl.match(/\d+\.\d+\.\d+\.\d+/)?.pop() || "";
      if (baseIp) {
        setSuggestedUrls(getIpWebcamUrls(baseIp));
      }
    } else {
      setSuggestedUrls([]);
    }
  }, [cameraUrl]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setImgError(false);
    
    console.log("Camera feed mounting with URL:", cameraUrl);
    
    // Try to detect the appropriate URL format
    if (cameraUrl) {
      const detectedUrl = detectCameraType(cameraUrl);
      if (detectedUrl !== cameraUrl && onUrlChange) {
        // Notify parent component about the adjusted URL
        console.log("Detected better camera URL format, updating:", detectedUrl);
        onUrlChange(detectedUrl);
        return; // Will reload with new URL
      }
    }
    
    // Debugging camera connection
    if (cameraUrl) {
      debugCameraConnection(cameraUrl).then(result => {
        setDebugInfo(result.info);
        console.log("Camera debug info:", result);
      });
    }
    
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("Camera feed timed out");
        if (fallbackMode === "iframe") {
          setFallbackMode("img");
          setLoading(true);
          toast({
            title: "Trying fallback method",
            description: "Using direct image mode for camera feed",
          });
        } else if (fallbackMode === "img" && !imgError) {
          setFallbackMode("direct");
          setLoading(true);
          toast({
            title: "Trying final fallback method",
            description: "Using direct browser access for camera feed",
          });
        } else {
          setError(true);
          setLoading(false);
          if (onError) onError();
          toast({
            title: "Camera Connection Failed",
            description: "Unable to load camera feed after multiple attempts",
            variant: "destructive",
          });
        }
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [cameraUrl, fallbackMode, refreshKey, useCorsBypass]);

  const handleLoad = () => {
    console.log("Camera feed loaded successfully in mode:", fallbackMode);
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    console.log("Camera feed error detected in mode:", fallbackMode);
    
    if (fallbackMode === "iframe") {
      // Try image mode next
      setFallbackMode("img");
      setLoading(true);
    } else if (fallbackMode === "img") {
      setImgError(true);
      setFallbackMode("direct");
      setLoading(true);
    } else {
      setLoading(false);
      setError(true);
      if (onError) onError();
      toast({
        title: "Camera Connection Failed",
        description: "Unable to load camera feed. Please check URL and connection.",
        variant: "destructive",
      });
    }
  };

  const reloadCamera = () => {
    setLoading(true);
    setError(false);
    setImgError(false);
    
    // Try iframe mode again
    setFallbackMode("iframe");
    setRefreshKey(Date.now());
    
    toast({
      title: "Reloading Camera",
      description: "Attempting to reconnect to camera feed",
    });
  };
  
  const handleSelectUrl = (urlValue: string) => {
    const selectedUrl = suggestedUrls.find(item => item.url === urlValue)?.url || urlValue;
    if (onUrlChange && selectedUrl) {
      onUrlChange(selectedUrl);
      toast({
        title: "Camera URL Updated",
        description: "Trying with new camera stream format",
      });
    }
  };
  
  const openInNewTab = () => {
    if (cameraUrl) {
      window.open(formatCameraUrl(cameraUrl), '_blank');
    }
  };

  const handleCorsBypassChange = (checked: boolean) => {
    setUseCorsBypass(checked);
    setRefreshKey(Date.now());
    toast({
      title: checked ? "CORS Bypass Enabled" : "CORS Bypass Disabled",
      description: "Reloading camera feed with new settings",
    });
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
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 text-white">
          <CameraOff className="h-10 w-10 mb-2 text-red-400" />
          <p>Failed to load camera feed</p>
          
          <div className="flex items-center space-x-2 mt-4">
            <Switch 
              id="cors-bypass" 
              checked={useCorsBypass}
              onCheckedChange={handleCorsBypassChange}
            />
            <Label htmlFor="cors-bypass">Try CORS bypass</Label>
          </div>
          
          {suggestedUrls.length > 0 && (
            <div className="mt-4 w-64">
              <p className="text-sm mb-2">Try a different format:</p>
              <Select onValueChange={handleSelectUrl}>
                <SelectTrigger className="w-full bg-gray-800">
                  <SelectValue placeholder="Select stream format" />
                </SelectTrigger>
                <SelectContent>
                  {suggestedUrls.map((item, index) => (
                    <SelectItem key={index} value={item.url}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex mt-4 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reloadCamera} 
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
            >
              <Camera className="h-4 w-4 mr-2" />
              Open directly
            </Button>
            
            <Dialog open={isDebugOpen} onOpenChange={setIsDebugOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">Debug Info</Button>
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
      
      {fallbackMode === "iframe" && !error && (
        <iframe
          ref={iframeRef}
          src={getProxiedUrl(cameraUrl)}
          className="w-full h-full border-0 bg-black"
          onLoad={handleLoad}
          onError={handleError}
          key={`iframe-${refreshKey}`}
          title="Camera Feed"
          allow="camera;microphone"
          sandbox="allow-scripts allow-same-origin"
          loading="eager"
        />
      )}
      
      {fallbackMode === "img" && !error && (
        <img
          ref={imgRef}
          src={`${getProxiedUrl(getImageUrlFromStreamUrl(cameraUrl))}${cameraUrl.includes('?') ? '&' : '?'}_=${refreshKey}`}
          className="w-full h-full object-contain bg-black"
          onLoad={handleLoad}
          onError={handleError}
          alt="Camera Feed"
          key={`img-${refreshKey}`}
        />
      )}
      
      {fallbackMode === "direct" && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
          <p>Using direct browser access</p>
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={openInNewTab}
          >
            <Camera className="h-4 w-4 mr-2" />
            Open Camera in New Tab
          </Button>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
