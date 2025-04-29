/**
 * Enhanced camera connection detection for modern browsers and mobile devices
 */

import { toast } from "@/hooks/use-toast";

// Check if device camera is accessible and supported
export const isCameraSupported = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

// Detect device type for optimized camera settings
export const getDeviceType = (): 'mobile' | 'desktop' => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
  return isMobile ? 'mobile' : 'desktop';
};

// Enhanced camera permission request with better error handling
export const requestCameraPermission = async (): Promise<{ 
  success: boolean; 
  devices?: MediaDeviceInfo[];
  error?: string;
}> => {
  if (!isCameraSupported()) {
    return { success: false, error: "Your browser doesn't support camera access" };
  }

  if (!isSecureContext()) {
    return { success: false, error: "Camera access requires HTTPS" };
  }
  
  try {
    // Request access with explicit video config
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        facingMode: 'user', // Default to front camera
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false 
    });
    
    // Immediately stop the test stream after confirming access
    stream.getTracks().forEach(track => track.stop());
    
    // Once permission is granted, enumerate video devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length === 0) {
      return { success: false, devices: [], error: "No camera devices detected" };
    }
    
    return { success: true, devices: videoDevices };
  } catch (error: any) {
    console.error('Error requesting camera permission:', error);
    
    // Provide user-friendly error messages based on error type
    let errorMessage = "Unable to access camera";
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = "Camera access denied. Please enable camera permissions in your browser settings.";
          break;
        case 'NotFoundError':
          errorMessage = "No camera detected on this device.";
          break;
        case 'NotReadableError':
          errorMessage = "Camera is already in use by another application.";
          break;
        case 'OverconstrainedError':
          errorMessage = "Camera doesn't meet the required constraints.";
          break;
        case 'SecurityError':
          errorMessage = "Camera access requires a secure connection (HTTPS).";
          break;
        default:
          errorMessage = `Camera error: ${error.message || 'Unknown error'}`;
      }
    }
    
    return { success: false, error: errorMessage };
  }
};

// Check if running in secure context (needed for some browser camera APIs)
export const isSecureContext = (): boolean => {
  return window.isSecureContext === true;
};

// Identify front and back cameras with better detection logic
export const identifyCameras = (devices: MediaDeviceInfo[]): {
  frontCamera: MediaDeviceInfo | null;
  backCamera: MediaDeviceInfo | null;
  otherCameras: MediaDeviceInfo[];
} => {
  let frontCamera: MediaDeviceInfo | null = null;
  let backCamera: MediaDeviceInfo | null = null;
  const otherCameras: MediaDeviceInfo[] = [];
  
  // Enhanced detection logic with more pattern matching
  for (const device of devices) {
    const label = device.label.toLowerCase();
    
    if (
      label.includes('front') || 
      label.includes('user') || 
      label.includes('selfie') || 
      label.includes('face')
    ) {
      frontCamera = device;
    } else if (
      label.includes('back') || 
      label.includes('rear') || 
      label.includes('environment') || 
      label.includes('external')
    ) {
      backCamera = device;
    } else {
      otherCameras.push(device);
    }
  }
  
  // If we couldn't identify cameras by label, make educated guesses
  if (!frontCamera && !backCamera && devices.length > 0) {
    // On mobile devices, often the first camera is the back camera,
    // and the second one is the front camera (selfie)
    if (getDeviceType() === 'mobile' && devices.length > 1) {
      backCamera = devices[0];
      frontCamera = devices[1];
    } else if (devices.length > 0) {
      // On desktop, default to first camera as front
      frontCamera = devices[0];
      
      if (devices.length > 1) {
        backCamera = devices[1];
      }
    }
  }
  
  return { frontCamera, backCamera, otherCameras };
};

// Alert user to potential connection issues
export const showCameraErrorToast = (error: string): void => {
  toast({
    title: "Camera Connection Issue",
    description: error,
    variant: "destructive",
  });
};
