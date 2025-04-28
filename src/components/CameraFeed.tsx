
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, List, AlertCircle } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { detectCameraType, getIpWebcamUrls, formatCameraUrl } from '@/utils/cameraUtils';

interface CameraFeedProps {
  cameraUrl: string;
  onError?: () => void;
  onUrlChange?: (url: string) => void;
}

const CameraFeed = ({ cameraUrl, onError, onUrlChange }: CameraFeedProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [imgError, setImgError] = useState(false);
  const [fallbackMode, setFallbackMode] = useState<"iframe" | "img">("iframe");
  const { toast } = useToast();
  const [suggestedUrls, setSuggestedUrls] = useState<{ name: string; url: string }[]>([]);
  
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
    
    // Try to detect the appropriate URL format
    if (cameraUrl) {
      const detectedUrl = detectCameraType(cameraUrl);
      if (detectedUrl !== cameraUrl && onUrlChange) {
        // Notify parent component about the adjusted URL
        onUrlChange(detectedUrl);
        return; // Will reload with new URL
      }
    }
    
    const timeout = setTimeout(() => {
      if (loading) {
        console.log("Camera feed timed out");
        if (fallbackMode === "iframe" && !imgError) {
          setFallbackMode("img");
          setLoading(true);
          toast({
            title: "Trying fallback method",
            description: "Using direct image mode for camera feed",
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
  }, [cameraUrl, fallbackMode]);

  const handleLoad = () => {
    console.log("Camera feed loaded successfully");
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    console.log("Camera feed error detected");
    
    if (fallbackMode === "iframe") {
      // Try image mode next
      setFallbackMode("img");
      setLoading(true);
    } else {
      setImgError(true);
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
    
    if (iframeRef.current) {
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = cameraUrl;
        }
      }, 300);
    }
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

  if (!cameraUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p>No camera URL configured</p>
        </div>
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
            
            {fallbackMode === "img" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFallbackMode("iframe")}
              >
                <List className="h-4 w-4 mr-2" />
                Try iframe
              </Button>
            )}
          </div>
        </div>
      )}
      
      {fallbackMode === "iframe" && !error && (
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
      )}
      
      {fallbackMode === "img" && !error && (
        <img
          src={`${formatCameraUrl(cameraUrl)}${cameraUrl.includes('?') ? '&' : '?'}${Date.now()}`}
          className="w-full h-full object-contain bg-black"
          onLoad={handleLoad}
          onError={handleError}
          alt="Camera Feed"
        />
      )}
    </div>
  );
};

export default CameraFeed;
