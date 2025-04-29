/**
 * Utility functions for camera connectivity and debugging
 */

export const testCameraConnection = async (url: string): Promise<{ success: boolean; message: string }> => {
  if (!url) {
    return { success: false, message: "No camera URL provided" };
  }

  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  const endpoints = [
    '/video',
    '/videofeed',
    '/shot.jpg',
    '/photo.jpg',
    ''  // Test base URL as well
  ];

  for (const endpoint of endpoints) {
    try {
      const testUrl = `${baseUrl}${endpoint}`;
      console.log(`Testing endpoint: ${testUrl}`);
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'image/webp,image/jpeg,*/*'
        }
      });

      console.log(`Response for ${endpoint}:`, response.status);
      
      if (response.ok || response.status === 0) {  // status 0 is valid for no-cors
        return { 
          success: true, 
          message: `Connection successful via ${endpoint || 'base URL'}` 
        };
      }
    } catch (error) {
      console.log(`Error testing ${endpoint}:`, error);
      // Continue testing other endpoints
    }
  }

  return { 
    success: false, 
    message: "Failed to connect to any camera endpoint. Try using device camera instead." 
  };
};

export const formatCameraUrl = (url: string): string => {
  if (!url) return '';
  
  // Add http:// if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `http://${url}`;
  }
  
  // Remove any trailing slashes or endpoints
  const baseUrl = url.split('/').slice(0, 3).join('/');
  return baseUrl;
};

export const getCommonCameraUrls = (baseIp: string): { name: string; url: string }[] => {
  if (!baseIp) return [];
  
  // Extract base IP if a full URL was provided
  const ipMatch = baseIp.match(/\d+\.\d+\.\d+\.\d+/);
  const ip = ipMatch ? ipMatch[0] : baseIp;
  
  return [
    { name: "IP Webcam - MJPEG Stream", url: `http://${ip}:8080/video` },
    { name: "IP Webcam - Browser View", url: `http://${ip}:8080/browser.html` },
    { name: "IP Webcam - Snapshot", url: `http://${ip}:8080/photo.jpg` },
    { name: "IP Webcam - Low Res", url: `http://${ip}:8080/videofeed` },
    { name: "ESP32-CAM Stream", url: `http://${ip}:81/stream` },
    { name: "Generic MJPEG", url: `http://${ip}/mjpeg` },
  ];
};

/**
 * Get specific URL formats for the IP Webcam Android app
 */
export const getIpWebcamUrls = (baseIp: string): { name: string; url: string }[] => {
  if (!baseIp) return [];
  
  // Extract base IP if a full URL was provided
  const ipMatch = baseIp.match(/\d+\.\d+\.\d+\.\d+/);
  const ip = ipMatch ? ipMatch[0] : baseIp;
  
  return [
    { name: "High Quality MJPEG", url: `http://${ip}:8080/video` },
    { name: "Low Quality MJPEG", url: `http://${ip}:8080/videofeed` },
    { name: "Single JPEG Shot", url: `http://${ip}:8080/photo.jpg` },
    { name: "Browser Interface", url: `http://${ip}:8080/browser.html` },
    { name: "WebRTC Stream", url: `http://${ip}:8080/webrtc` }
  ];
};

/**
 * Detect camera type based on URL pattern and return appropriate stream URL
 */
export const detectCameraType = (url: string): string => {
  const formattedUrl = formatCameraUrl(url);
  
  // IP Webcam app patterns
  if (formattedUrl.includes(':8080')) {
    // Return just the base URL, let the component handle endpoints
    return formattedUrl;
  }
  
  return formattedUrl;
};

/**
 * Get a direct image URL from stream URL for fallback purposes
 */
export const getImageUrlFromStreamUrl = (streamUrl: string): string => {
  const formattedUrl = formatCameraUrl(streamUrl);
  return `${formattedUrl}/photo.jpg`;
};

/**
 * Debug camera connection and report info
 */
export const debugCameraConnection = async (url: string): Promise<{ status: string; info: Record<string, string> }> => {
  const formattedUrl = formatCameraUrl(url);
  console.log("Debugging camera connection for:", formattedUrl);
  
  const info: Record<string, string> = {
    originalUrl: url,
    formattedUrl: formattedUrl,
    networkStatus: navigator.onLine ? "Online" : "Offline",
    webSocketSupport: "WebSocket" in window ? "Yes" : "No",
    userAgent: navigator.userAgent
  };
  
  try {
    // Test base URL
    const baseResponse = await fetch(formattedUrl, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    info.baseUrlStatus = baseResponse.status.toString();
    
    // Test video endpoint
    const videoResponse = await fetch(`${formattedUrl}/video`, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    info.videoEndpointStatus = videoResponse.status.toString();
    
    return {
      status: "success",
      info: info
    };
  } catch (error) {
    info.error = String(error);
    info.errorType = error instanceof Error ? error.name : "Unknown";
    info.suggestion = "Try using the device camera instead of external IP camera";
    
    return {
      status: "error",
      info: info
    };
  }
};

// New function to validate IP Webcam URL
export const validateIpWebcamUrl = (url: string): boolean => {
  // Check if it's a valid URL with IP and port 8080
  const urlPattern = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:8080\/?$/;
  return urlPattern.test(url);
};

// Enhanced camera support check with specific permission request
export const checkCameraSupport = async (): Promise<boolean> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  
  try {
    // Request camera permission explicitly with user gesture
    await navigator.mediaDevices.getUserMedia({ video: true });
    return true;
  } catch (error) {
    console.error('Error checking camera support:', error);
    return false;
  }
};

// Get available video input devices with improved error handling
export const getVideoDevices = async (): Promise<MediaDeviceInfo[]> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.log('Browser does not support media devices API');
    return [];
  }
  
  try {
    // Request permission with a direct user gesture
    await navigator.mediaDevices.getUserMedia({ video: true });
    
    // Get devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    console.log('Available video devices:', videoDevices);
    return videoDevices;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    return [];
  }
};

// Identify front and back cameras from device list
export const identifyCameras = (devices: MediaDeviceInfo[]): {
  frontCamera: MediaDeviceInfo | null;
  backCamera: MediaDeviceInfo | null;
  otherCameras: MediaDeviceInfo[];
} => {
  let frontCamera: MediaDeviceInfo | null = null;
  let backCamera: MediaDeviceInfo | null = null;
  const otherCameras: MediaDeviceInfo[] = [];
  
  devices.forEach(device => {
    const label = device.label.toLowerCase();
    
    if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
      frontCamera = device;
    } else if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
      backCamera = device;
    } else {
      otherCameras.push(device);
    }
  });
  
  // Default handling if labels don't contain front/back keywords
  if (!frontCamera && !backCamera && otherCameras.length > 1) {
    // Assume first camera is front-facing on most devices
    frontCamera = otherCameras.shift() || null;
    // Assume second camera is rear-facing on most devices
    backCamera = otherCameras.shift() || null;
  } else if (!frontCamera && !backCamera && otherCameras.length === 1) {
    // If only one camera, assume it's front-facing
    frontCamera = otherCameras.shift() || null;
  }
  
  return { frontCamera, backCamera, otherCameras };
};
