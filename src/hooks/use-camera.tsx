
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
  requestCameraPermission,
  identifyCameras,
  isSecureContext,
  getDeviceType
} from '@/utils/cameraDetection';

type CameraPosition = 'front' | 'back' | 'other';

interface UseCameraOptions {
  autoStart?: boolean;
  preferredPosition?: CameraPosition;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  devices: MediaDeviceInfo[];
  currentDevice: MediaDeviceInfo | null;
  isLoading: boolean;
  isActive: boolean;
  hasPermission: boolean;
  error: string | null;
  cameraPosition: CameraPosition;
  hasFrontAndBackCamera: boolean;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  switchCamera: () => Promise<boolean>;
  setDeviceId: (deviceId: string) => Promise<boolean>;
  setCameraPosition: (position: CameraPosition) => Promise<boolean>;
}

export const useCamera = (options: UseCameraOptions = {}): UseCameraReturn => {
  const { autoStart = false, preferredPosition = 'front' } = options;
  const { toast } = useToast();
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<MediaDeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>(preferredPosition);
  const [hasFrontAndBackCamera, setHasFrontAndBackCamera] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsActive(false);
    }
  }, []);

  // Initialize camera access and get device list
  const initializeCamera = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    if (!isSecureContext()) {
      setError("Camera access requires a secure context (HTTPS)");
      setIsLoading(false);
      return false;
    }
    
    const result = await requestCameraPermission();
    
    if (!result.success) {
      setError(result.error || "Unable to access camera");
      setIsLoading(false);
      setHasPermission(false);
      return false;
    }
    
    setHasPermission(true);
    
    if (result.devices && result.devices.length > 0) {
      setDevices(result.devices);
      
      // Detect available cameras
      const { frontCamera, backCamera } = identifyCameras(result.devices);
      setHasFrontAndBackCamera(!!(frontCamera && backCamera));
      
      // Set the most appropriate initial device
      let initialDevice: MediaDeviceInfo | null = null;
      
      if (preferredPosition === 'front' && frontCamera) {
        initialDevice = frontCamera;
        setCameraPosition('front');
      } else if (preferredPosition === 'back' && backCamera) {
        initialDevice = backCamera;
        setCameraPosition('back');
      } else if (result.devices.length > 0) {
        initialDevice = result.devices[0];
        setCameraPosition(
          initialDevice === frontCamera ? 'front' : 
          initialDevice === backCamera ? 'back' : 'other'
        );
      }
      
      if (initialDevice) {
        setCurrentDevice(initialDevice);
      }
      
      setIsLoading(false);
      return true;
    } else {
      setError("No cameras found");
      setIsLoading(false);
      return false;
    }
  }, [preferredPosition]);

  // Start camera with current device
  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!hasPermission) {
      const permissionGranted = await initializeCamera();
      if (!permissionGranted) return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Stop any existing stream
    stopCurrentStream();
    
    if (!currentDevice && devices.length === 0) {
      setError("No camera available");
      setIsLoading(false);
      return false;
    }
    
    // Use currentDevice if available, or use the appropriate camera based on position
    const { frontCamera, backCamera } = identifyCameras(devices);
    let deviceToUse = currentDevice;
    
    if (!deviceToUse) {
      if (cameraPosition === 'front' && frontCamera) {
        deviceToUse = frontCamera;
      } else if (cameraPosition === 'back' && backCamera) {
        deviceToUse = backCamera;
      } else if (devices.length > 0) {
        deviceToUse = devices[0];
      }
    }
    
    if (!deviceToUse) {
      setError("No camera device selected");
      setIsLoading(false);
      return false;
    }
    
    try {
      // Get camera stream with specific device ID
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceToUse.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                setIsActive(true);
                setCurrentDevice(deviceToUse);
                setIsLoading(false);
              })
              .catch(err => {
                console.error('Error playing video:', err);
                setError('Unable to play video feed');
                setIsLoading(false);
              });
          }
        };
        
        return true;
      } else {
        throw new Error("Video element not available");
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      let errorMessage = "Failed to start camera";
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Camera access denied";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "Selected camera not found";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Camera is in use by another application";
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [currentDevice, devices, cameraPosition, hasPermission, initializeCamera, stopCurrentStream]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    stopCurrentStream();
    setIsActive(false);
  }, [stopCurrentStream]);

  // Switch between front and back cameras
  const switchCamera = useCallback(async (): Promise<boolean> => {
    const newPosition = cameraPosition === 'front' ? 'back' : 'front';
    setCameraPosition(newPosition);
    
    const { frontCamera, backCamera } = identifyCameras(devices);
    
    if (newPosition === 'front' && frontCamera) {
      setCurrentDevice(frontCamera);
    } else if (newPosition === 'back' && backCamera) {
      setCurrentDevice(backCamera);
    } else {
      toast({
        title: "Camera Switch Failed",
        description: `No ${newPosition} camera available`,
        variant: "destructive",
      });
      return false;
    }
    
    // If camera is active, restart with new device
    if (isActive) {
      return startCamera();
    }
    
    return true;
  }, [cameraPosition, devices, isActive, startCamera, toast]);

  // Set camera to specific device
  const setDeviceId = useCallback(async (deviceId: string): Promise<boolean> => {
    const device = devices.find(d => d.deviceId === deviceId);
    
    if (!device) {
      setError("Camera device not found");
      return false;
    }
    
    setCurrentDevice(device);
    
    // Update camera position based on device
    const { frontCamera, backCamera } = identifyCameras(devices);
    if (device === frontCamera) {
      setCameraPosition('front');
    } else if (device === backCamera) {
      setCameraPosition('back');
    } else {
      setCameraPosition('other');
    }
    
    // If camera is active, restart with new device
    if (isActive) {
      return startCamera();
    }
    
    return true;
  }, [devices, isActive, startCamera]);

  // Set camera position (front/back/other)
  const setPositionAndStart = useCallback(async (position: CameraPosition): Promise<boolean> => {
    setCameraPosition(position);
    
    const { frontCamera, backCamera } = identifyCameras(devices);
    
    if (position === 'front' && frontCamera) {
      setCurrentDevice(frontCamera);
    } else if (position === 'back' && backCamera) {
      setCurrentDevice(backCamera);
    } else if (position === 'other' && devices.length > 0) {
      // Find a camera that's neither front nor back
      const otherCamera = devices.find(
        d => d !== frontCamera && d !== backCamera
      );
      if (otherCamera) {
        setCurrentDevice(otherCamera);
      } else if (devices.length > 0) {
        // Fall back to first available camera
        setCurrentDevice(devices[0]);
      }
    }
    
    // If camera is active or we're setting for first time, restart with new position
    if (isActive || !currentDevice) {
      return startCamera();
    }
    
    return true;
  }, [devices, isActive, currentDevice, startCamera]);

  // Auto-start camera if configured
  useEffect(() => {
    if (autoStart) {
      initializeCamera().then(success => {
        if (success) {
          startCamera();
        }
      });
    }
    
    return () => {
      stopCurrentStream();
    };
  }, [autoStart, initializeCamera, startCamera, stopCurrentStream]);

  return {
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
    setCameraPosition: setPositionAndStart,
  };
};
