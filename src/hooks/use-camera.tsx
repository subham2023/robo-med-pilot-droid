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
  onError?: (error: string) => void;
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
  const { autoStart = false, preferredPosition = 'front', onError } = options;
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
  const mountedRef = useRef<boolean>(true);

  // Cleanup function
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    if (!mountedRef.current) return;
    setError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
  }, [onError]);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.error('Error stopping track:', err);
        }
      });
      streamRef.current = null;
    }
    if (mountedRef.current) {
      setIsActive(false);
    }
  }, []);

  // Initialize camera access and get device list
  const initializeCamera = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;
    console.log('Starting camera initialization...');
    setIsLoading(true);
    setError(null);
    
    if (!isSecureContext()) {
      const errorMsg = "Camera access requires a secure context (HTTPS)";
      console.error(errorMsg);
      handleError(errorMsg);
      setIsLoading(false);
      return false;
    }
    
    try {
      console.log('Requesting camera permission...');
      const result = await requestCameraPermission();
      console.log('Permission result:', result);
      
      if (!mountedRef.current) return false;

      if (!result.success) {
        handleError(result.error || "Unable to access camera");
        setIsLoading(false);
        setHasPermission(false);
        return false;
      }
      
      setHasPermission(true);
      
      if (result.devices && result.devices.length > 0) {
        console.log('Available devices:', result.devices);
        setDevices(result.devices);
        
        // Detect available cameras
        const { frontCamera, backCamera } = identifyCameras(result.devices);
        console.log('Identified cameras:', { frontCamera, backCamera });
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
          console.log('Setting initial device:', initialDevice);
          setCurrentDevice(initialDevice);
        }
        
        setIsLoading(false);
        return true;
      }
      handleError("No cameras found");
      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Camera initialization error:', err);
      if (!mountedRef.current) return false;
      handleError("Failed to initialize camera");
      setIsLoading(false);
      return false;
    }
  }, [preferredPosition, handleError]);

  // Start camera with current device
  const startCamera = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;
    console.log('Starting camera with position:', cameraPosition);

    if (!hasPermission) {
      console.log('No permission, requesting...');
      const permissionGranted = await initializeCamera();
      if (!permissionGranted) return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Stop any existing stream
    stopCurrentStream();
    
    try {
      console.log('Setting up camera constraints...');
      // Try simpler constraints first
      const basicConstraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraPosition === 'front' ? 'user' : 'environment'
        },
        audio: false
      };

      console.log('Using basic constraints:', basicConstraints);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        console.log('Stream obtained with basic constraints');
      } catch (basicError) {
        console.warn('Failed with basic constraints, trying fallback:', basicError);
        // Ultimate fallback
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false 
        });
        console.log('Stream obtained with fallback constraints');
      }

      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return false;
      }

      // Verify we got video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video tracks found in the stream');
      }

      console.log('Video tracks:', videoTracks.map(track => ({
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
      })));

      streamRef.current = stream;
      
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      // Clean up any existing srcObject
      if (videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => track.stop());
      }

      // Set up video element
      videoRef.current.setAttribute('autoplay', 'true');
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('muted', 'true');
      videoRef.current.muted = true;
      videoRef.current.srcObject = stream;
      
      return new Promise((resolve) => {
        if (!videoRef.current || !mountedRef.current) {
          stopCurrentStream();
          setIsLoading(false);
          resolve(false);
          return;
        }

        const timeoutId = setTimeout(() => {
          console.error('Video loading timed out');
          handleError('Video loading timed out');
          stopCurrentStream();
          setIsLoading(false);
          resolve(false);
        }, 10000); // 10 second timeout

        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
          clearTimeout(timeoutId);

          if (!videoRef.current || !mountedRef.current) {
            stopCurrentStream();
            setIsLoading(false);
            resolve(false);
            return;
          }

          videoRef.current.play()
            .then(() => {
              console.log('Video playback started');
              if (!mountedRef.current) {
                stopCurrentStream();
                resolve(false);
                return;
              }
              setIsActive(true);
              setIsLoading(false);
              resolve(true);
            })
            .catch(err => {
              console.error('Error playing video:', err);
              handleError('Unable to play video feed');
              setIsLoading(false);
              resolve(false);
            });
        };

        videoRef.current.onerror = (e) => {
          console.error('Video element error:', e);
          clearTimeout(timeoutId);
          handleError('Error loading video stream');
          setIsLoading(false);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Camera start error:', error);
      if (!mountedRef.current) return false;
      
      let errorMessage = "Failed to start camera";
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Camera access denied";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "Selected camera not found";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Camera is in use by another application";
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = "Camera doesn't support the required resolution";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      handleError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [cameraPosition, hasPermission, initializeCamera, stopCurrentStream, handleError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    stopCurrentStream();
  }, [stopCurrentStream]);

  // Switch between front and back cameras
  const switchCamera = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;
    
    const newPosition = cameraPosition === 'front' ? 'back' : 'front';
    
    // Stop current stream before switching
    stopCurrentStream();
    
    // Update position first
    setCameraPosition(newPosition);
    
    // For mobile devices, we'll use facingMode instead of deviceId
    if (getDeviceType() === 'mobile') {
      return startCamera();
    }
    
    // For desktop/devices with multiple cameras
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
    
    return startCamera();
  }, [cameraPosition, devices, startCamera, stopCurrentStream, toast]);

  // Set camera to specific device
  const setDeviceId = useCallback(async (deviceId: string): Promise<boolean> => {
    if (!mountedRef.current) return false;
    
    const device = devices.find(d => d.deviceId === deviceId);
    
    if (!device) {
      handleError("Camera device not found");
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
  }, [devices, isActive, startCamera, handleError]);

  // Set camera position (front/back/other)
  const setPositionAndStart = useCallback(async (position: CameraPosition): Promise<boolean> => {
    if (!mountedRef.current) return false;
    
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
    if (autoStart && mountedRef.current) {
      initializeCamera().then(success => {
        if (success && mountedRef.current) {
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
